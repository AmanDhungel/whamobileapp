import { apiRequest } from "./client";
import type { DataResponse, EventRegistration, RegisterForEventResponse } from "./types";

/**
 * POST /api/event/redeem { eventId } — claims a free ("registration") event ticket.
 * 201 { success, message: "Ticket generated! Check your email.", uniqueKey }.
 * 400 "You have already claimed a ticket for this event." / "This event is fully booked."
 */
export function registerForEvent(eventId: string): Promise<RegisterForEventResponse> {
  return apiRequest<RegisterForEventResponse>("/api/event/redeem", {
    method: "POST",
    body: { eventId },
  });
}

/** GET /api/event/redeem — the signed-in user's registrations (event populated). */
export async function getMyRegistrations(): Promise<EventRegistration[]> {
  const res = await apiRequest<DataResponse<EventRegistration[]>>("/api/event/redeem");
  return res.data ?? [];
}

export const ALREADY_REGISTERED_MESSAGE = "You have already claimed a ticket for this event.";

export function registrationEventId(r: EventRegistration): string {
  return typeof r.event === "object" && r.event ? r.event._id : r.event;
}
