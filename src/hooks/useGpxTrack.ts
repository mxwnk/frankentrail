import { useEffect, useState } from "react";
import type { FeatureCollection } from "geojson";
import { loadGpxAsGeoJson } from "../utils/gpxParser";

interface UseGpxTrackResult {
  trackData: FeatureCollection | null;
  isLoading: boolean;
  error: string | null;
}

export function useGpxTrack(gpxUrl: string): UseGpxTrackResult {
  const [trackData, setTrackData] = useState<FeatureCollection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function fetchTrack() {
      setIsLoading(true);
      setError(null);

      try {
        const geoJson = await loadGpxAsGeoJson(gpxUrl);

        if (!isCancelled) {
          setTrackData(geoJson);
        }
      } catch (err) {
        if (!isCancelled) {
          const message = err instanceof Error ? err.message : "Failed to load GPX track";
          setError(message);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchTrack();

    return () => {
      isCancelled = true;
    };
  }, [gpxUrl]);

  return { trackData, isLoading, error };
}
