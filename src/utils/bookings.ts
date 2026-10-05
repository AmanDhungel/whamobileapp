import type { BookingStatus } from "@/api/types";
import type { BadgeTone } from "@/components/Badge";

// Booking statuses for the business screens. The ONLY source of allowed status changes
// is the server state machine (app/api/bookings/status/route.ts) — every screen offers
// exactly these, unlike the web where each screen hard-codes its own subset.

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  rescheduled: "Rescheduled",
  arrived: "Arrived",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
  refunded: "Refunded",
};

export const BOOKING_STATUS_TONE: Record<BookingStatus, BadgeTone> = {
  pending: "warning",
  confirmed: "info",
  rescheduled: "primary",
  arrived: "info",
  completed: "success",
  cancelled: "destructive",
  no_show: "default",
  refunded: "warning",
};

/** Server state machine — the status changes PATCH /api/bookings/status accepts. */
export const BOOKING_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  pending: ["confirmed", "rescheduled", "cancelled"],
  confirmed: ["arrived", "completed", "rescheduled", "no_show", "cancelled"],
  rescheduled: ["confirmed", "arrived", "cancelled"],
  arrived: ["completed", "no_show", "cancelled"],
  completed: ["refunded"],
  cancelled: [],
  no_show: [],
  refunded: [],
};
