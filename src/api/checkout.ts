import { clearApiCookies } from "@/services/cookies";

import { apiRequest, MOBILE_API } from "./client";
import type {
  TicketHoldRequest,
  TicketHoldResponse,
  TicketPriceRequest,
  TicketPricing,
  TicketPurchaseRequest,
  TicketPurchaseResponse,
} from "./types";

// Event ticket checkout — the same sequence as the website (components/Stripe/
// EventCheckOut.tsx): price → hold → pay (Stripe) → finalize. The server is the only
// source of prices; the app sends eventId + items and reads totals back.

/** Error code returned by /purchase when there's no signed-in user and no guestInfo. */
export const GUEST_INFO_REQUIRED = "GUEST_INFO_REQUIRED";

/**
 * POST /api/mobile/v1/event/ticket/price — prices the cart and creates a NEW
 * PaymentIntent. Pass `previousPaymentIntentId` when re-pricing (e.g. applying a promo):
 * the server releases that PaymentIntent's hold first — even if this call then fails.
 */
export function priceTickets(body: TicketPriceRequest): Promise<TicketPricing> {
  return apiRequest<TicketPricing>(`${MOBILE_API}/event/ticket/price`, {
    method: "POST",
    body: {
      ...body,
      promoCode: body.promoCode?.trim() || undefined,
    },
  });
}

/** POST /api/event/ticket/hold — 5-minute reservation; idempotent per PaymentIntent. */
export function holdTickets(body: TicketHoldRequest): Promise<TicketHoldResponse> {
  return apiRequest<TicketHoldResponse>("/api/event/ticket/hold", { method: "POST", body });
}

/**
 * POST /api/event/ticket/hold/release. A hold created while signed in can only be
 * released by the same user (403 otherwise); guest holds by anyone with the id.
 * Missing/unknown holds return success.
 */
export async function releaseHold(paymentIntentId: string): Promise<void> {
  await apiRequest<unknown>("/api/event/ticket/hold/release", {
    method: "POST",
    body: { paymentIntentId },
  });
}

/**
 * POST /api/event/ticket/purchase — finalizes a paid PaymentIntent into tickets.
 * Idempotent per paymentIntentId (safe to retry). For new guest buyers the backend
 * also sets a website session cookie; it's cleared straight away (success or not).
 * `asGuest` finalizes without the bearer token (guest checkouts and their retries).
 */
export async function finalizePurchase(
  body: TicketPurchaseRequest,
  { asGuest = false }: { asGuest?: boolean } = {},
): Promise<TicketPurchaseResponse> {
  try {
    return await apiRequest<TicketPurchaseResponse>("/api/event/ticket/purchase", {
      method: "POST",
      body,
      // A guest order must never be attached to whoever is signed in now: the server
      // prefers the bearer identity over guestInfo, so guest finalizes send no token.
      auth: !asGuest,
    });
  } finally {
    await clearApiCookies();
  }
}
