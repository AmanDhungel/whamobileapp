import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { finalizePurchase } from "@/api/checkout";
import { queryKeys } from "@/api/queryKeys";
import { showToast } from "@/components/Toast";
import { useAuthStore } from "@/store/authStore";
import { usePendingPurchaseStore, type PendingPurchase } from "@/store/pendingPurchaseStore";

let running = false;

/** Whether this pending order may be finalized automatically in the current session. */
function canAutoRetry(p: PendingPurchase, currentUserId: string | undefined): boolean {
  if (p.guestInfo) return true; // finalized as a guest, without any bearer token
  return !!p.buyerUserId && p.buyerUserId === currentUserId;
}

/**
 * Retries finalizing paid-but-unfinalized orders (idempotent per paymentIntentId).
 * Orders that still can't be finalized stay pending; the checkout screen for that
 * event shows the recovery panel for them.
 */
export async function retryPendingPurchases(queryClient: QueryClient): Promise<void> {
  if (running) return;
  running = true;
  try {
    const store = usePendingPurchaseStore.getState();
    await store.load();
    const userId = useAuthStore.getState().user?.id;
    for (const p of usePendingPurchaseStore.getState().pending) {
      if (!canAutoRetry(p, userId)) continue;
      try {
        await finalizePurchase(
          { eventId: p.eventId, paymentIntentId: p.paymentIntentId, guestInfo: p.guestInfo },
          { asGuest: !!p.guestInfo },
        );
        await store.remove(p.paymentIntentId);
        showToast({
          type: "success",
          message: `Your tickets${p.eventTitle ? ` for ${p.eventTitle}` : ""} are ready — we've emailed them to you.`,
        });
        void queryClient.invalidateQueries({ queryKey: queryKeys.tickets });
      } catch {
        // Keep it pending — retried later or finished from the checkout screen.
      }
    }
  } finally {
    running = false;
  }
}

/**
 * Runs the recovery whenever `sessionKey` changes — mount it where the session is
 * already restored and pass the user id (or a constant when logged out), so it runs at
 * start and again after each login.
 */
export function usePendingPurchaseRecovery(sessionKey: string) {
  const queryClient = useQueryClient();
  useEffect(() => {
    void retryPendingPurchases(queryClient);
  }, [sessionKey, queryClient]);
}
