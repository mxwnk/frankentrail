import type { TrailProgressInfo } from "../utils/trailProgress";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TrailProgressProps {
  progress: TrailProgressInfo;
  totalDistance: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TrailProgress({ progress, totalDistance }: TrailProgressProps) {
  const isNearTrail = progress.distanceToTrail < 5000;
  const remainingDistance = totalDistance - progress.distanceAlongTrail;

  return (
    <div className="trail-progress">
      {isNearTrail ? (
        <>
          <div className="trail-progress__bar-container">
            <div
              className="trail-progress__bar-fill"
              style={{ width: `${progress.progressFraction * 100}%` }}
            />
            <div
              className="trail-progress__bar-marker"
              style={{ left: `${progress.progressFraction * 100}%` }}
            />
          </div>
          <div className="trail-progress__details">
            <span className="trail-progress__stat">
              <svg className="trail-progress__icon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 8 14 12" />
                <polyline points="2 20 7 15 11 18 18 8" />
              </svg>
              {formatDistance(progress.distanceAlongTrail)}
            </span>
            <span className="trail-progress__separator">|</span>
            <span className="trail-progress__stat">{formatPercent(progress.progressFraction)}</span>
            <span className="trail-progress__separator">|</span>
            <span className="trail-progress__stat">
              noch {formatDistance(remainingDistance)}
            </span>
          </div>
        </>
      ) : (
        <div className="trail-progress__details">
          <span className="trail-progress__stat trail-progress__stat--off-trail">
            <svg className="trail-progress__icon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {formatDistance(progress.distanceToTrail)} vom Weg entfernt
          </span>
        </div>
      )}
    </div>
  );
}
