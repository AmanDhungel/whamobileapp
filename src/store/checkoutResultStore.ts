import { create } from "zustand";

import type { PurchaseReceipt } from "@/api/types";

/**
 * Hands the purchase result from checkout to the success screen in memory — never via
 * the URL (a receipt carries ticket codes; docs 03-screens.md: don't make receipts
 * addressable by id). Cleared when the success screen is left.
 */
export interface CheckoutResult {
  purchaseId: string;
  receipt: PurchaseReceipt;
  /** Guest checkout: the email the tickets were sent to. */
  guestEmail?: string;
}

interface CheckoutResultState {
  result: CheckoutResult | null;
  setResult: (result: CheckoutResult) => void;
  clear: () => void;
}

export const useCheckoutResultStore = create<CheckoutResultState>()((set) => ({
  result: null,
  setResult: (result) => set({ result }),
  clear: () => set({ result: null }),
}));
