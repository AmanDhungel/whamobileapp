import * as Location from "expo-location";
import { useCallback, useState } from "react";

export interface Coords {
  lat: number;
  lng: number;
}

/**
 * One-shot foreground location for "Near me" searches. Returns null (with an error
 * message) when permission is denied or the position can't be read.
 */
export function useCurrentLocation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locate = useCallback(async (): Promise<Coords | null> => {
    setLoading(true);
    setError(null);
    try {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) {
        setError("Location permission is off. Choose a city instead, or enable it in Settings.");
        return null;
      }
      const position =
        (await Location.getLastKnownPositionAsync()) ??
        (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
      return { lat: position.coords.latitude, lng: position.coords.longitude };
    } catch {
      setError("Couldn't get your location. Please choose a city instead.");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { locate, loading, error };
}
