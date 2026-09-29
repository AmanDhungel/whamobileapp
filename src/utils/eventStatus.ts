import type { EventOption, EventSummary } from "@/api/types";

import { todayDateOnly } from "./format";

// Ported from components/Event/SingleEventPage.tsx:111-161 — must match the website.

export type OptionStatus = "upcoming" | "closed" | "soldout" | "released";

export interface OptionState {
  option: EventOption;
  status: OptionStatus;
  /** null = unlimited (no capacity set). */
  remaining: number | null;
}

export function getOptionState(option: EventOption, today = todayDateOnly()): OptionState {
  const released = !option.release_date || option.release_date <= today;
  const closed = !!option.close_date && option.close_date < today;
  const sold = Number(option.sold ?? 0);
  const held = Number(option.held ?? 0);
  const remaining =
    option.capacity != null ? Math.max(0, Number(option.capacity) - sold - held) : null;
  const soldOut = remaining !== null && remaining <= 0;
  const status: OptionStatus = !released
    ? "upcoming"
    : closed
      ? "closed"
      : soldOut
        ? "soldout"
        : "released";
  return { option, status, remaining };
}

export interface EventAvailability {
  options: OptionState[];
  /** Options currently purchasable. */
  buyable: OptionState[];
  /** Cheapest price among buyable options, or null. */
  fromPrice: number | null;
  showRemaining: boolean;
  /** Registration events: spots left (null = no capacity set). */
  registrationRemaining: number | null;
  registrationFull: boolean;
}

export function getEventAvailability(event: EventSummary): EventAvailability {
  const today = todayDateOnly();
  const options = (event.options ?? []).map((o) => getOptionState(o, today));
  const buyable = options.filter((o) => o.status === "released");
  const prices = buyable.map((o) => Number(o.option.price ?? 0));
  const fromPrice = prices.length ? Math.min(...prices) : null;
  const registrationRemaining =
    event.registration_capacity != null
      ? Math.max(0, Number(event.registration_capacity) - Number(event.registration_sold ?? 0))
      : null;
  return {
    options,
    buyable,
    fromPrice,
    showRemaining: event.show_remaining_tickets ?? true,
    registrationRemaining,
    registrationFull: registrationRemaining !== null && registrationRemaining <= 0,
  };
}

/** The web hides nothing server-side; the app hides archived events from lists. */
export function isVisibleEvent(event: EventSummary): boolean {
  return !event.archived;
}
