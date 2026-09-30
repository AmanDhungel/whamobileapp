import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

import type { GuestInfo } from "@/api/types";

/**
 * Paid-but-not-yet-finalized ticket orders.
 *
 * The backend has no Stripe webhook fallback for ticket purchases: a successful payment
 * only becomes tickets when the app calls POST /api/event/ticket/purchase. So the moment
 * PaymentSheet reports success, the order is saved here (SecureStore — it can contain
 * guest contact details) BEFORE finalizing, and removed only once finalize succeeds.
 * Anything left over is retried (idempotently, same paymentIntentId) on app start, on
 * the Activity tab, and when the user reopens checkout for that event — which shows
 * the recovery panel instead of taking a second payment.
 */
export interface PendingPurchase {
  paymentIntentId: string;
  eventId: string;
  eventSlug?: string;
  eventTitle?: string;
  /** Present for guest checkouts (needed again to finalize, without a bearer token). */
  guestInfo?: GuestInfo;
  /** Signed-in buyer — only auto-retried while this same user is signed in. */
  buyerUserId?: string;
  createdAt: number;
}

const STORAGE_KEY = "wha.pendingPurchases";

async function persist(list: PendingPurchase[]) {
  try {
    if (list.length) await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(list));
    else await SecureStore.deleteItemAsync(STORAGE_KEY);
  } catch {
    // Non-fatal: the in-memory copy still drives this session.
  }
}

interface PendingPurchaseState {
  pending: PendingPurchase[];
  loaded: boolean;
  load: () => Promise<void>;
  add: (purchase: PendingPurchase) => Promise<void>;
  remove: (paymentIntentId: string) => Promise<void>;
}

export const usePendingPurchaseStore = create<PendingPurchaseState>()((set, get) => ({
  pending: [],
  loaded: false,

  load: async () => {
    if (get().loaded) return;
    try {
      const raw = await SecureStore.getItemAsync(STORAGE_KEY);
      const list = raw ? (JSON.parse(raw) as PendingPurchase[]) : [];
      set({ pending: Array.isArray(list) ? list : [], loaded: true });
    } catch {
      set({ pending: [], loaded: true });
    }
  },

  add: async (purchase) => {
    const list = [
      ...get().pending.filter((p) => p.paymentIntentId !== purchase.paymentIntentId),
      purchase,
    ];
    set({ pending: list });
    await persist(list);
  },

  remove: async (paymentIntentId) => {
    const list = get().pending.filter((p) => p.paymentIntentId !== paymentIntentId);
    set({ pending: list });
    await persist(list);
  },
}));

export function pendingPurchaseById(paymentIntentId: string): PendingPurchase | undefined {
  return usePendingPurchaseStore
    .getState()
    .pending.find((p) => p.paymentIntentId === paymentIntentId);
}

export function pendingPurchaseForEvent(eventId: string): PendingPurchase | undefined {
  return usePendingPurchaseStore.getState().pending.find((p) => p.eventId === eventId);
}
