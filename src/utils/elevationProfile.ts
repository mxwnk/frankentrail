import type { FeatureCollection } from "geojson";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ElevationPoint {
  /** Cumulative distance from start in meters */
  distance: number;
  /** Elevation in meters */
  elevation: number;
  /** Longitude */
  lon: number;
  /** Latitude */
  lat: number;
}

export interface ElevationStats {
  /** Total distance in meters */
  totalDistance: number;
  /** Minimum elevation in meters */
  minElevation: number;
  /** Maximum elevation in meters */
  maxElevation: number;
  /** Total ascent in meters */
  totalAscent: number;
  /** Total descent in meters */
  totalDescent: number;
}

export interface ElevationData {
  points: ElevationPoint[];
  stats: ElevationStats;
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
// Extraction
// ---------------------------------------------------------------------------

/**
 * Extract all 3D coordinates from a GeoJSON FeatureCollection.
 * Supports LineString and MultiLineString geometries.
 * Returns [lon, lat, elevation] tuples.
 */
function extractCoordinates(geoJson: FeatureCollection): number[][] {
  const coords: number[][] = [];

  for (const feature of geoJson.features) {
    const { geometry } = feature;

    if (geometry.type === "LineString") {
      coords.push(...geometry.coordinates);
    } else if (geometry.type === "MultiLineString") {
      for (const line of geometry.coordinates) {
        coords.push(...line);
      }
    }
  }

  return coords;
}

/**
 * Build elevation profile data from a GeoJSON track.
 * Coordinates are expected as [lon, lat, elevation].
 */
export function buildElevationData(geoJson: FeatureCollection): ElevationData | null {
  const coords = extractCoordinates(geoJson);

  if (coords.length === 0) return null;

  const hasElevation = coords[0].length >= 3;
  if (!hasElevation) return null;

  const points: ElevationPoint[] = [];
  let cumulativeDistance = 0;
  let totalAscent = 0;
  let totalDescent = 0;
  let minElevation = Infinity;
  let maxElevation = -Infinity;

  for (let i = 0; i < coords.length; i++) {
    const [lon, lat, elevation] = coords[i];

    if (i > 0) {
      const [prevLon, prevLat, prevElevation] = coords[i - 1];
      cumulativeDistance += haversineDistance(prevLat, prevLon, lat, lon);

      const elevationDiff = elevation - prevElevation;
      if (elevationDiff > 0) {
        totalAscent += elevationDiff;
      } else {
        totalDescent += Math.abs(elevationDiff);
      }
    }

    if (elevation < minElevation) minElevation = elevation;
    if (elevation > maxElevation) maxElevation = elevation;

    points.push({ distance: cumulativeDistance, elevation, lon, lat });
  }

  return {
    points,
    stats: {
      totalDistance: cumulativeDistance,
      minElevation,
      maxElevation,
      totalAscent,
      totalDescent,
    },
  };
}

/**
 * Downsample elevation points for rendering.
 * Reduces to roughly `maxPoints` while preserving start and end.
 */
export function downsampleElevationPoints(
  points: ElevationPoint[],
  maxPoints: number,
): ElevationPoint[] {
  if (points.length <= maxPoints) return points;

  const step = (points.length - 1) / (maxPoints - 1);
  const result: ElevationPoint[] = [];

  for (let i = 0; i < maxPoints; i++) {
    const index = Math.round(i * step);
    result.push(points[index]);
  }

  return result;
}

/**
 * Find the closest elevation point to a given distance along the track.
 * Uses binary search for performance.
 */
export function findPointAtDistance(
  points: ElevationPoint[],
  targetDistance: number,
): ElevationPoint | null {
  if (points.length === 0) return null;

  let low = 0;
  let high = points.length - 1;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (points[mid].distance < targetDistance) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  // Check which neighbor is closer
  if (low > 0) {
    const diffPrev = Math.abs(points[low - 1].distance - targetDistance);
    const diffCurr = Math.abs(points[low].distance - targetDistance);
    return diffPrev < diffCurr ? points[low - 1] : points[low];
  }

  return points[low];
}
