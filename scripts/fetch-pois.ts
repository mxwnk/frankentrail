/**
 * Fetches POIs from the Overpass API along the GPX trail route
 * and filters them by distance to the track (max corridor width).
 *
 * Usage: npx tsx scripts/fetch-pois.ts
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const MAX_DISTANCE_METERS = 2000;
const OVERPASS_API = "https://overpass-api.de/api/interpreter";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const GPX_PATH = resolve(SCRIPT_DIR, "../public/gpx/frankentrail.gpx");
const OUTPUT_PATH = resolve(SCRIPT_DIR, "../src/data/pois.ts");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PoiCategory =
  | "shelter"
  | "water"
  | "food"
  | "supermarket"
  | "bakery"
  | "butcher"
  | "convenience";

interface TrackPoint {
  lat: number;
  lon: number;
}

interface PoiResult {
  lat: number;
  lon: number;
  name: string;
  category: PoiCategory;
  openingHours?: string;
  website?: string;
}

interface OverpassElement {
  type: string;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface BoundingBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

// ---------------------------------------------------------------------------
// Overpass category definitions
// ---------------------------------------------------------------------------

interface CategoryQuery {
  category: PoiCategory;
  filters: string[];
}

const CATEGORY_QUERIES: CategoryQuery[] = [
  {
    category: "shelter",
    filters: [
      'nwr["amenity"="shelter"]',
      'nwr["tourism"="wilderness_hut"]',
      'nwr["shelter_type"="basic_hut"]',
    ],
  },
  {
    category: "water",
    filters: [
      'nwr["amenity"="drinking_water"]',
      'nwr["natural"="spring"]["drinking_water"="yes"]',
    ],
  },
  {
    category: "food",
    filters: [
      'nwr["amenity"="restaurant"]',
      'nwr["amenity"="cafe"]',
      'nwr["amenity"="fast_food"]',
      'nwr["amenity"="biergarten"]',
      'nwr["amenity"="pub"]',
    ],
  },
  {
    category: "supermarket",
    filters: ['nwr["shop"="supermarket"]'],
  },
  {
    category: "bakery",
    filters: ['nwr["shop"="bakery"]'],
  },
  {
    category: "butcher",
    filters: ['nwr["shop"="butcher"]'],
  },
  {
    category: "convenience",
    filters: ['nwr["shop"="convenience"]'],
  },
];

/** Tags that indicate a POI is closed or inaccessible. */
const EXCLUDED_TAG_PATTERNS: Record<string, string[]> = {
  access: ["private", "no"],
  disused: ["yes"],
  "disused:amenity": [],
  "disused:shop": [],
};

// ---------------------------------------------------------------------------
// GPX parsing
// ---------------------------------------------------------------------------

function parseGpxTrackPoints(gpxContent: string): TrackPoint[] {
  const points: TrackPoint[] = [];
  const trkptRegex = /<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"/g;

  let match: RegExpExecArray | null;
  while ((match = trkptRegex.exec(gpxContent)) !== null) {
    points.push({
      lat: parseFloat(match[1]),
      lon: parseFloat(match[2]),
    });
  }

  return points;
}

// ---------------------------------------------------------------------------
// Geo math
// ---------------------------------------------------------------------------

const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Haversine distance in meters between two points. */
function haversineDistance(a: TrackPoint, b: TrackPoint): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const sinHalfLat = Math.sin(dLat / 2);
  const sinHalfLon = Math.sin(dLon / 2);

  const h =
    sinHalfLat * sinHalfLat +
    Math.cos(toRadians(a.lat)) *
      Math.cos(toRadians(b.lat)) *
      sinHalfLon *
      sinHalfLon;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

/**
 * Minimum distance from a point to the track.
 * Uses downsampled track points (dense enough for accurate results).
 */
function minDistanceToTrack(
  point: TrackPoint,
  track: TrackPoint[],
): number {
  let min = Infinity;

  for (const tp of track) {
    const d = haversineDistance(point, tp);
    if (d < min) {
      min = d;
    }
  }

  return min;
}

/**
 * Downsample track points to roughly one point every `stepMeters`.
 * Keeps first and last point.
 */
function downsampleTrack(
  track: TrackPoint[],
  stepMeters: number,
): TrackPoint[] {
  if (track.length <= 2) return [...track];

  const result: TrackPoint[] = [track[0]];
  let accumulated = 0;

  for (let i = 1; i < track.length; i++) {
    accumulated += haversineDistance(track[i - 1], track[i]);
    if (accumulated >= stepMeters) {
      result.push(track[i]);
      accumulated = 0;
    }
  }

  if (result[result.length - 1] !== track[track.length - 1]) {
    result.push(track[track.length - 1]);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Overpass fetching
// ---------------------------------------------------------------------------

function computeBoundingBox(
  track: TrackPoint[],
  paddingMeters: number,
): BoundingBox {
  let south = Infinity;
  let west = Infinity;
  let north = -Infinity;
  let east = -Infinity;

  for (const p of track) {
    if (p.lat < south) south = p.lat;
    if (p.lat > north) north = p.lat;
    if (p.lon < west) west = p.lon;
    if (p.lon > east) east = p.lon;
  }

  const latOffset = paddingMeters / 111_320;
  const lonOffset =
    paddingMeters / (111_320 * Math.cos(toRadians((south + north) / 2)));

  return {
    south: south - latOffset,
    west: west - lonOffset,
    north: north + latOffset,
    east: east + lonOffset,
  };
}

/** Build a single Overpass query for the entire bounding box. */
function buildOverpassQuery(
  bbox: BoundingBox,
  categories: CategoryQuery[],
): string {
  const bboxStr = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;

  const unions = categories.flatMap((cat) =>
    cat.filters.map((f) => `  ${f}(${bboxStr});`),
  );

  return [
    "[out:json][timeout:120];",
    "(",
    ...unions,
    ");",
    "out center;",
  ].join("\n");
}

/** Fetch with retry on rate limiting. */
async function fetchOverpass(
  query: string,
  maxRetries = 3,
): Promise<OverpassElement[]> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(OVERPASS_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "*/*",
        "User-Agent": "frankentrail-poi-fetcher/1.0",
      },
      body: new URLSearchParams({ data: query }).toString(),
    });

    if (response.status === 429 && attempt < maxRetries) {
      const waitSeconds = 15 * (attempt + 1);
      console.log(`  Rate limited, waiting ${waitSeconds}s before retry...`);
      await new Promise((r) => setTimeout(r, waitSeconds * 1000));
      continue;
    }

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Overpass API error: ${response.status} ${response.statusText}\n${body}`,
      );
    }

    const json = (await response.json()) as { elements: OverpassElement[] };
    return json.elements;
  }

  throw new Error("Max retries exceeded");
}

// ---------------------------------------------------------------------------
// Mapping Overpass elements → POIs
// ---------------------------------------------------------------------------

function resolveCategory(tags: Record<string, string>): PoiCategory | null {
  if (tags.amenity === "shelter" || tags.tourism === "wilderness_hut" || tags.shelter_type === "basic_hut") return "shelter";
  if (tags.amenity === "drinking_water" || (tags.natural === "spring" && tags.drinking_water === "yes")) return "water";
  if (["restaurant", "cafe", "fast_food", "biergarten", "pub"].includes(tags.amenity ?? "")) return "food";
  if (tags.shop === "supermarket") return "supermarket";
  if (tags.shop === "bakery") return "bakery";
  if (tags.shop === "butcher") return "butcher";
  if (tags.shop === "convenience") return "convenience";
  return null;
}

const CATEGORY_NAME_FALLBACKS: Record<PoiCategory, string> = {
  shelter: "Schutzhütte",
  water: "Trinkwasser",
  food: "Gaststätte",
  supermarket: "Supermarkt",
  bakery: "Bäckerei",
  butcher: "Metzgerei",
  convenience: "Nahversorger",
};

function resolveName(tags: Record<string, string>, category: PoiCategory): string {
  return tags.name ?? CATEGORY_NAME_FALLBACKS[category];
}

function resolveWebsite(tags: Record<string, string>): string | undefined {
  return tags.website ?? tags["contact:website"];
}

/** Check if a POI should be excluded (closed, private, disused). */
function isExcluded(tags: Record<string, string>): boolean {
  for (const [key, allowedValues] of Object.entries(EXCLUDED_TAG_PATTERNS)) {
    const tagValue = tags[key];
    if (tagValue === undefined) continue;

    // Empty allowedValues means any value of this tag triggers exclusion
    if (allowedValues.length === 0 || allowedValues.includes(tagValue)) {
      return true;
    }
  }

  return false;
}

function elementsToPois(elements: OverpassElement[]): PoiResult[] {
  const pois: PoiResult[] = [];

  for (const el of elements) {
    const tags = el.tags ?? {};

    if (isExcluded(tags)) continue;

    const category = resolveCategory(tags);
    if (!category) continue;

    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat === undefined || lon === undefined) continue;

    const website = resolveWebsite(tags);

    pois.push({
      lat: Math.round(lat * 1_000_000) / 1_000_000,
      lon: Math.round(lon * 1_000_000) / 1_000_000,
      name: resolveName(tags, category),
      category,
      ...(tags.opening_hours ? { openingHours: tags.opening_hours } : {}),
      ...(website ? { website } : {}),
    });
  }

  return pois;
}

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

function deduplicatePois(pois: PoiResult[]): PoiResult[] {
  const seen = new Set<string>();
  return pois.filter((poi) => {
    const key = `${poi.lat}:${poi.lon}:${poi.category}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Code generation
// ---------------------------------------------------------------------------

const CATEGORY_ORDER: PoiCategory[] = [
  "shelter",
  "water",
  "food",
  "supermarket",
  "bakery",
  "butcher",
  "convenience",
];

const CONST_NAME_MAP: Record<PoiCategory, string> = {
  shelter: "SHELTER_POIS",
  water: "WATER_POIS",
  food: "FOOD_POIS",
  supermarket: "SUPERMARKET_POIS",
  bakery: "BAKERY_POIS",
  butcher: "BUTCHER_POIS",
  convenience: "CONVENIENCE_POIS",
};

function formatPoiEntry(poi: PoiResult): string {
  const parts = [
    `lat: ${poi.lat}`,
    `lon: ${poi.lon}`,
    `name: ${JSON.stringify(poi.name)}`,
    `category: "${poi.category}"`,
  ];
  if (poi.openingHours) {
    parts.push(`openingHours: ${JSON.stringify(poi.openingHours)}`);
  }
  if (poi.website) {
    parts.push(`website: ${JSON.stringify(poi.website)}`);
  }
  return `  { ${parts.join(", ")} },`;
}

function generatePoiFile(pois: PoiResult[]): string {
  const grouped = new Map<PoiCategory, PoiResult[]>();

  for (const poi of pois) {
    const list = grouped.get(poi.category) ?? [];
    list.push(poi);
    grouped.set(poi.category, list);
  }

  // Sort each group by lat descending (north → south) for consistency
  for (const list of grouped.values()) {
    list.sort((a, b) => b.lat - a.lat || a.lon - b.lon);
  }

  const sections = CATEGORY_ORDER.map((cat) => {
    const items = grouped.get(cat) ?? [];
    const constName = CONST_NAME_MAP[cat];
    const entries = items.map(formatPoiEntry).join("\n");
    return `export const ${constName}: PoiData[] = [\n${entries}\n];`;
  });

  return [
    "// AUTO-GENERATED by scripts/fetch-pois.ts — do not edit manually",
    'import type { PoiData } from "./types";',
    "",
    ...sections,
    "",
  ].join("\n\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function printCategorySummary(pois: PoiResult[]): void {
  const counts = new Map<string, number>();
  for (const poi of pois) {
    counts.set(poi.category, (counts.get(poi.category) ?? 0) + 1);
  }
  console.log("\nPOI counts by category:");
  for (const [cat, count] of [...counts.entries()].sort()) {
    console.log(`  ${cat}: ${count}`);
  }
}

async function main(): Promise<void> {
  console.log("Reading GPX file...");
  const gpxContent = readFileSync(GPX_PATH, "utf-8");
  const fullTrack = parseGpxTrackPoints(gpxContent);
  console.log(`Parsed ${fullTrack.length} track points`);

  // Downsample for distance filtering (~50m resolution)
  const filterTrack = downsampleTrack(fullTrack, 50);
  console.log(`Downsampled to ${filterTrack.length} points for distance filter`);

  // Single bounding box for the entire trail
  const bbox = computeBoundingBox(fullTrack, MAX_DISTANCE_METERS);
  console.log("Querying Overpass API (single request)...");
  const elements = await fetchOverpass(
    buildOverpassQuery(bbox, CATEGORY_QUERIES),
  );
  console.log(`Received ${elements.length} elements from Overpass`);

  const allPois = elementsToPois(elements);
  console.log(`Mapped ${allPois.length} POIs (after excluding closed/private)`);

  // Filter by precise distance to track
  const filteredPois = allPois.filter((poi) => {
    const dist = minDistanceToTrack(poi, filterTrack);
    return dist <= MAX_DISTANCE_METERS;
  });
  console.log(
    `${filteredPois.length} POIs within ${MAX_DISTANCE_METERS}m of the trail`,
  );

  const deduplicated = deduplicatePois(filteredPois);
  console.log(`${deduplicated.length} POIs after deduplication`);

  printCategorySummary(deduplicated);

  const output = generatePoiFile(deduplicated);
  writeFileSync(OUTPUT_PATH, output, "utf-8");
  console.log(`\nWritten to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
