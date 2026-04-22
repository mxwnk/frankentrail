import { useMemo, useState } from "react";
import { TrailMap } from "./components/TrailMap";
import { useGpxTrack } from "./hooks/useGpxTrack";
import { useGeolocation } from "./hooks/useGeolocation";
import { SHELTER_POIS, WATER_POIS } from "./data/pois";
import type { PoiCategory } from "./data/types";

const GPX_PATH = "/gpx/frankentrail.gpx";

const ALL_POIS = [...SHELTER_POIS, ...WATER_POIS];

function App() {
  const { trackData, isLoading, error } = useGpxTrack(GPX_PATH);
  const { position, error: geoError } = useGeolocation();
  const [visibleCategories, setVisibleCategories] = useState<Set<PoiCategory>>(
    new Set(["shelter", "water"])
  );

  const toggleCategory = (category: PoiCategory) => {
    setVisibleCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const stableCategories = useMemo(() => visibleCategories, [visibleCategories]);

  return (
    <div className="app">
      <TrailMap
        trackData={trackData}
        userPosition={position}
        pois={ALL_POIS}
        visibleCategories={stableCategories}
      />

      <header className="header">
        <div className="header-brand">
          <span className="header-icon">&#9650;</span>
          <h1 className="header-title">frankentrail</h1>
        </div>
        <p className="header-subtitle">Frankenweg Fernwanderweg</p>
      </header>

      <div className="poi-controls">
        <PoiToggle
          category="shelter"
          label="Shelter"
          count={SHELTER_POIS.length}
          isActive={visibleCategories.has("shelter")}
          onToggle={toggleCategory}
        />
        <PoiToggle
          category="water"
          label="Wasser"
          count={WATER_POIS.length}
          isActive={visibleCategories.has("water")}
          onToggle={toggleCategory}
        />
      </div>

      {isLoading && (
        <div className="toast">Lade Frankenweg...</div>
      )}

      {error && (
        <div className="toast toast--error">Fehler: {error}</div>
      )}

      {geoError && (
        <div className="toast toast--error">{geoError}</div>
      )}

      <div className="attribution-badge">
        <span>Topo &middot; OpenStreetMap</span>
      </div>
    </div>
  );
}

interface PoiToggleProps {
  category: PoiCategory;
  label: string;
  count: number;
  isActive: boolean;
  onToggle: (category: PoiCategory) => void;
}

function PoiToggle({ category, label, count, isActive, onToggle }: PoiToggleProps) {
  return (
    <button
      className={`poi-toggle poi-toggle--${category} ${isActive ? "poi-toggle--active" : ""}`}
      onClick={() => onToggle(category)}
      type="button"
    >
      <span className="poi-toggle__dot" />
      <span className="poi-toggle__label">{label}</span>
      <span className="poi-toggle__count">{count}</span>
    </button>
  );
}

export default App;
