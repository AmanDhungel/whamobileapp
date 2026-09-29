import { apiRequest } from "./client";
import type { DataResponse, Deal } from "./types";

/** Query params GET /api/deals/get-all reads. No pagination, no expiry filter server-side. */
export interface DealFilters {
  search?: string;
  /** "all"/undefined = any. */
  category?: string;
  /** Exact (case-insensitive) match on deal.city. */
  city?: string;
}

export async function getDeals(filters: DealFilters): Promise<Deal[]> {
  const res = await apiRequest<DataResponse<Deal[]>>("/api/deals/get-all", {
    query: { ...filters },
  });
  return res.data ?? [];
}

/** GET /api/deals/single-deal/[id] — the Mongo _id. */
export async function getDeal(id: string): Promise<Deal> {
  const res = await apiRequest<DataResponse<Deal>>(
    `/api/deals/single-deal/${encodeURIComponent(id)}`,
  );
  return res.data;
}
