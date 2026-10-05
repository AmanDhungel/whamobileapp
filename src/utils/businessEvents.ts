import type { BusinessEvent, BusinessTicketPurchase, EventAttendee } from "@/api/types";

import { formatDateRange, formatTime, parseDate } from "./format";
import { WEBSITE_URL } from "./links";

// Business events — the web's display rules (components/Dashboard/Events/EventsPage.tsx,
// ManageEventPage.tsx). UX only: the server stays the source of truth (it re-checks the
// archive rule itself).

export type EventStatus = "upcoming" | "live" | "past" | "archived";

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Day-granular, local time: before `from` → upcoming, after `to` → past, else live. */
export function getEventStatus(event: BusinessEvent, now: Date = new Date()): EventStatus {
  if (event.archived) return "archived";
  const from = parseDate(event.dateRange?.from);
  if (!from) return "past";
  const to = parseDate(event.dateRange?.to) ?? from;
  const today = startOfDay(now);
  if (today < startOfDay(from)) return "upcoming";
  if (today > startOfDay(to)) return "past";
  return "live";
}

/** Paid: Σ options.sold · registration: registration_sold · external: always 0. */
export function ticketsTaken(event: BusinessEvent): number {
  if (event.price_category === "paid") {
    return (event.options ?? []).reduce((sum, o) => sum + (o.sold ?? 0), 0);
  }
  if (event.price_category === "registration") return event.registration_sold ?? 0;
  return 0;
}

export const ARCHIVE_BLOCKED_MESSAGE =
  "This event can't be archived while it still has tickets taken. You can archive it once the event has ended.";

/** Archiving is blocked only while the event hasn't ended AND tickets were taken. Unarchive is always allowed. */
export function canArchive(event: BusinessEvent): boolean {
  if (event.archived) return true;
  return getEventStatus(event) === "past" || ticketsTaken(event) === 0;
}

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  upcoming: "Upcoming",
  live: "Live",
  past: "Past",
  archived: "Archived",
};

export function eventLocationLine(event: BusinessEvent): string {
  if (event.location_tba) return "To be announced";
  return event.venue || event.location || "";
}

/** "Sat 04 Oct 2025 - Sun 05 Oct 2025 · 7:00 PM", or "Date TBA". */
export function eventDateLine(event: BusinessEvent): string {
  const dates = formatDateRange(event.dateRange?.from, event.dateRange?.to);
  if (!dates) return "Date TBA";
  const time = formatTime(event.startTime);
  return time ? `${dates} · ${time}` : dates;
}

/** Public page on the website (businesses can't open the customer screens in the app). */
export function eventPublicUrl(event: BusinessEvent): string | null {
  return event.slug ? `${WEBSITE_URL}/events/${event.slug}` : null;
}

/** Sort like the web: Past newest first, everything else soonest first. */
export function sortEvents(events: BusinessEvent[], status: EventStatus): BusinessEvent[] {
  const key = (e: BusinessEvent) => parseDate(e.dateRange?.from)?.getTime() ?? 0;
  return [...events].sort((a, b) => (status === "past" ? key(b) - key(a) : key(a) - key(b)));
}

// ─── Manage event: totals ──────────────────────────────────────────────────────

export interface EventSalesSummary {
  /** Σ totalAmount (what buyers paid, fees included). */
  totalAmount: number;
  /** Σ ticketTotal — the business's earnings. */
  earnings: number;
  serviceFee: number;
  surcharge: number;
  orders: number;
  ticketsSold: number;
  /** null = no capacity set (∞). */
  capacity: number | null;
  /** Σ unitPrice × quantity per option name. */
  byTicketType: { name: string; amount: number }[];
}

export function summarizeSales(
  event: BusinessEvent,
  purchases: BusinessTicketPurchase[],
): EventSalesSummary {
  const options = event.options ?? [];
  const capacityTotal = options.reduce((s, o) => s + (o.capacity ?? 0), 0);
  const byType = new Map<string, number>();
  let totalAmount = 0;
  let earnings = 0;
  let serviceFee = 0;
  let surcharge = 0;
  for (const p of purchases) {
    totalAmount += p.totalAmount ?? 0;
    earnings += p.ticketTotal ?? 0;
    serviceFee += p.serviceFee ?? 0;
    surcharge += p.surcharge ?? 0;
    for (const item of p.items ?? []) {
      byType.set(
        item.optionName,
        (byType.get(item.optionName) ?? 0) + item.unitPrice * item.quantity,
      );
    }
  }
  return {
    totalAmount,
    earnings,
    serviceFee,
    surcharge,
    orders: purchases.length,
    ticketsSold: options.reduce((s, o) => s + (o.sold ?? 0), 0),
    capacity: capacityTotal > 0 ? capacityTotal : null,
    byTicketType: [...byType].map(([name, amount]) => ({ name, amount })),
  };
}

export interface TicketTypeCount {
  ticketType: string;
  total: number;
  checkedIn: number;
}

/** "Scanning count": totals per ticket type. */
export function countByTicketType(attendees: EventAttendee[]): TicketTypeCount[] {
  const map = new Map<string, TicketTypeCount>();
  for (const a of attendees) {
    const type = a.ticketType || "General";
    const row = map.get(type) ?? { ticketType: type, total: 0, checkedIn: 0 };
    row.total += 1;
    if (a.status === "verified") row.checkedIn += 1;
    map.set(type, row);
  }
  return [...map.values()];
}

/** "2x VIP, 1x GA" */
export function purchaseItemsLine(p: BusinessTicketPurchase): string {
  return (p.items ?? []).map((i) => `${i.quantity}x ${i.optionName}`).join(", ");
}

export function purchaseBuyerName(p: BusinessTicketPurchase): string {
  return p.user?.name || p.user?.email || "N/A";
}
