import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError, getErrorMessage } from "@/api/errors";
import { queryKeys } from "@/api/queryKeys";
import { createReview, deleteReview, getReviews, updateReview } from "@/api/reviews";
import { showToast } from "@/components/Toast";

export function useReviews(businessSlug: string) {
  return useQuery({
    queryKey: queryKeys.reviews(businessSlug),
    queryFn: () => getReviews(businessSlug),
    enabled: !!businessSlug,
  });
}

function useInvalidateReviews(businessSlug: string) {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.reviews(businessSlug) }),
      // Ratings on cards come from the embedded `reviews` of these lists.
      qc.invalidateQueries({ queryKey: ["businesses"] }),
      qc.invalidateQueries({ queryKey: ["landing"] }),
    ]);
}

export interface ReviewInput {
  rating: number;
  comment: string;
}

export function useCreateReview(businessSlug: string) {
  const invalidate = useInvalidateReviews(businessSlug);
  return useMutation({
    mutationFn: (input: ReviewInput) => createReview({ business_id: businessSlug, ...input }),
    onSuccess: async () => {
      await invalidate();
      showToast({ type: "success", message: "Review created successfully" });
    },
    onError: (error) => {
      const message =
        error instanceof ApiError && error.status === 409
          ? "You have already reviewed this business."
          : getErrorMessage(error, "Couldn't post your review. Please try again.");
      showToast({ type: "error", message });
    },
  });
}

export function useUpdateReview(businessSlug: string) {
  const invalidate = useInvalidateReviews(businessSlug);
  return useMutation({
    mutationFn: ({ id, ...input }: ReviewInput & { id: string }) => updateReview(id, input),
    onSuccess: async () => {
      await invalidate();
      showToast({ type: "success", message: "Review updated successfully" });
    },
    onError: (error) =>
      showToast({ type: "error", message: getErrorMessage(error, "Couldn't update your review.") }),
  });
}

export function useDeleteReview(businessSlug: string) {
  const invalidate = useInvalidateReviews(businessSlug);
  return useMutation({
    mutationFn: (id: string) => deleteReview(id),
    onSuccess: async () => {
      await invalidate();
      showToast({ type: "success", message: "Review deleted" });
    },
    onError: (error) =>
      showToast({ type: "error", message: getErrorMessage(error, "Couldn't delete your review.") }),
  });
}
