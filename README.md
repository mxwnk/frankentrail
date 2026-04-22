# frankentrail

Interactive trail map for the [Frankenweg](https://www.frankenweg.de/) long-distance hiking trail through Franconia, Germany.

## Features

- Full Frankenweg GPX track rendered on OpenTopoMap tiles
- Franconian-themed UI with sandstone, forest and wine-red palette
- 106 shelters and 57 drinking water stations sourced from OpenStreetMap
- POI popups with name, coordinates and copy-to-clipboard
- Toggle POI categories on/off
- Live geolocation tracking with accuracy indicator

## Tech Stack

- React + TypeScript (Vite)
- MapLibre GL JS with OpenTopoMap raster tiles
- GPX parsing via `@tmcw/togeojson`
- POI data from OSM Overpass API

## Getting Started

```bash
npm install
npm run dev
```

## Self-Hosting with Docker

```bash
docker compose up --build
```

The app will be available at `http://localhost:8080`.

## Project Structure

```
src/
  components/TrailMap.tsx   # MapLibre map with trail + POI + position layers
  hooks/useGpxTrack.ts      # Load and parse GPX files
  hooks/useGeolocation.ts   # Browser geolocation tracking
  utils/gpxParser.ts        # GPX to GeoJSON conversion
  data/pois.ts              # Shelter and water POI coordinates
  data/types.ts             # Shared POI types
public/
  gpx/frankentrail.gpx      # Frankenweg track data
```

## Data Sources

- Trail: GPX export from Komoot
- Map tiles: [OpenTopoMap](https://opentopomap.org/) (CC-BY-SA)
- POIs: [OpenStreetMap](https://www.openstreetmap.org/) via Overpass API (ODbL)
