import { PaymentSheetError, useStripe } from "@stripe/stripe-react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  finalizePurchase,
  GUEST_INFO_REQUIRED,
  holdTickets,
  priceTickets,
  releaseHold,
} from "@/api/checkout";
import { ApiError, getErrorMessage } from "@/api/errors";
import { queryKeys } from "@/api/queryKeys";
import type {
  EventDetail,
  GuestInfo,
  TicketCartItem,
  TicketPricing,
  TicketPurchaseResponse,
} from "@/api/types";
import { showToast } from "@/components/Toast";
import { stripeReturnURL, walletPayments } from "@/services/payments";
import { useAuthStore } from "@/store/authStore";
import { useCheckoutResultStore } from "@/store/checkoutResultStore";
import {
  pendingPurchaseById,
  pendingPurchaseForEvent,
  usePendingPurchaseStore,
} from "@/store/pendingPurchaseStore";
import { env } from "@/utils/env";
import { getEventAvailability } from "@/utils/eventStatus";

// Mirrors the website's checkout (components/Stripe/EventCheckOut.tsx +
// components/Event/SingleEventPage.tsx). Steps: Tickets → Details (guests) → Checkout.
// Order of calls is the web's: price → hold → pay → finalize. Prices come only from
// the server; the app never computes an amount.

export type CheckoutStep = "tickets" | "details" | "checkout" | "recovery";
export type CheckoutBusy = "pricing" | "holding" | "promo" | "paying" | "finalizing" | null;

export interface RecoveryState {
  paymentIntentId: string;
  /** Last finalize error, if any (null = not tried yet in this session). */
  message: string | null;
  /** The server needs name/email/phone to issue the tickets (GUEST_INFO_REQUIRED). */
  needsGuestInfo: boolean;
  /** Stock/price problems after payment — the server says support will refund. */
  refundable: boolean;
}

const DEFAULT_MAX_PER_REQUEST = 10; // Event.max_tickets_per_request default
const TICK_MS = 1000;

const REFUNDABLE_PATTERNS = ["contact support for a refund", "Payment amount mismatch"];

function isRefundable(message: string) {
  return REFUNDABLE_PATTERNS.some((p) => message.includes(p));
}

function cartFromPricing(pricing: TicketPricing): TicketCartItem[] {
  return pricing.items.map((i) => ({ optionId: i.optionId, quantity: i.quantity }));
}

export interface UseCheckoutOptions {
  event: EventDetail;
  /** Buyer isn't signed in as a customer → Details step + guestInfo on finalize. */
  isGuest: boolean;
  /** Called after a successful purchase (result is already in useCheckoutResultStore). */
  onPurchased: (response: TicketPurchaseResponse) => void;
  /** Leave checkout (hold expiry). */
  onExit: () => void;
}

export function useCheckout({ event, isGuest, onPurchased, onExit }: UseCheckoutOptions) {
  const queryClient = useQueryClient();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const user = useAuthStore((s) => s.user);
  const addPending = usePendingPurchaseStore((s) => s.add);
  const removePending = usePendingPurchaseStore((s) => s.remove);
  const setResult = useCheckoutResultStore((s) => s.setResult);

  const existingPending = pendingPurchaseForEvent(event._id);

  const [step, setStep] = useState<CheckoutStep>(existingPending ? "recovery" : "tickets");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [pricing, setPricing] = useState<TicketPricing | null>(null);
  const [holdExpiresAt, setHoldExpiresAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [guestInfo, setGuestInfo] = useState<GuestInfo | null>(existingPending?.guestInfo ?? null);
  const [promoInput, setPromoInput] = useState("");
  const [promoMessage, setPromoMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<CheckoutBusy>(null);
  const [recovery, setRecovery] = useState<RecoveryState | null>(
    existingPending
      ? {
          paymentIntentId: existingPending.paymentIntentId,
          message: null,
          needsGuestInfo: false,
          refundable: false,
        }
      : null,
  );

  // Refs read by timers / navigation listeners (always the latest values).
  const pricingRef = useRef(pricing);
  const holdRef = useRef(holdExpiresAt);
  const busyRef = useRef(busy);
  /** Set once Stripe reports success — from then on the order is paid; never pay again. */
  const paidPaymentIntentRef = useRef<string | null>(existingPending?.paymentIntentId ?? null);
  const [isPaid, setIsPaid] = useState(!!existingPending);
  const onExitRef = useRef(onExit);
  const releasedRef = useRef<string | null>(null);
  const expiredWhilePayingRef = useRef(false);
  useEffect(() => {
    pricingRef.current = pricing;
    holdRef.current = holdExpiresAt;
    busyRef.current = busy;
    onExitRef.current = onExit;
  });

  // ── Ticket selection (web TicketsStep rules) ─────────────────────────────────────
  const availability = useMemo(() => getEventAvailability(event), [event]);
  const maxPerRequest = event.max_tickets_per_request ?? DEFAULT_MAX_PER_REQUEST;
  const totalQuantity = Object.values(quantities).reduce((sum, q) => sum + q, 0);

  const canIncrement = (optionId: string) => {
    if (totalQuantity >= maxPerRequest) return false; // cap across all options
    const state = availability.buyable.find((o) => o.option._id === optionId);
    if (!state) return false;
    const qty = quantities[optionId] ?? 0;
    return state.remaining === null || qty < state.remaining; // cap per option
  };

  const changeQuantity = (optionId: string, delta: 1 | -1) => {
    if (delta === 1 && !canIncrement(optionId)) return;
    setQuantities((q) => ({ ...q, [optionId]: Math.max(0, (q[optionId] ?? 0) + delta) }));
    setError(null);
  };

  const cartItems: TicketCartItem[] = Object.entries(quantities)
    .filter(([, qty]) => qty > 0)
    .map(([optionId, quantity]) => ({ optionId, quantity }));

  // ── Hold ─────────────────────────────────────────────────────────────────────────
  const placeHold = async (p: TicketPricing) => {
    const hold = await holdTickets({
      eventId: event._id,
      items: cartFromPricing(p),
      paymentIntentId: p.paymentIntentId,
    });
    releasedRef.current = null;
    setHoldExpiresAt(new Date(hold.expiresAt).getTime());
  };

  /** Releases the active hold (leaving checkout / expiry). Never after payment. */
  const releaseActiveHold = useCallback(() => {
    const p = pricingRef.current;
    if (!p || !holdRef.current) return;
    if (paidPaymentIntentRef.current) return;
    if (releasedRef.current === p.paymentIntentId) return;
    releasedRef.current = p.paymentIntentId;
    releaseHold(p.paymentIntentId).catch(() => undefined); // best effort; TTL reclaims it anyway
  }, []);

  const expireHold = useCallback(() => {
    releaseActiveHold();
    showToast({ type: "error", message: "Your ticket hold has expired. Please try again." });
    onExitRef.current();
  }, [releaseActiveHold]);

  // Countdown from the hold's expiresAt. Deliberately NOT tied to AppState: 3-D Secure
  // redirects background the app, and the hold must survive that.
  useEffect(() => {
    if (!holdExpiresAt || paidPaymentIntentRef.current) {
      setSecondsLeft(null);
      return;
    }
    const tick = () => {
      const secs = Math.max(0, Math.round((holdExpiresAt - Date.now()) / 1000));
      setSecondsLeft(secs);
      if (secs > 0) return;
      clearInterval(timer);
      if (busyRef.current === "paying" || busyRef.current === "finalizing") {
        expiredWhilePayingRef.current = true; // decide once the payment sheet closes
      } else {
        expireHold();
      }
    };
    const timer = setInterval(tick, TICK_MS);
    tick();
    return () => clearInterval(timer);
  }, [holdExpiresAt, expireHold]);

  // ── Tickets → (Details) → Checkout ────────────────────────────────────────────────
  const continueFromTickets = async () => {
    if (!cartItems.length || busy) return;
    setError(null);
    setBusy("pricing");
    try {
      const res = await priceTickets({
        eventId: event._id,
        items: cartItems,
        previousPaymentIntentId: pricing?.paymentIntentId,
      });
      setPricing(res);
      setHoldExpiresAt(null);
      setPromoInput("");
      setPromoMessage(null);
      if (isGuest && !guestInfo) {
        setStep("details");
        return;
      }
      setBusy("holding");
      await placeHold(res);
      setStep("checkout");
    } catch (err) {
      // A re-price releases the previous hold server-side even when it fails.
      if (pricing) {
        releasedRef.current = pricing.paymentIntentId;
        setHoldExpiresAt(null);
      }
      setError(getErrorMessage(err, "Those tickets are no longer available"));
      setStep("tickets");
    } finally {
      setBusy(null);
    }
  };

  const continueFromDetails = async (info: GuestInfo) => {
    if (!pricing || busy) return;
    setGuestInfo(info);
    setError(null);
    setBusy("holding");
    try {
      await placeHold(pricing);
      setStep("checkout");
    } catch (err) {
      setError(getErrorMessage(err, "Those tickets are no longer available"));
      setStep("tickets");
    } finally {
      setBusy(null);
    }
  };

  /** Back within the flow (the hold keeps running, like the web). */
  const goBackStep = (): boolean => {
    if (busy === "paying" || busy === "finalizing") return true; // can't leave mid-payment
    if (step === "checkout") {
      setStep(isGuest ? "details" : "tickets");
      return true;
    }
    if (step === "details") {
      setStep("tickets");
      return true;
    }
    return false; // tickets / recovery → leave the screen
  };

  // ── Promo code (Checkout step) ─────────────────────────────────────────────────────
  const applyPromo = async () => {
    if (!pricing || busy) return;
    const previous = pricing;
    setPromoMessage(null);
    setBusy("promo");
    let next: TicketPricing;
    try {
      next = await priceTickets({
        eventId: event._id,
        items: cartFromPricing(previous),
        promoCode: promoInput,
        previousPaymentIntentId: previous.paymentIntentId,
      });
    } catch (err) {
      // The server released the previous hold before failing — take it again so the
      // buyer keeps their tickets and can still pay the previous price.
      setPromoMessage({ type: "error", text: getErrorMessage(err, "Invalid promo code") });
      try {
        await placeHold(previous);
      } catch {
        setHoldExpiresAt(null);
      }
      setBusy(null);
      return;
    }
    setPricing(next);
    try {
      await placeHold(next);
      setPromoMessage(
        promoInput.trim() && next.promoApplied
          ? { type: "success", text: "Promo code applied!" }
          : null,
      );
    } catch (err) {
      // Re-priced but the tickets can't be held any more (sold out meanwhile).
      setHoldExpiresAt(null);
      setError(getErrorMessage(err, "Those tickets are no longer available"));
      setStep("tickets");
    } finally {
      setBusy(null);
    }
  };

  // ── Finalize (idempotent) ─────────────────────────────────────────────────────────
  const finalize = async (paymentIntentId: string, info: GuestInfo | null) => {
    // Finalize as the signed-in buyer only if this order is theirs: a guest order (or one
    // paid by a different account) must never be attached to whoever is signed in now —
    // the server prefers the bearer identity over guestInfo.
    const auth = useAuthStore.getState();
    const pending = pendingPurchaseById(paymentIntentId);
    const signedInCustomer =
      auth.status === "signedIn" &&
      !isGuest &&
      !pending?.guestInfo &&
      (!pending?.buyerUserId || pending.buyerUserId === auth.user?.id);
    setBusy("finalizing");
    try {
      const res = await finalizePurchase(
        {
          eventId: event._id,
          paymentIntentId,
          guestInfo: signedInCustomer ? undefined : (info ?? undefined),
        },
        { asGuest: !signedInCustomer },
      );
      await removePending(paymentIntentId);
      setRecovery(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.tickets });
      if (event.slug) void queryClient.invalidateQueries({ queryKey: queryKeys.event(event.slug) });
      setResult({
        purchaseId: res.purchaseId,
        receipt: res.receipt,
        guestEmail: signedInCustomer ? undefined : info?.email,
      });
      showToast({ type: "success", message: "Payment successful! Your tickets are ready." });
      onPurchased(res);
    } catch (err) {
      const message = getErrorMessage(err, "We couldn't issue your tickets yet.");
      const needsGuestInfo = err instanceof ApiError && err.code === GUEST_INFO_REQUIRED;
      setRecovery({ paymentIntentId, message, needsGuestInfo, refundable: isRefundable(message) });
      setStep("recovery");
      if (needsGuestInfo) {
        showToast({
          type: "error",
          message:
            "Your payment went through — please confirm your details to receive your tickets.",
        });
      }
    } finally {
      setBusy(null);
    }
  };

  /** Recovery panel: retry with the same PaymentIntent (never a new payment). */
  const retryFinalize = async (info?: GuestInfo) => {
    if (!recovery || busy) return;
    const details = info ?? guestInfo;
    if (info) setGuestInfo(info);
    const pending = pendingPurchaseForEvent(event._id);
    if (info && pending) await addPending({ ...pending, guestInfo: info });
    await finalize(recovery.paymentIntentId, details);
  };

  // ── Pay (Stripe PaymentSheet) ─────────────────────────────────────────────────────
  const pay = async () => {
    if (!pricing || busy || paidPaymentIntentRef.current) return;
    setBusy("paying");
    const billingName = guestInfo?.name ?? user?.name;
    const { error: initError } = await initPaymentSheet({
      paymentIntentClientSecret: pricing.clientSecret,
      merchantDisplayName: env.stripe.merchantDisplayName,
      returnURL: stripeReturnURL(),
      allowsDelayedPaymentMethods: false,
      defaultBillingDetails: {
        name: billingName ?? undefined,
        email: guestInfo?.email ?? user?.email,
        phone: guestInfo?.phone ?? user?.phone_number,
        address: { country: env.stripe.merchantCountryCode },
      },
      googlePay: walletPayments.googlePay
        ? {
            merchantCountryCode: env.stripe.merchantCountryCode,
            currencyCode: env.stripe.currencyCode,
            testEnv: env.stripe.googlePayTestEnv,
          }
        : undefined,
    });
    if (initError) {
      setBusy(null);
      showToast({ type: "error", message: initError.message || "Couldn't start the payment." });
      return;
    }

    const { error: payError } = await presentPaymentSheet();
    if (payError) {
      setBusy(null);
      if (payError.code === PaymentSheetError.Canceled) {
        showToast({ type: "info", message: "Payment cancelled" });
      } else {
        showToast({ type: "error", message: payError.message || "Your payment was declined." });
      }
      if (expiredWhilePayingRef.current) expireHold();
      return;
    }

    // Paid. Record it BEFORE finalizing so it can never be lost or paid twice.
    const paymentIntentId = pricing.paymentIntentId;
    paidPaymentIntentRef.current = paymentIntentId;
    setIsPaid(true);
    setHoldExpiresAt(null);
    await addPending({
      paymentIntentId,
      eventId: event._id,
      eventSlug: event.slug,
      eventTitle: event.title,
      guestInfo: isGuest ? (guestInfo ?? undefined) : undefined,
      buyerUserId: isGuest ? undefined : user?.id,
      createdAt: Date.now(),
    });
    await finalize(paymentIntentId, guestInfo);
  };

  return {
    // state
    step,
    quantities,
    pricing,
    secondsLeft,
    guestInfo,
    promoInput,
    promoMessage,
    error,
    busy,
    recovery,
    availability,
    maxPerRequest,
    totalQuantity,
    /** Payment succeeded (this session or a previous one) — Pay must not be offered. */
    isPaid,
    // actions
    canIncrement,
    changeQuantity,
    continueFromTickets,
    continueFromDetails,
    goBackStep,
    setPromoInput,
    applyPromo,
    pay,
    retryFinalize,
    releaseActiveHold,
  };
}
