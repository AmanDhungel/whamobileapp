import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { AU_CITIES, type AuCity } from "@/utils/catalog";

/**
 * App-wide city preference (docs 06: "City filter … back this with Zustand +
 * AsyncStorage"). null = all of Australia. Drives /api/landing?city= and the default
 * city for search. Non-sensitive, so AsyncStorage is fine here.
 */
interface CityState {
  city: AuCity | null;
  setCity: (city: AuCity | null) => void;
}

export const useCityStore = create<CityState>()(
  persist(
    (set) => ({
      city: null,
      setCity: (city) => set({ city }),
    }),
    {
      name: "wha.city",
      storage: createJSONStorage(() => AsyncStorage),
      // Ignore anything persisted that isn't a known city (e.g. from an older build).
      merge: (persisted, current) => {
        const city = (persisted as Partial<CityState> | undefined)?.city;
        return {
          ...current,
          city: city && (AU_CITIES as readonly string[]).includes(city) ? city : null,
        };
      },
    },
  ),
);
