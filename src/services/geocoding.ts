import { providerHeaders } from "./http";

/**
 * Geocoding provider boundary. Screens/components only use `searchAddresses` and
 * `reverseGeocode` — never a provider URL — so the provider can be swapped.
 *
 * Current provider: Nominatim (OpenStreetMap), the same one the website uses.
 * ⚠️ Nominatim's usage policy does NOT permit autocomplete-style search; it's kept
 * only until a proper provider (e.g. Google Places / Mapbox / Geoapify) is chosen.
 * Until then: descriptive User-Agent, ≥3 chars, debounced, stale requests cancelled
 * (see useAddressSearch), Australia only.
 */

export interface AddressSuggestion {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
}

export const GEOCODING_MIN_QUERY_LENGTH = 3;
export const GEOCODING_DEBOUNCE_MS = 450;
const MAX_RESULTS = 6;

const NOMINATIM = "https://nominatim.openstreetmap.org";

export class GeocodingError extends Error {
  constructor(message = "Address search is unavailable right now. Please try again.") {
    super(message);
    this.name = "GeocodingError";
  }
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { headers: providerHeaders, signal });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new GeocodingError();
  }
  if (!res.ok) throw new GeocodingError();
  return (await res.json()) as T;
}

/** Australian address search. Returns [] for queries shorter than the minimum. */
export async function searchAddresses(
  query: string,
  signal?: AbortSignal,
): Promise<AddressSuggestion[]> {
  const q = query.trim();
  if (q.length < GEOCODING_MIN_QUERY_LENGTH) return [];
  const url = `${NOMINATIM}/search?q=${encodeURIComponent(q)}&format=json&countrycodes=au&limit=${MAX_RESULTS}`;
  const results = await getJson<NominatimResult[]>(url, signal);
  return results
    .map((r) => ({
      id: String(r.place_id),
      label: r.display_name,
      latitude: Number.parseFloat(r.lat),
      longitude: Number.parseFloat(r.lon),
    }))
    .filter((r) => Number.isFinite(r.latitude) && Number.isFinite(r.longitude));
}

/** Coordinates → a display address, or null if none found. */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<string | null> {
  const url = `${NOMINATIM}/reverse?lat=${latitude}&lon=${longitude}&format=json`;
  const result = await getJson<{ display_name?: string }>(url, signal);
  return result.display_name ?? null;
}
