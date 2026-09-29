import { useQuery } from "@tanstack/react-query";

import { getErrorMessage } from "@/api/errors";
import {
  GEOCODING_DEBOUNCE_MS,
  GEOCODING_MIN_QUERY_LENGTH,
  searchAddresses,
} from "@/services/geocoding";

import { useDebouncedValue } from "./useDebouncedValue";

/**
 * Debounced, cancellable, cached address search. Only queries once the input is at
 * least GEOCODING_MIN_QUERY_LENGTH characters and has been stable for the debounce
 * window. TanStack Query passes an AbortSignal, so a superseded request is cancelled,
 * and repeated queries are served from cache (fewer calls to the provider).
 */
export function useAddressSearch(query: string, enabled = true) {
  const trimmed = query.trim();
  const debounced = useDebouncedValue(trimmed, GEOCODING_DEBOUNCE_MS);
  const active = enabled && debounced.length >= GEOCODING_MIN_QUERY_LENGTH;

  const result = useQuery({
    queryKey: ["geocode", debounced],
    queryFn: ({ signal }) => searchAddresses(debounced, signal),
    enabled: active,
    staleTime: 10 * 60_000,
    retry: false,
  });

  return {
    suggestions: active ? (result.data ?? []) : [],
    loading: active && result.isFetching,
    error:
      active && result.isError ? getErrorMessage(result.error, "Address search failed.") : null,
    /** True while the user is still typing (debounce pending). */
    pending: enabled && trimmed !== debounced,
    tooShort: trimmed.length > 0 && trimmed.length < GEOCODING_MIN_QUERY_LENGTH,
  };
}
