import type { Review, ReviewAuthor } from "@/api/types";

/** Mean rating, or null when there are no reviews (web: toFixed(1) on the card). */
export function averageRating(reviews?: Pick<Review, "rating">[] | null): number | null {
  if (!reviews?.length) return null;
  const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
  return sum / reviews.length;
}

export function formatRating(value: number | null): string | null {
  return value === null ? null : value.toFixed(1);
}

export function reviewAuthor(review: Review): ReviewAuthor | null {
  return typeof review.user === "object" && review.user ? review.user : null;
}

export function reviewAuthorId(review: Review): string {
  return typeof review.user === "object" && review.user ? review.user._id : review.user;
}
