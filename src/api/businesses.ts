import { apiRequest } from "./client";
import type { BusinessDetail, BusinessSummary, DataResponse } from "./types";

/**
 * Query params GET /api/business reads (app/api/business/route.tsx). No pagination:
 * page/per_page are ignored and results are capped at 200 server-side.
 */
export interface BusinessFilters {
  /** Regex over business_name, seo_keywords, seo_description. */
  search?: string;
  /** Exact business_category value (e.g. "barber"); "all"/undefined = any. */
  category?: string;
  /** Free-text service search (matched against Service names and category aliases). */
  service?: string;
  /** One of AU_CITIES — resolved server-side to coordinates + 50 km radius. */
  city?: string;
  community?: string;
  lat?: number;
  lng?: number;
  /** km — only used with lat/lng. */
  radius?: number;
}

export async function getBusinesses(filters: BusinessFilters): Promise<BusinessSummary[]> {
  const res = await apiRequest<DataResponse<BusinessSummary[]>>("/api/business", {
    query: { ...filters },
  });
  return res.data ?? [];
}

/** GET /api/business/single/[slug] — the slug of business_name, not the _id. */
export async function getBusiness(slug: string): Promise<BusinessDetail> {
  const res = await apiRequest<DataResponse<BusinessDetail>>(
    `/api/business/single/${encodeURIComponent(slug)}`,
  );
  return res.data;
}
