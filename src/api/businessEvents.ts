import { apiRequest } from "./client";
import type {
  BusinessDashboardData,
  BusinessEvent,
  BusinessTicketPurchase,
  EventAttendee,
  TicketStatus,
  VerifyTicketResponse,
} from "./types";

// Business dashboard: overview + events (docs/mobile/13-business-dashboard.md, Area 1
// §2.1 and Area 2). All legacy routes — `{ data, message }` bodies, no mobile envelope;
// bearer-enabled by server/lib/businessAuth.ts.

/** GET /api/business-dashboard — 7-day stats and booking lists. */
export async function getBusinessDashboard(): Promise<BusinessDashboardData> {
  const res = await apiRequest<{ data: BusinessDashboardData }>("/api/business-dashboard");
  return res.data;
}

/** GET /api/event — every event of the business, archived included (no promo codes). */
export async function getMyEvents(): Promise<BusinessEvent[]> {
  const res = await apiRequest<{ data: BusinessEvent[] }>("/api/event");
  return res.data ?? [];
}

/** GET /api/event/single-event-for-form/[id] — full event incl. promo codes (owner only). */
export async function getEventForForm(id: string): Promise<BusinessEvent> {
  const res = await apiRequest<{ data: BusinessEvent }>(
    `/api/event/single-event-for-form/${encodeURIComponent(id)}`,
  );
  return res.data;
}

/**
 * Create (POST /api/event) or update (PATCH /api/event/edit/[id]). Always multipart —
 * build the body with buildEventFormData() (src/utils/eventForm.ts).
 */
export async function saveEvent(
  form: FormData,
  options: { id?: string; uploadBytes: number },
): Promise<BusinessEvent> {
  const res = await apiRequest<{ data: BusinessEvent; message?: string }>(
    options.id ? `/api/event/edit/${encodeURIComponent(options.id)}` : "/api/event",
    { method: options.id ? "PATCH" : "POST", body: form, uploadBytes: options.uploadBytes },
  );
  return res.data;
}

/** POST /api/event/archive/[id] — a toggle; the server enforces the archive rule. */
export async function toggleEventArchive(
  id: string,
): Promise<{ message: string; data: BusinessEvent }> {
  return apiRequest(`/api/event/archive/${encodeURIComponent(id)}`, { method: "POST" });
}

/** GET /api/event/verify/[id] — attendees (registrations + paid codes) of one event. */
export async function getEventAttendees(eventId: string): Promise<EventAttendee[]> {
  const res = await apiRequest<{ data: EventAttendee[] }>(
    `/api/event/verify/${encodeURIComponent(eventId)}`,
  );
  return res.data ?? [];
}

/** GET /api/event/ticket/purchase?eventId= — the business's orders for one event. */
export async function getEventPurchases(eventId: string): Promise<BusinessTicketPurchase[]> {
  const res = await apiRequest<{ data: BusinessTicketPurchase[] }>("/api/event/ticket/purchase", {
    query: { eventId },
  });
  return res.data ?? [];
}

/**
 * POST /api/event/verify — check a ticket in. Matching is case-insensitive and trimmed
 * on the server. With `eventId`, a ticket of another event is rejected.
 */
export function verifyEventTicket(uniqueKey: string, eventId?: string) {
  return apiRequest<VerifyTicketResponse>("/api/event/verify", {
    method: "POST",
    body: { uniqueKey, event: eventId ?? "" },
  });
}

/** POST /api/event/verify/manual — exact code match; "pending" clears its check-in time. */
export function setTicketStatus(uniqueKey: string, status: TicketStatus) {
  return apiRequest<{ success: true; status: TicketStatus }>("/api/event/verify/manual", {
    method: "POST",
    body: { uniqueKey, status },
  });
}

/** POST /api/event/ticket/purchase/[id]/send-invoice — emails the buyer their invoice. */
export function sendPurchaseInvoice(purchaseId: string) {
  return apiRequest<{ success: true; message: string }>(
    `/api/event/ticket/purchase/${encodeURIComponent(purchaseId)}/send-invoice`,
    { method: "POST" },
  );
}
