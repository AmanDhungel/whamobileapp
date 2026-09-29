import { apiRequest } from "./client";
import type { DataResponse, EventDetail, EventSummary } from "./types";

/**
 * Query params GET /api/event/getallevent reads. Only events starting today or later
 * are returned (archived ones are NOT excluded server-side). No pagination (cap 200).
 */
export interface EventFilters {
  search?: string;
  /** "all"/undefined = any. */
  category?: string;
  community?: string;
  city?: string;
  lat?: number;
  lng?: number;
  radius?: number;
}

export async function getEvents(filters: EventFilters): Promise<EventSummary[]> {
  const res = await apiRequest<DataResponse<EventSummary[]>>("/api/event/getallevent", {
    query: { ...filters },
  });
  return res.data ?? [];
}

/** GET /api/event/single-event/[slug] — the event's `slug` field, not the _id. */
export async function getEvent(slug: string): Promise<EventDetail> {
  const res = await apiRequest<DataResponse<EventDetail>>(
    `/api/event/single-event/${encodeURIComponent(slug)}`,
  );
  return res.data;
}
