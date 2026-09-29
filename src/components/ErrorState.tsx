import { getErrorMessage } from "@/api/errors";

import { Button } from "./Button";
import { EmptyState } from "./EmptyState";

export interface ErrorStateProps {
  title?: string;
  /** A message, or any thrown error (ApiError messages are already user-friendly). */
  error?: unknown;
  message?: string;
  onRetry?: () => void;
  retrying?: boolean;
}

export function ErrorState({
  title = "Something went wrong",
  error,
  message,
  onRetry,
  retrying = false,
}: ErrorStateProps) {
  return (
    <EmptyState
      tone="error"
      icon="alert-triangle"
      title={title}
      message={message ?? (error ? getErrorMessage(error) : undefined)}
      action={
        onRetry ? (
          <Button
            title="Try again"
            icon="refresh-cw"
            variant="outline"
            loading={retrying}
            onPress={onRetry}
          />
        ) : undefined
      }
    />
  );
}
