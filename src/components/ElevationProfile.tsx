import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ElevationData, ElevationPoint } from "../utils/elevationProfile";
import { downsampleElevationPoints, findPointAtDistance } from "../utils/elevationProfile";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ElevationProfileProps {
  elevationData: ElevationData;
  isOpen: boolean;
  onToggle: () => void;
  onHoverPoint: (point: ElevationPoint | null) => void;
}

interface ChartDimensions {
  width: number;
  height: number;
  paddingLeft: number;
  paddingRight: number;
  paddingTop: number;
  paddingBottom: number;
  plotWidth: number;
  plotHeight: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CHART_PADDING = { top: 16, right: 16, bottom: 32, left: 52 };
const MAX_RENDER_POINTS = 800;

const COLORS = {
  fill: "rgba(192, 57, 43, 0.15)",
  stroke: "#c0392b",
  grid: "rgba(139, 101, 49, 0.15)",
  text: "#8b6531",
  crosshair: "rgba(192, 57, 43, 0.6)",
  tooltipBg: "rgba(250, 244, 232, 0.95)",
  tooltipBorder: "#d4a96a",
  tooltipText: "#2a1f14",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDistance(meters: number): string {
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatElevation(meters: number): string {
  return `${Math.round(meters)} m`;
}

function computeChartDimensions(width: number, height: number): ChartDimensions {
  return {
    width,
    height,
    paddingLeft: CHART_PADDING.left,
    paddingRight: CHART_PADDING.right,
    paddingTop: CHART_PADDING.top,
    paddingBottom: CHART_PADDING.bottom,
    plotWidth: width - CHART_PADDING.left - CHART_PADDING.right,
    plotHeight: height - CHART_PADDING.top - CHART_PADDING.bottom,
  };
}

function computeNiceGridValues(min: number, max: number, targetSteps: number): number[] {
  const range = max - min;
  const roughStep = range / targetSteps;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const niceSteps = [1, 2, 5, 10];
  const step = niceSteps.find((s) => s * magnitude >= roughStep)! * magnitude;

  const values: number[] = [];
  const start = Math.ceil(min / step) * step;
  for (let v = start; v <= max; v += step) {
    values.push(v);
  }
  return values;
}

// ---------------------------------------------------------------------------
// Canvas drawing
// ---------------------------------------------------------------------------

function drawChart(
  ctx: CanvasRenderingContext2D,
  points: ElevationPoint[],
  dims: ChartDimensions,
  hoverIndex: number | null,
  dpr: number,
): void {
  const { width, height, paddingLeft, paddingTop, plotWidth, plotHeight } = dims;

  ctx.clearRect(0, 0, width * dpr, height * dpr);
  ctx.save();
  ctx.scale(dpr, dpr);

  if (points.length < 2) {
    ctx.restore();
    return;
  }

  const maxDist = points[points.length - 1].distance;
  const elevations = points.map((p) => p.elevation);
  const minElev = Math.floor(Math.min(...elevations) / 50) * 50;
  const maxElev = Math.ceil(Math.max(...elevations) / 50) * 50;
  const elevRange = maxElev - minElev || 1;

  const toX = (dist: number) => paddingLeft + (dist / maxDist) * plotWidth;
  const toY = (elev: number) => paddingTop + (1 - (elev - minElev) / elevRange) * plotHeight;

  drawGrid(ctx, dims, minElev, maxElev, maxDist, toX, toY);
  drawArea(ctx, points, dims, toX, toY, minElev);
  drawLine(ctx, points, toX, toY);

  if (hoverIndex !== null && hoverIndex >= 0 && hoverIndex < points.length) {
    drawCrosshair(ctx, points[hoverIndex], dims, toX, toY);
    drawTooltip(ctx, points[hoverIndex], dims, toX);
  }

  ctx.restore();
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  dims: ChartDimensions,
  minElev: number,
  maxElev: number,
  maxDist: number,
  toX: (d: number) => number,
  toY: (e: number) => number,
): void {
  const { paddingLeft, plotWidth } = dims;

  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  ctx.fillStyle = COLORS.text;
  ctx.font = "11px 'Source Sans 3', system-ui, sans-serif";

  // Elevation grid
  const elevValues = computeNiceGridValues(minElev, maxElev, 4);
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (const elev of elevValues) {
    const y = toY(elev);
    ctx.beginPath();
    ctx.moveTo(paddingLeft, y);
    ctx.lineTo(paddingLeft + plotWidth, y);
    ctx.stroke();
    ctx.fillText(`${Math.round(elev)} m`, paddingLeft - 6, y);
  }

  // Distance grid
  const distValues = computeNiceGridValues(0, maxDist / 1000, 5);
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (const distKm of distValues) {
    const x = toX(distKm * 1000);
    ctx.beginPath();
    ctx.moveTo(x, dims.paddingTop);
    ctx.lineTo(x, dims.paddingTop + dims.plotHeight);
    ctx.stroke();
    ctx.fillText(`${distKm} km`, x, dims.paddingTop + dims.plotHeight + 6);
  }
}

function drawArea(
  ctx: CanvasRenderingContext2D,
  points: ElevationPoint[],
  _dims: ChartDimensions,
  toX: (d: number) => number,
  toY: (e: number) => number,
  minElev: number,
): void {
  ctx.beginPath();
  ctx.moveTo(toX(points[0].distance), toY(minElev));

  for (const point of points) {
    ctx.lineTo(toX(point.distance), toY(point.elevation));
  }

  ctx.lineTo(toX(points[points.length - 1].distance), toY(minElev));
  ctx.closePath();
  ctx.fillStyle = COLORS.fill;
  ctx.fill();
}

function drawLine(
  ctx: CanvasRenderingContext2D,
  points: ElevationPoint[],
  toX: (d: number) => number,
  toY: (e: number) => number,
): void {
  ctx.beginPath();
  ctx.moveTo(toX(points[0].distance), toY(points[0].elevation));

  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(toX(points[i].distance), toY(points[i].elevation));
  }

  ctx.strokeStyle = COLORS.stroke;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawCrosshair(
  ctx: CanvasRenderingContext2D,
  point: ElevationPoint,
  dims: ChartDimensions,
  toX: (d: number) => number,
  toY: (e: number) => number,
): void {
  const x = toX(point.distance);
  const y = toY(point.elevation);

  // Vertical line
  ctx.beginPath();
  ctx.moveTo(x, dims.paddingTop);
  ctx.lineTo(x, dims.paddingTop + dims.plotHeight);
  ctx.strokeStyle = COLORS.crosshair;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Dot
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.stroke;
  ctx.fill();
  ctx.strokeStyle = "#faf4e8";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawTooltip(
  ctx: CanvasRenderingContext2D,
  point: ElevationPoint,
  dims: ChartDimensions,
  toX: (d: number) => number,
): void {
  const x = toX(point.distance);
  const text1 = formatElevation(point.elevation);
  const text2 = formatDistance(point.distance);

  ctx.font = "bold 12px 'Source Sans 3', system-ui, sans-serif";
  const width1 = ctx.measureText(text1).width;
  ctx.font = "11px 'Source Sans 3', system-ui, sans-serif";
  const width2 = ctx.measureText(text2).width;

  const tooltipWidth = Math.max(width1, width2) + 16;
  const tooltipHeight = 38;
  const tooltipY = dims.paddingTop - 4;

  // Keep tooltip within chart bounds
  let tooltipX = x - tooltipWidth / 2;
  tooltipX = Math.max(dims.paddingLeft, tooltipX);
  tooltipX = Math.min(dims.paddingLeft + dims.plotWidth - tooltipWidth, tooltipX);

  // Background
  ctx.fillStyle = COLORS.tooltipBg;
  ctx.strokeStyle = COLORS.tooltipBorder;
  ctx.lineWidth = 1;
  roundRect(ctx, tooltipX, tooltipY, tooltipWidth, tooltipHeight, 4);
  ctx.fill();
  ctx.stroke();

  // Text
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const centerX = tooltipX + tooltipWidth / 2;

  ctx.font = "bold 12px 'Source Sans 3', system-ui, sans-serif";
  ctx.fillStyle = COLORS.tooltipText;
  ctx.fillText(text1, centerX, tooltipY + 5);

  ctx.font = "11px 'Source Sans 3', system-ui, sans-serif";
  ctx.fillStyle = COLORS.text;
  ctx.fillText(text2, centerX, tooltipY + 21);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ElevationProfile({
  elevationData,
  isOpen,
  onToggle,
  onHoverPoint,
}: ElevationProfileProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const renderPoints = useMemo(
    () => downsampleElevationPoints(elevationData.points, MAX_RENDER_POINTS),
    [elevationData.points],
  );

  const { stats } = elevationData;

  // Observe container size
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isOpen) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setCanvasSize({ width, height });
        }
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [isOpen]);

  // Draw chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvasSize.width === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize.width * dpr;
    canvas.height = canvasSize.height * dpr;

    const dims = computeChartDimensions(canvasSize.width, canvasSize.height);
    drawChart(ctx, renderPoints, dims, hoverIndex, dpr);
  }, [canvasSize, renderPoints, hoverIndex]);

  // Mouse interaction
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || renderPoints.length < 2) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const dims = computeChartDimensions(canvasSize.width, canvasSize.height);

      const relativeX = (mouseX - dims.paddingLeft) / dims.plotWidth;
      if (relativeX < 0 || relativeX > 1) {
        setHoverIndex(null);
        onHoverPoint(null);
        return;
      }

      const targetDist = relativeX * renderPoints[renderPoints.length - 1].distance;
      const point = findPointAtDistance(renderPoints, targetDist);
      if (!point) return;

      const index = renderPoints.indexOf(point);
      setHoverIndex(index);
      onHoverPoint(point);
    },
    [canvasSize, renderPoints, onHoverPoint],
  );

  const handleMouseLeave = useCallback(() => {
    setHoverIndex(null);
    onHoverPoint(null);
  }, [onHoverPoint]);

  // Touch interaction
  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || renderPoints.length < 2 || !e.touches[0]) return;

      const rect = canvas.getBoundingClientRect();
      const touchX = e.touches[0].clientX - rect.left;
      const dims = computeChartDimensions(canvasSize.width, canvasSize.height);

      const relativeX = (touchX - dims.paddingLeft) / dims.plotWidth;
      if (relativeX < 0 || relativeX > 1) return;

      const targetDist = relativeX * renderPoints[renderPoints.length - 1].distance;
      const point = findPointAtDistance(renderPoints, targetDist);
      if (!point) return;

      const index = renderPoints.indexOf(point);
      setHoverIndex(index);
      onHoverPoint(point);
      e.preventDefault();
    },
    [canvasSize, renderPoints, onHoverPoint],
  );

  const handleTouchEnd = useCallback(() => {
    setHoverIndex(null);
    onHoverPoint(null);
  }, [onHoverPoint]);

  return (
    <div className={`elevation-panel ${isOpen ? "elevation-panel--open" : ""}`}>
      <button className="elevation-panel__toggle" onClick={onToggle} type="button">
        <svg
          className={`elevation-panel__toggle-icon ${isOpen ? "elevation-panel__toggle-icon--open" : ""}`}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="18 15 12 9 6 15" />
        </svg>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="22 12 18 8 14 12" />
          <polyline points="2 20 7 15 11 18 18 8" />
        </svg>
        <span>Höhenprofil</span>
        <div className="elevation-panel__stats-inline">
          <span>{formatDistance(stats.totalDistance)}</span>
          <span className="elevation-panel__stat-separator">|</span>
          <span title="Anstieg">+{Math.round(stats.totalAscent)} m</span>
          <span className="elevation-panel__stat-separator">|</span>
          <span title="Abstieg">-{Math.round(stats.totalDescent)} m</span>
        </div>
      </button>

      {isOpen && (
        <div className="elevation-panel__content">
          <div className="elevation-panel__chart" ref={containerRef}>
            <canvas
              ref={canvasRef}
              className="elevation-panel__canvas"
              style={{ width: canvasSize.width, height: canvasSize.height }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            />
          </div>
          <div className="elevation-panel__stats">
            <div className="elevation-panel__stat">
              <span className="elevation-panel__stat-label">Distanz</span>
              <span className="elevation-panel__stat-value">{formatDistance(stats.totalDistance)}</span>
            </div>
            <div className="elevation-panel__stat">
              <span className="elevation-panel__stat-label">Anstieg</span>
              <span className="elevation-panel__stat-value elevation-panel__stat-value--ascent">
                +{Math.round(stats.totalAscent)} m
              </span>
            </div>
            <div className="elevation-panel__stat">
              <span className="elevation-panel__stat-label">Abstieg</span>
              <span className="elevation-panel__stat-value elevation-panel__stat-value--descent">
                -{Math.round(stats.totalDescent)} m
              </span>
            </div>
            <div className="elevation-panel__stat">
              <span className="elevation-panel__stat-label">Min</span>
              <span className="elevation-panel__stat-value">{Math.round(stats.minElevation)} m</span>
            </div>
            <div className="elevation-panel__stat">
              <span className="elevation-panel__stat-label">Max</span>
              <span className="elevation-panel__stat-value">{Math.round(stats.maxElevation)} m</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
