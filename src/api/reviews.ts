import { apiRequest } from "./client";
import type {
  CreateReviewRequest,
  MessageData,
  Review,
  ReviewMutationResponse,
  ReviewsResponse,
  UpdateReviewRequest,
} from "./types";

/** GET /api/review?business_id=<business-name slug> — public. */
export async function getReviews(businessSlug: string): Promise<Review[]> {
  const res = await apiRequest<ReviewsResponse>("/api/review", {
    query: { business_id: businessSlug },
  });
  return res.data ?? [];
}

/** POST /api/review (bearer). 409 = the user already reviewed this business. */
export async function createReview(body: CreateReviewRequest): Promise<Review> {
  const res = await apiRequest<ReviewMutationResponse>("/api/review", {
    method: "POST",
    body: { ...body, comment: body.comment.trim() },
  });
  return res.data;
}

/** PATCH /api/review/edit/[id] (bearer, owner only). */
export async function updateReview(id: string, body: UpdateReviewRequest): Promise<Review> {
  const res = await apiRequest<ReviewMutationResponse>(
    `/api/review/edit/${encodeURIComponent(id)}`,
    { method: "PATCH", body: { ...body, comment: body.comment?.trim() } },
  );
  return res.data;
}

/** Delete is POST /api/review/delete/[id] (not DELETE) — owner or super-admin. */
export async function deleteReview(id: string): Promise<MessageData> {
  return apiRequest<MessageData>(`/api/review/delete/${encodeURIComponent(id)}`, {
    method: "POST",
  });
}
