import type { ElevationPoint } from "./elevationProfile";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TrailProgressInfo {
  /** Distance from user to nearest point on the trail in meters */
  distanceToTrail: number;
  /** Cumulative distance along the trail to the nearest point in meters */
  distanceAlongTrail: number;
  /** Progress as fraction (0..1) */
  progressFraction: number;
  /** Nearest point on the trail */
  nearestPoint: ElevationPoint;
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
// Trail progress
// ---------------------------------------------------------------------------

/**
 * Find the nearest point on the trail to the user's position
 * and compute trail progress information.
 */
export function computeTrailProgress(
  userLat: number,
  userLon: number,
  trackPoints: ElevationPoint[],
): TrailProgressInfo | null {
  if (trackPoints.length === 0) return null;

  let minDist = Infinity;
  let nearestIndex = 0;

  for (let i = 0; i < trackPoints.length; i++) {
    const d = haversineDistance(userLat, userLon, trackPoints[i].lat, trackPoints[i].lon);
    if (d < minDist) {
      minDist = d;
      nearestIndex = i;
    }
  }

  const nearestPoint = trackPoints[nearestIndex];
  const totalDistance = trackPoints[trackPoints.length - 1].distance;
  const progressFraction = totalDistance > 0
    ? nearestPoint.distance / totalDistance
    : 0;

  return {
    distanceToTrail: minDist,
    distanceAlongTrail: nearestPoint.distance,
    progressFraction,
    nearestPoint,
  };
}
