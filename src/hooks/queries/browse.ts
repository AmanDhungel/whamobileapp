import { useQuery } from "@tanstack/react-query";

import { getBusiness, getBusinesses, type BusinessFilters } from "@/api/businesses";
import { getDeal, getDeals, type DealFilters } from "@/api/deals";
import { getEvent, getEvents, type EventFilters } from "@/api/events";
import { getLanding } from "@/api/landing";
import { queryKeys } from "@/api/queryKeys";
import type { Deal, EventSummary } from "@/api/types";
import { isVisibleEvent } from "@/utils/eventStatus";
import { parseDate } from "@/utils/format";

// Public, read-only data. None of these list routes paginate (see src/api/*), so each
// is a single request; lists render with FlatList virtualisation.

export function useLanding(city: string | null) {
  return useQuery({
    queryKey: queryKeys.landing(city),
    queryFn: () => getLanding(city),
    staleTime: 60_000, // web uses 60s for landing
  });
}

export function useBusinesses(filters: BusinessFilters) {
  return useQuery({
    queryKey: queryKeys.businesses(filters),
    queryFn: () => getBusinesses(filters),
  });
}

export function useBusiness(slug: string) {
  return useQuery({
    queryKey: queryKeys.business(slug),
    queryFn: () => getBusiness(slug),
    enabled: !!slug,
  });
}

/** Archived events are returned by the API; hidden here (the website shows them — a bug). */
const visibleEvents = (events: EventSummary[]) => events.filter(isVisibleEvent);

export function useEvents(filters: EventFilters) {
  return useQuery({
    queryKey: queryKeys.events(filters),
    queryFn: () => getEvents(filters),
    select: visibleEvents,
  });
}

export function useEvent(slug: string) {
  return useQuery({
    queryKey: queryKeys.event(slug),
    queryFn: () => getEvent(slug),
    enabled: !!slug,
  });
}

/** The API has no expiry filter; the website drops expired deals client-side too. */
export function isActiveDeal(deal: Deal, now = Date.now()): boolean {
  const validTill = parseDate(deal.valid_till)?.getTime();
  return validTill === undefined || validTill >= now;
}

const activeDeals = (deals: Deal[]) => deals.filter((d) => isActiveDeal(d));

export function useDeals(filters: DealFilters) {
  return useQuery({
    queryKey: queryKeys.deals(filters),
    queryFn: () => getDeals(filters),
    select: activeDeals,
  });
}

export function useDeal(id: string) {
  return useQuery({
    queryKey: queryKeys.deal(id),
    queryFn: () => getDeal(id),
    enabled: !!id,
  });
}
