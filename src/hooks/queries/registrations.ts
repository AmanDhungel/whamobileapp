import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getErrorMessage } from "@/api/errors";
import { queryKeys } from "@/api/queryKeys";
import {
  ALREADY_REGISTERED_MESSAGE,
  getMyRegistrations,
  registerForEvent,
  registrationEventId,
} from "@/api/registrations";
import { showToast } from "@/components/Toast";
import { useIsCustomer } from "@/store/authStore";

/** The signed-in customer's free-event registrations (web: "Already Registered" check). */
export function useMyRegistrations() {
  const isCustomer = useIsCustomer();
  return useQuery({
    queryKey: queryKeys.registrations,
    queryFn: getMyRegistrations,
    enabled: isCustomer,
  });
}

export function useIsRegistered(eventId: string): boolean {
  const { data } = useMyRegistrations();
  return !!data?.some((r) => registrationEventId(r) === eventId);
}

/** Register for a free event; the new ticket appears in My tickets. */
export function useRegisterForEvent(eventSlug?: string) {
  const qc = useQueryClient();
  const refresh = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.registrations }),
      qc.invalidateQueries({ queryKey: queryKeys.tickets }),
      eventSlug ? qc.invalidateQueries({ queryKey: queryKeys.event(eventSlug) }) : undefined,
    ]);

  return useMutation({
    mutationFn: (eventId: string) => registerForEvent(eventId),
    onSuccess: async (res) => {
      await refresh();
      showToast({ type: "success", message: res.message || "Ticket generated! Check your email." });
    },
    onError: async (error) => {
      const message = getErrorMessage(error, "Couldn't register for this event.");
      // Already claimed → reflect "Already Registered" (the registrations list has it).
      if (message === ALREADY_REGISTERED_MESSAGE) await refresh();
      showToast({ type: message === ALREADY_REGISTERED_MESSAGE ? "info" : "error", message });
    },
  });
}
