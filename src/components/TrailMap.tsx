import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { FeatureCollection } from "geojson";
import type { PoiData, PoiCategory } from "../data/types";

const TRAIL_SOURCE_ID = "frankenweg-track";
const TRAIL_LINE_ID = "frankenweg-trail-line";
const TRAIL_OUTLINE_ID = "frankenweg-trail-outline";
const TRAIL_GLOW_ID = "frankenweg-trail-glow";

const POSITION_SOURCE_ID = "user-position";
const POSITION_ACCURACY_LAYER_ID = "user-position-accuracy";
const POSITION_DOT_LAYER_ID = "user-position-dot";

const FRANKENWEG_CENTER: [number, number] = [11.25, 49.85];
const DEFAULT_ZOOM = 9;

const POI_ICONS: Record<PoiCategory, string> = {
  shelter: `<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="14" cy="14" r="13" fill="#2d5016" stroke="#faf4e8" stroke-width="2"/>
    <path d="M7 18L14 9L21 18" stroke="#faf4e8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <line x1="10" y1="18" x2="10" y2="15" stroke="#faf4e8" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="18" y1="18" x2="18" y2="15" stroke="#faf4e8" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,
  water: `<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="14" cy="14" r="13" fill="#1a6fa0" stroke="#faf4e8" stroke-width="2"/>
    <path d="M14 8C14 8 9 13.5 9 16.5C9 19.26 11.24 21 14 21C16.76 21 19 19.26 19 16.5C19 13.5 14 8 14 8Z" fill="#faf4e8" opacity="0.9"/>
  </svg>`,
  food: `<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="14" cy="14" r="13" fill="#8b1a2b" stroke="#faf4e8" stroke-width="2"/>
    <g transform="translate(14,14) rotate(-30) translate(-14,-14)">
      <line x1="12" y1="7" x2="12" y2="21" stroke="#faf4e8" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="10.5" y1="7" x2="10.5" y2="11" stroke="#faf4e8" stroke-width="1.3" stroke-linecap="round"/>
      <line x1="13.5" y1="7" x2="13.5" y2="11" stroke="#faf4e8" stroke-width="1.3" stroke-linecap="round"/>
      <line x1="10.5" y1="11" x2="13.5" y2="11" stroke="#faf4e8" stroke-width="1.3" stroke-linecap="round"/>
    </g>
    <g transform="translate(14,14) rotate(30) translate(-14,-14)">
      <path d="M16 7V21" stroke="#faf4e8" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M16 7C16 7 18.5 8 18.5 11C18.5 13 16 13 16 13" stroke="#faf4e8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </g>
  </svg>`,
  supermarket: `<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="14" cy="14" r="13" fill="#8b6531" stroke="#faf4e8" stroke-width="2"/>
    <path d="M8 9H10L11.5 17H18.5L20 11H12" stroke="#faf4e8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <circle cx="12.5" cy="19.5" r="1.2" fill="#faf4e8"/>
    <circle cx="17.5" cy="19.5" r="1.2" fill="#faf4e8"/>
  </svg>`,
  bakery: `<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="14" cy="14" r="13" fill="#b5651d" stroke="#faf4e8" stroke-width="2"/>
    <ellipse cx="14" cy="15" rx="6" ry="4" fill="#faf4e8" opacity="0.9"/>
    <path d="M10 13C10 13 11.5 10 14 10C16.5 10 18 13 18 13" stroke="#faf4e8" stroke-width="1.5" stroke-linecap="round" fill="none"/>
    <line x1="12" y1="15" x2="12" y2="13.5" stroke="#b5651d" stroke-width="1" stroke-linecap="round"/>
    <line x1="14" y1="15" x2="14" y2="13" stroke="#b5651d" stroke-width="1" stroke-linecap="round"/>
    <line x1="16" y1="15" x2="16" y2="13.5" stroke="#b5651d" stroke-width="1" stroke-linecap="round"/>
  </svg>`,
  butcher: `<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="14" cy="14" r="13" fill="#a0522d" stroke="#faf4e8" stroke-width="2"/>
    <path d="M9 11L13 9L19 13L17 19L11 19Z" fill="#faf4e8" opacity="0.85"/>
    <circle cx="14" cy="14.5" r="1.5" fill="#a0522d"/>
    <line x1="13" y1="19" x2="12" y2="22" stroke="#faf4e8" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,
  convenience: `<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="14" cy="14" r="13" fill="#6b7c3e" stroke="#faf4e8" stroke-width="2"/>
    <rect x="9" y="10" width="10" height="10" rx="1.5" stroke="#faf4e8" stroke-width="1.8" fill="none"/>
    <path d="M11 10V8.5C11 7.67 11.67 7 12.5 7H15.5C16.33 7 17 7.67 17 8.5V10" stroke="#faf4e8" stroke-width="1.8" stroke-linecap="round"/>
    <line x1="14" y1="13" x2="14" y2="17" stroke="#faf4e8" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="12" y1="15" x2="16" y2="15" stroke="#faf4e8" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,
};

interface UserPosition {
  longitude: number;
  latitude: number;
  accuracy: number;
}

interface TrailMapProps {
  trackData: FeatureCollection | null;
  userPosition?: UserPosition | null;
  pois?: PoiData[];
  visibleCategories?: Set<PoiCategory>;
}

export function TrailMap({ trackData, userPosition, pois, visibleCategories }: TrailMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const poiMarkersRef = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          "topo-tiles": {
            type: "raster",
            tiles: ["https://tile.opentopomap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution:
              '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
            maxzoom: 17,
          },
        },
        layers: [
          {
            id: "topo-base",
            type: "raster",
            source: "topo-tiles",
            minzoom: 0,
          },
        ],
      },
      center: FRANKENWEG_CENTER,
      zoom: DEFAULT_ZOOM,
      maxZoom: 19,
      pitch: 0,
    });

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: true, showZoom: true }),
      "bottom-right"
    );
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 150 }), "bottom-left");

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Trail layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !trackData) return;

    const data = trackData;

    function addTrackLayers() {
      if (!map) return;

      if (map.getSource(TRAIL_SOURCE_ID)) {
        (map.getSource(TRAIL_SOURCE_ID) as maplibregl.GeoJSONSource).setData(data);
        return;
      }

      map.addSource(TRAIL_SOURCE_ID, { type: "geojson", data });

      map.addLayer({
        id: TRAIL_GLOW_ID,
        type: "line",
        source: TRAIL_SOURCE_ID,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#5a1a0a", "line-width": 12, "line-opacity": 0.15, "line-blur": 6 },
      });

      map.addLayer({
        id: TRAIL_OUTLINE_ID,
        type: "line",
        source: TRAIL_SOURCE_ID,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#5a1a0a", "line-width": 6, "line-opacity": 0.6 },
      });

      map.addLayer({
        id: TRAIL_LINE_ID,
        type: "line",
        source: TRAIL_SOURCE_ID,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#c0392b", "line-width": 3.5, "line-opacity": 0.95 },
      });

      fitMapToTrack(map, data);
    }

    if (map.isStyleLoaded()) {
      addTrackLayers();
    } else {
      map.on("load", addTrackLayers);
    }
  }, [trackData]);

  // POI markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing markers
    for (const marker of poiMarkersRef.current) {
      marker.remove();
    }
    poiMarkersRef.current = [];

    if (!pois || !visibleCategories) return;

    const visiblePois = pois.filter((poi) => visibleCategories.has(poi.category));

    for (const poi of visiblePois) {
      const el = createPoiMarkerElement(poi);
      const popup = createPoiPopup(poi);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([poi.lon, poi.lat])
        .setPopup(popup)
        .addTo(map);

      poiMarkersRef.current.push(marker);
    }
  }, [pois, visibleCategories]);

  // User position
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userPosition) return;

    const pos = userPosition;
    const positionGeoJson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [pos.longitude, pos.latitude] },
          properties: { accuracy: pos.accuracy },
        },
      ],
    };

    function addPositionLayers() {
      if (!map) return;

      if (map.getSource(POSITION_SOURCE_ID)) {
        (map.getSource(POSITION_SOURCE_ID) as maplibregl.GeoJSONSource).setData(positionGeoJson);
        return;
      }

      map.addSource(POSITION_SOURCE_ID, { type: "geojson", data: positionGeoJson });

      map.addLayer({
        id: POSITION_ACCURACY_LAYER_ID,
        type: "circle",
        source: POSITION_SOURCE_ID,
        paint: {
          "circle-radius": accuracyToPixels(pos.accuracy, map),
          "circle-color": "#d4a96a",
          "circle-opacity": 0.12,
          "circle-stroke-width": 1,
          "circle-stroke-color": "#d4a96a",
          "circle-stroke-opacity": 0.3,
        },
      });

      map.addLayer({
        id: POSITION_DOT_LAYER_ID,
        type: "circle",
        source: POSITION_SOURCE_ID,
        paint: {
          "circle-radius": 7,
          "circle-color": "#c0392b",
          "circle-stroke-width": 3,
          "circle-stroke-color": "#faf4e8",
        },
      });
    }

    if (map.isStyleLoaded()) {
      addPositionLayers();
    } else {
      map.on("load", addPositionLayers);
    }
  }, [userPosition]);

  return <div ref={mapContainerRef} className="trail-map" />;
}

function createPoiMarkerElement(poi: PoiData): HTMLDivElement {
  const wrapper = document.createElement("div");
  wrapper.style.width = "36px";
  wrapper.style.height = "36px";
  wrapper.style.display = "flex";
  wrapper.style.alignItems = "center";
  wrapper.style.justifyContent = "center";
  wrapper.style.cursor = "pointer";

  const icon = document.createElement("div");
  icon.className = `poi-marker poi-marker--${poi.category}`;
  icon.innerHTML = POI_ICONS[poi.category];
  icon.style.width = "28px";
  icon.style.height = "28px";
  icon.style.transition = "transform 0.15s ease";

  wrapper.appendChild(icon);

  wrapper.addEventListener("mouseenter", () => {
    icon.style.transform = "scale(1.25)";
  });
  wrapper.addEventListener("mouseleave", () => {
    icon.style.transform = "scale(1)";
  });

  return wrapper;
}

function createPoiPopup(poi: PoiData): maplibregl.Popup {
  const categoryLabels: Record<PoiCategory, string> = {
    shelter: "Schutzhütte",
    water: "Trinkwasser",
    food: "Einkehr",
    supermarket: "Supermarkt",
    bakery: "Bäckerei",
    butcher: "Metzgerei",
    convenience: "Laden",
  };
  const categoryLabel = categoryLabels[poi.category];
  const coords = `${poi.lat.toFixed(6)}, ${poi.lon.toFixed(6)}`;
  const copyId = `copy-btn-${poi.lat}-${poi.lon}`.replace(/\./g, "_");
  const openingHoursHtml = poi.openingHours
    ? `<div class="poi-popup__hours">
        <svg class="poi-popup__hours-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        <span>${poi.openingHours}</span>
      </div>`
    : "";
  const websiteHtml = poi.website
    ? `<div class="poi-popup__website">
        <svg class="poi-popup__website-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
        <a href="${poi.website}" target="_blank" rel="noopener noreferrer">${new URL(poi.website).hostname.replace(/^www\./, "")}</a>
      </div>`
    : "";
  const html = `
    <div class="poi-popup">
      <span class="poi-popup__category poi-popup__category--${poi.category}">${categoryLabel}</span>
      <strong class="poi-popup__name">${poi.name}</strong>${openingHoursHtml}${websiteHtml}
      <div class="poi-popup__coords">
        <span class="poi-popup__coords-value">${coords}</span>
        <button id="${copyId}" class="poi-popup__copy" title="Koordinaten kopieren">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
        </button>
      </div>
    </div>
  `;
  const popup = new maplibregl.Popup({ offset: 18, closeButton: true, maxWidth: "260px" }).setHTML(html);

  popup.on("open", () => {
    const btn = document.getElementById(copyId);
    if (!btn) return;
    btn.addEventListener("click", () => {
      navigator.clipboard.writeText(coords).then(() => {
        btn.classList.add("poi-popup__copy--done");
        btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
        setTimeout(() => {
          btn.classList.remove("poi-popup__copy--done");
          btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
        }, 1500);
      });
    });
  });

  return popup;
}

function accuracyToPixels(accuracyMeters: number, map: maplibregl.Map): number {
  const metersPerPixel = getMetersPerPixel(map);
  const pixels = accuracyMeters / metersPerPixel;
  return Math.max(8, Math.min(pixels, 200));
}

function getMetersPerPixel(map: maplibregl.Map): number {
  const center = map.getCenter();
  const zoom = map.getZoom();
  return (Math.cos((center.lat * Math.PI) / 180) * 40075016.686) / (512 * Math.pow(2, zoom));
}

function fitMapToTrack(map: maplibregl.Map, geoJson: FeatureCollection): void {
  const bounds = new maplibregl.LngLatBounds();

  for (const feature of geoJson.features) {
    if (feature.geometry.type === "LineString") {
      for (const coord of feature.geometry.coordinates) {
        bounds.extend([coord[0], coord[1]]);
      }
    } else if (feature.geometry.type === "MultiLineString") {
      for (const line of feature.geometry.coordinates) {
        for (const coord of line) {
          bounds.extend([coord[0], coord[1]]);
        }
      }
    }
  }

  if (!bounds.isEmpty()) {
    map.fitBounds(bounds, { padding: 80, duration: 1200 });
  }
}
