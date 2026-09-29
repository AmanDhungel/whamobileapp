import type {
  DealRedemptionTicket,
  EventRegistrationTicket,
  EventTicketPurchaseTicket,
  TicketItem,
} from "@/api/types";

import { parseDate } from "./format";

// Ported from components/Dashboard/Ticket/ticket-utils.ts. /api/tickets has no
// discriminator field, so items are told apart by shape — exactly like the website.

export type TicketKind = "purchase" | "registration" | "deal";

export function ticketKind(item: TicketItem): TicketKind {
  if ("items" in item && Array.isArray(item.items)) return "purchase";
  if ("event" in item && item.event) return "registration";
  return "deal";
}

export function isPurchase(item: TicketItem): item is EventTicketPurchaseTicket {
  return ticketKind(item) === "purchase";
}

export function isRegistration(item: TicketItem): item is EventRegistrationTicket {
  return ticketKind(item) === "registration";
}

export function isDealTicket(item: TicketItem): item is DealRedemptionTicket {
  return ticketKind(item) === "deal";
}

function eventOf(item: TicketItem) {
  return "event" in item ? item.event : null;
}

function dealOf(item: TicketItem) {
  return "deal" in item ? item.deal : null;
}

export function ticketTitle(item: TicketItem): string {
  return eventOf(item)?.title ?? dealOf(item)?.title ?? "Ticket";
}

export function ticketImage(item: TicketItem): string | undefined {
  return eventOf(item)?.image ?? dealOf(item)?.image ?? undefined;
}

export function ticketVenue(item: TicketItem): string | null {
  const event = eventOf(item);
  return event?.venue || event?.location || null;
}

export function ticketEvent(item: TicketItem) {
  return eventOf(item);
}

export function ticketDeal(item: TicketItem) {
  return dealOf(item);
}

/** Past = event start date before now, or deal valid_till before now (web rule). */
export function isTicketPast(item: TicketItem, now = new Date()): boolean {
  const from = eventOf(item)?.dateRange?.from;
  if (from) return (parseDate(from)?.getTime() ?? 0) < now.getTime();
  const validTill = dealOf(item)?.valid_till;
  if (validTill) return (parseDate(validTill)?.getTime() ?? 0) < now.getTime();
  return false;
}

export interface TicketCode {
  key: string;
  label: string;
  checkedIn: boolean;
}

/** Every QR code the item carries, each with its ticket-type label and check-in state. */
export function ticketCodes(item: TicketItem): TicketCode[] {
  const verified = ("verifiedKeys" in item ? item.verifiedKeys : undefined) ?? [];
  const fallbackCheckedIn = item.status === "verified";

  if (isPurchase(item) && item.items.length) {
    return item.items.flatMap((line) =>
      (line.uniqueKeys ?? []).map((key) => ({
        key,
        label: line.optionName || "General Admission",
        checkedIn: verified.includes(key),
      })),
    );
  }

  const keys = isDealTicket(item)
    ? item.uniqueKeys
    : isRegistration(item) && item.uniqueKey
      ? [item.uniqueKey]
      : [];

  return keys.map((key) => ({
    key,
    label: isDealTicket(item) ? "Deal Voucher" : "General Admission",
    checkedIn: verified.includes(key) || fallbackCheckedIn,
  }));
}

/** Web sorts pending (not yet used) first within Upcoming. */
export function sortPendingFirst<T extends { status?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.status === "pending" && b.status !== "pending") return -1;
    if (a.status !== "pending" && b.status === "pending") return 1;
    return 0;
  });
}

export function splitTickets(items: TicketItem[]) {
  const upcoming = sortPendingFirst(items.filter((t) => !isTicketPast(t)));
  const past = items.filter((t) => isTicketPast(t));
  return { upcoming, past };
}
