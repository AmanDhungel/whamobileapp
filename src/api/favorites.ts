import { apiRequest } from "./client";
import type {
  DataResponse,
  FavoritesData,
  ToggleFavoriteRequest,
  ToggleFavoriteResponse,
} from "./types";

// The route really is spelled /api/favroite.
const FAVORITES = "/api/favroite";

export async function getFavorites(): Promise<FavoritesData> {
  const res = await apiRequest<DataResponse<FavoritesData>>(FAVORITES);
  return {
    events: res.data?.events ?? [],
    deals: res.data?.deals ?? [],
    services: res.data?.services ?? [],
    business: res.data?.business ?? [],
  };
}

/** POST toggles: adds if absent, removes if present. */
export async function toggleFavorite(body: ToggleFavoriteRequest): Promise<ToggleFavoriteResponse> {
  return apiRequest<ToggleFavoriteResponse>(FAVORITES, { method: "POST", body });
}
