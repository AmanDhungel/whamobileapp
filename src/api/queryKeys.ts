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
  registrations: ["registrations"] as const,

  // Business dashboard — one "biz" prefix (not "business": that's the public business
  // page) so logout can drop all of it.
  biz: ["biz"] as const,
  bizDashboard: ["biz", "dashboard"] as const,
  bizEvents: ["biz", "events"] as const,
  bizEventForm: (id: string) => ["biz", "event-form", id] as const,
  bizAttendees: (eventId: string) => ["biz", "attendees", eventId] as const,
  bizPurchases: (eventId: string) => ["biz", "purchases", eventId] as const,
};
