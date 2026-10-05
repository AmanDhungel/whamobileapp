import * as Location from "expo-location";
import { useCallback, useState } from "react";

export interface Coords {
  lat: number;
  lng: number;
}

export interface CurrentLocationMessages {
  denied: string;
  failed: string;
}

const SEARCH_MESSAGES: CurrentLocationMessages = {
  denied: "Location permission is off. Choose a city instead, or enable it in Settings.",
  failed: "Couldn't get your location. Please choose a city instead.",
};

/**
 * One-shot foreground location (default copy: "Near me" searches). Returns null (with
 * an error message) when permission is denied or the position can't be read.
 */
export function useCurrentLocation(messages: CurrentLocationMessages = SEARCH_MESSAGES) {
  const { denied, failed } = messages;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locate = useCallback(async (): Promise<Coords | null> => {
    setLoading(true);
    setError(null);
    try {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) {
        setError(denied);
        return null;
      }
      const position =
        (await Location.getLastKnownPositionAsync()) ??
        (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
      return { lat: position.coords.latitude, lng: position.coords.longitude };
    } catch {
      setError(failed);
      return null;
    } finally {
      setLoading(false);
    }
  }, [denied, failed]);

  return { locate, loading, error };
}
