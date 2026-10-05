import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getBusinessDashboard,
  getEventAttendees,
  getEventForForm,
  getEventPurchases,
  getMyEvents,
  saveEvent,
  sendPurchaseInvoice,
  setTicketStatus,
  toggleEventArchive,
  verifyEventTicket,
} from "@/api/businessEvents";
import { getErrorMessage } from "@/api/errors";
import { queryKeys } from "@/api/queryKeys";
import type { TicketStatus } from "@/api/types";
import { showToast } from "@/components/Toast";
import { useAccountArea } from "@/store/authStore";
import { buildEventFormData, type EventFormValues } from "@/utils/eventForm";

// Invalidation boundaries follow the web's services/event.service.ts — plus the event
// form after an edit/archive, which the web forgets (stale edit form).

function useIsBusiness() {
  return useAccountArea() === "business";
}

export function useBusinessDashboard() {
  const enabled = useIsBusiness();
  return useQuery({ queryKey: queryKeys.bizDashboard, queryFn: getBusinessDashboard, enabled });
}

export function useMyEvents() {
  const enabled = useIsBusiness();
  return useQuery({ queryKey: queryKeys.bizEvents, queryFn: getMyEvents, enabled });
}

export function useEventForForm(id: string | undefined) {
  const enabled = useIsBusiness() && !!id;
  return useQuery({
    queryKey: queryKeys.bizEventForm(id ?? ""),
    queryFn: () => getEventForForm(id!),
    enabled,
  });
}

export function useEventAttendees(eventId: string) {
  const enabled = useIsBusiness() && !!eventId;
  return useQuery({
    queryKey: queryKeys.bizAttendees(eventId),
    queryFn: () => getEventAttendees(eventId),
    enabled,
  });
}

export function useEventPurchases(eventId: string) {
  const enabled = useIsBusiness() && !!eventId;
  return useQuery({
    queryKey: queryKeys.bizPurchases(eventId),
    queryFn: () => getEventPurchases(eventId),
    enabled,
  });
}

/** Create or update. The caller toasts / navigates on success. */
export function useSaveEvent(id?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: EventFormValues) => {
      const { form, uploadBytes } = await buildEventFormData(values);
      return saveEvent(form, { id, uploadBytes });
    },
    onSuccess: async (event) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.bizEvents }),
        qc.invalidateQueries({ queryKey: queryKeys.bizEventForm(String(event._id)) }),
      ]);
    },
  });
}

export function useToggleEventArchive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => toggleEventArchive(id),
    onSuccess: async (res, id) => {
      showToast({
        type: "success",
        message: res.data?.archived ? "Event archived" : "Event unarchived",
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.bizEvents }),
        qc.invalidateQueries({ queryKey: queryKeys.bizEventForm(id) }),
      ]);
    },
    onError: (error) =>
      showToast({ type: "error", message: getErrorMessage(error, "Failed to update event") }),
  });
}

/** Scan / manual verify. Results are shown by the scanner itself (no toast here). */
export function useVerifyEventTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, eventId }: { code: string; eventId?: string }) =>
      verifyEventTicket(code, eventId),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["biz", "attendees"] }),
        qc.invalidateQueries({ queryKey: ["biz", "purchases"] }),
      ]);
    },
  });
}

export function useSetTicketStatus(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, status }: { code: string; status: TicketStatus }) =>
      setTicketStatus(code, status),
    onSuccess: async (_res, { status }) => {
      showToast({
        type: "success",
        message: `Status updated to ${status === "verified" ? "Checked In" : "Pending"}`,
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.bizAttendees(eventId) }),
        qc.invalidateQueries({ queryKey: queryKeys.bizPurchases(eventId) }),
      ]);
    },
    onError: (error) =>
      showToast({ type: "error", message: getErrorMessage(error, "Failed to update status") }),
  });
}

export function useSendPurchaseInvoice() {
  return useMutation({
    mutationFn: (purchaseId: string) => sendPurchaseInvoice(purchaseId),
    onSuccess: () => showToast({ type: "success", message: "Invoice sent to buyer" }),
    onError: (error) =>
      showToast({ type: "error", message: getErrorMessage(error, "Failed to send invoice") }),
  });
}
