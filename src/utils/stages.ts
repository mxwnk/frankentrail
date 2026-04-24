import type { ElevationPoint } from "./elevationProfile";
import type { StageWaypoint } from "../data/stages";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Stage {
  /** Stage number (1-based) */
  number: number;
  /** Start waypoint name */
  startName: string;
  /** End waypoint name */
  endName: string;
  /** Distance of this stage in meters */
  distance: number;
  /** Total ascent in meters */
  ascent: number;
  /** Total descent in meters */
  descent: number;
  /** Start point on the track */
  startPoint: ElevationPoint;
  /** End point on the track */
  endPoint: ElevationPoint;
  /** Index of start point in the elevation points array */
  startIndex: number;
  /** Index of end point in the elevation points array */
  endIndex: number;
}

// ---------------------------------------------------------------------------
// Geo math
// ---------------------------------------------------------------------------

const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const sinHalfLat = Math.sin(dLat / 2);
  const sinHalfLon = Math.sin(dLon / 2);

  const h =
    sinHalfLat * sinHalfLat +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      sinHalfLon *
      sinHalfLon;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

// ---------------------------------------------------------------------------
// Stage computation
// ---------------------------------------------------------------------------

/**
 * Find the index of the nearest elevation point to a waypoint.
 * Searches only forward from `startSearchIndex` to maintain order.
 */
function findNearestPointIndex(
  waypoint: StageWaypoint,
  points: ElevationPoint[],
  startSearchIndex: number,
): number {
  let minDist = Infinity;
  let bestIndex = startSearchIndex;

  for (let i = startSearchIndex; i < points.length; i++) {
    const d = haversineDistance(waypoint.lat, waypoint.lon, points[i].lat, points[i].lon);
    if (d < minDist) {
      minDist = d;
      bestIndex = i;
    }
  }

  return bestIndex;
}

/**
 * Compute ascent and descent between two indices in the elevation points array.
 */
function computeAscentDescent(
  points: ElevationPoint[],
  fromIndex: number,
  toIndex: number,
): { ascent: number; descent: number } {
  let ascent = 0;
  let descent = 0;

  for (let i = fromIndex + 1; i <= toIndex; i++) {
    const diff = points[i].elevation - points[i - 1].elevation;
    if (diff > 0) {
      ascent += diff;
    } else {
      descent += Math.abs(diff);
    }
  }

  return { ascent, descent };
}

/**
 * Build stages from waypoints and elevation points.
 * Each stage spans from one waypoint to the next.
 */
export function buildStages(
  waypoints: StageWaypoint[],
  elevationPoints: ElevationPoint[],
): Stage[] {
  if (waypoints.length < 2 || elevationPoints.length === 0) return [];

  // Snap waypoints to track points in order
  const snappedIndices: number[] = [];
  let searchStart = 0;

  for (const waypoint of waypoints) {
    const index = findNearestPointIndex(waypoint, elevationPoints, searchStart);
    snappedIndices.push(index);
    searchStart = index;
  }

  // Build stages between consecutive waypoints
  const stages: Stage[] = [];

  for (let i = 0; i < snappedIndices.length - 1; i++) {
    const startIndex = snappedIndices[i];
    const endIndex = snappedIndices[i + 1];
    const startPoint = elevationPoints[startIndex];
    const endPoint = elevationPoints[endIndex];
    const distance = endPoint.distance - startPoint.distance;
    const { ascent, descent } = computeAscentDescent(elevationPoints, startIndex, endIndex);

    stages.push({
      number: i + 1,
      startName: waypoints[i].name,
      endName: waypoints[i + 1].name,
      distance,
      ascent,
      descent,
      startPoint,
      endPoint,
      startIndex,
      endIndex,
    });
  }

  return stages;
}
