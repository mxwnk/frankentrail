import type { Stage } from "../utils/stages";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StageListProps {
  stages: Stage[];
  isOpen: boolean;
  onToggle: () => void;
  onSelectStage: (stage: Stage) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDistance(meters: number): string {
  return `${(meters / 1000).toFixed(1)} km`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StageList({ stages, isOpen, onToggle, onSelectStage }: StageListProps) {
  return (
    <div className={`stage-panel ${isOpen ? "stage-panel--open" : ""}`}>
      <button className="stage-panel__toggle" onClick={onToggle} type="button">
        <svg
          className={`stage-panel__toggle-icon ${isOpen ? "stage-panel__toggle-icon--open" : ""}`}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
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
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
        <span>Etappen</span>
        <span className="stage-panel__badge">{stages.length}</span>
      </button>

      {isOpen && (
        <div className="stage-panel__content">
          <div className="stage-panel__list">
            {stages.map((stage) => (
              <StageItem
                key={stage.number}
                stage={stage}
                onSelect={onSelectStage}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stage item
// ---------------------------------------------------------------------------

interface StageItemProps {
  stage: Stage;
  onSelect: (stage: Stage) => void;
}

function StageItem({ stage, onSelect }: StageItemProps) {
  return (
    <button
      className="stage-item"
      onClick={() => onSelect(stage)}
      type="button"
    >
      <div className="stage-item__header">
        <span className="stage-item__number">{stage.number}</span>
        <div className="stage-item__route">
          <span className="stage-item__start">{stage.startName}</span>
          <svg
            className="stage-item__arrow"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
          <span className="stage-item__end">{stage.endName}</span>
        </div>
      </div>
      <div className="stage-item__stats">
        <span className="stage-item__stat">{formatDistance(stage.distance)}</span>
        <span className="stage-item__stat stage-item__stat--ascent">
          +{Math.round(stage.ascent)} m
        </span>
        <span className="stage-item__stat stage-item__stat--descent">
          -{Math.round(stage.descent)} m
        </span>
      </div>
    </button>
  );
}
