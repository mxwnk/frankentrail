import { gpx } from "@tmcw/togeojson";
import type { FeatureCollection } from "geojson";

export async function loadGpxAsGeoJson(url: string): Promise<FeatureCollection> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to load GPX file from ${url}: ${response.statusText}`);
  }

  const gpxText = await response.text();
  const parser = new DOMParser();
  const gpxDocument = parser.parseFromString(gpxText, "application/xml");

  return gpx(gpxDocument);
}
