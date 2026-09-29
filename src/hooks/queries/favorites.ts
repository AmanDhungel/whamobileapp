import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

import { getErrorMessage } from "@/api/errors";
import { getFavorites, toggleFavorite } from "@/api/favorites";
import { queryKeys } from "@/api/queryKeys";
import type { BusinessSummary, Deal, EventSummary, FavoritesData } from "@/api/types";
import { showToast } from "@/components/Toast";
import { useIsCustomer } from "@/store/authStore";

/** What can be favourited from the app (a business is item_type "User" server-side). */
export type FavoriteTarget =
  | { type: "Event"; item: EventSummary }
  | { type: "Deal"; item: Deal }
  | { type: "User"; item: BusinessSummary };

const LIST_FOR = { Event: "events", Deal: "deals", User: "business" } as const;

const EMPTY: FavoritesData = { events: [], deals: [], services: [], business: [] };

/** The signed-in customer's favourites. Disabled (no request) when logged out. */
export function useFavorites() {
  const isCustomer = useIsCustomer();
  return useQuery({
    queryKey: queryKeys.favorites,
    queryFn: getFavorites,
    enabled: isCustomer,
  });
}

/** O(1) "is this favourited?" lookups for every heart on screen. */
export function useFavoriteIds(): Set<string> {
  const { data } = useFavorites();
  return useMemo(() => {
    const ids = new Set<string>();
    if (!data) return ids;
    for (const list of [data.events, data.deals, data.business]) {
      for (const item of list) ids.add(item._id);
    }
    return ids;
  }, [data]);
}

/**
 * Optimistic toggle: the heart flips instantly, the cached favourites list is patched
 * (item added/removed), and everything rolls back if the request fails.
 */
export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (target: FavoriteTarget) =>
      toggleFavorite({ item_id: target.item._id, item_type: target.type }),
    onMutate: async (target) => {
      await qc.cancelQueries({ queryKey: queryKeys.favorites });
      const previous = qc.getQueryData<FavoritesData>(queryKeys.favorites);
      qc.setQueryData<FavoritesData>(queryKeys.favorites, (old) => {
        const base = old ?? EMPTY;
        const key = LIST_FOR[target.type];
        const list = base[key] as { _id: string }[];
        const exists = list.some((x) => x._id === target.item._id);
        return {
          ...base,
          [key]: exists ? list.filter((x) => x._id !== target.item._id) : [target.item, ...list],
        };
      });
      return { previous };
    },
    onError: (error, _target, context) => {
      qc.setQueryData(queryKeys.favorites, context?.previous);
      showToast({ type: "error", message: getErrorMessage(error, "Couldn't update favourites.") });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.favorites }),
  });
}
