import type { BusinessFilters } from "./businesses";
import type { DealFilters } from "./deals";
import type { EventFilters } from "./events";

/** Every TanStack Query key in one place, so invalidation boundaries stay consistent. */
export const queryKeys = {
  landing: (city: string | null) => ["landing", city ?? "all"] as const,
  businesses: (filters: BusinessFilters) => ["businesses", filters] as const,
  business: (slug: string) => ["business", slug] as const,
  reviews: (businessSlug: string) => ["reviews", businessSlug] as const,
  events: (filters: EventFilters) => ["events", filters] as const,
  event: (slug: string) => ["event", slug] as const,
  deals: (filters: DealFilters) => ["deals", filters] as const,
  deal: (id: string) => ["deal", id] as const,
  favorites: ["favorites"] as const,
  tickets: ["tickets"] as const,
};
