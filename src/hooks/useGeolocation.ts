import { useEffect, useRef, useState } from "react";

interface GeoPosition {
  longitude: number;
  latitude: number;
  accuracy: number;
}

interface UseGeolocationResult {
  position: GeoPosition | null;
  isTracking: boolean;
  error: string | null;
}

export function useGeolocation(): UseGeolocationResult {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setError("Geolocation wird von diesem Browser nicht unterstützt");
      return;
    }

    setIsTracking(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({
          longitude: pos.coords.longitude,
          latitude: pos.coords.latitude,
          accuracy: pos.coords.accuracy,
        });
        setError(null);
      },
      (err) => {
        setError(geolocationErrorMessage(err));
        setIsTracking(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return { position, isTracking, error };
}

function geolocationErrorMessage(err: GeolocationPositionError): string {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return "Standortzugriff verweigert";
    case err.POSITION_UNAVAILABLE:
      return "Standort nicht verfügbar";
    case err.TIMEOUT:
      return "Standortabfrage Timeout";
    default:
      return "Unbekannter Standortfehler";
  }
}
