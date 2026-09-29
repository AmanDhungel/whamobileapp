import type { BusinessSummary } from "@/api/types";

/**
 * The business "slug" the backend uses both for /api/business/single/[slug] and as
 * Review.business_id: business_name lowercased with every non-alphanumeric removed.
 * (Server-side the match only tolerates whitespace differences, so names containing
 * punctuation — e.g. "Joe's" — can't be looked up; reported as a backend bug.)
 */
export function slugifyBusinessName(name?: string | null): string {
  return (name ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function businessSlug(business: Pick<BusinessSummary, "business_name" | "name">): string {
  return slugifyBusinessName(business.business_name ?? business.name);
}

/** Normalises an event slug from a URL segment the same way the web detail page does. */
export function normalizeEventSlug(value?: string | null): string {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}
