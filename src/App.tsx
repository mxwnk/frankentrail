import { useMemo, useState } from "react";
import { TrailMap } from "./components/TrailMap";
import { useGpxTrack } from "./hooks/useGpxTrack";
import { useGeolocation } from "./hooks/useGeolocation";
import {
  SHELTER_POIS,
  WATER_POIS,
  FOOD_POIS,
  SUPERMARKET_POIS,
  BAKERY_POIS,
  BUTCHER_POIS,
  CONVENIENCE_POIS,
} from "./data/pois";
import type { PoiCategory } from "./data/types";

const GPX_PATH = "/gpx/frankentrail.gpx";

const ALL_POIS = [
  ...SHELTER_POIS,
  ...WATER_POIS,
  ...FOOD_POIS,
  ...SUPERMARKET_POIS,
  ...BAKERY_POIS,
  ...BUTCHER_POIS,
  ...CONVENIENCE_POIS,
];

interface PoiToggleConfig {
  category: PoiCategory;
  label: string;
  count: number;
}

const POI_TOGGLE_CONFIGS: PoiToggleConfig[] = [
  { category: "shelter", label: "Shelter", count: SHELTER_POIS.length },
  { category: "water", label: "Wasser", count: WATER_POIS.length },
  { category: "food", label: "Einkehr", count: FOOD_POIS.length },
  { category: "supermarket", label: "Supermarkt", count: SUPERMARKET_POIS.length },
  { category: "bakery", label: "Bäckerei", count: BAKERY_POIS.length },
  { category: "butcher", label: "Metzgerei", count: BUTCHER_POIS.length },
  { category: "convenience", label: "Laden", count: CONVENIENCE_POIS.length },
];

const DEFAULT_VISIBLE: PoiCategory[] = ["shelter", "water"];

function App() {
  const { trackData, isLoading, error } = useGpxTrack(GPX_PATH);
  const { position, error: geoError } = useGeolocation();
  const [visibleCategories, setVisibleCategories] = useState<Set<PoiCategory>>(
    new Set(DEFAULT_VISIBLE)
  );
  const [isFilterOpen, setIsFilterOpen] = useState(false);

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

  const activeCount = visibleCategories.size;
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

      <div className="filter-panel">
        <button
          className="filter-panel__trigger"
          onClick={() => setIsFilterOpen((prev) => !prev)}
          type="button"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="7" y1="12" x2="17" y2="12" />
            <line x1="10" y1="18" x2="14" y2="18" />
          </svg>
          <span>Filter</span>
          {activeCount > 0 && (
            <span className="filter-panel__badge">{activeCount}</span>
          )}
        </button>

        {isFilterOpen && (
          <>
            <div
              className="filter-panel__backdrop"
              onClick={() => setIsFilterOpen(false)}
            />
            <div className="filter-panel__dropdown">
              {POI_TOGGLE_CONFIGS.map((config) => (
                <PoiToggle
                  key={config.category}
                  category={config.category}
                  label={config.label}
                  count={config.count}
                  isActive={visibleCategories.has(config.category)}
                  onToggle={toggleCategory}
                />
              ))}
            </div>
          </>
        )}
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
