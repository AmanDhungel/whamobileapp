import type { MobileErrorCode } from "./types";

export const NETWORK_ERROR_MESSAGE = "Can't reach the server. Check your connection.";
export const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

export class ApiError extends Error {
  readonly status: number;
  readonly code: MobileErrorCode | null;
  readonly body: unknown;

  constructor(
    message: string,
    status: number,
    code: MobileErrorCode | null = null,
    body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.body = body;
  }

  get isNetworkError() {
    return this.status === 0;
  }
}

export function tryParseJson(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

const KNOWN_CODES: readonly MobileErrorCode[] = [
  "ACCOUNT_BLOCKED",
  "ACCOUNT_NOT_FOUND",
  "TOKEN_INVALID",
];

/**
 * Extracts a human message + optional code from any error body this backend produces.
 * Always JSON-parses first (the web client's recurring raw-`{"error":...}` bug —
 * 12-mobile-gap-report.md §11). Handles, in order:
 *   - mobile envelope  { data:null, error:{ message, code }, meta }
 *   - legacy           { error: "..." }            e.g. /api/auth/verify-code
 *   - legacy           { message: "..." }          e.g. /api/auth/send-verification-code
 *   - raw text, then a generic fallback.
 */
export function parseErrorBody(
  text: string,
  status: number,
): { message: string; code: MobileErrorCode | null; body: unknown } {
  const parsed = tryParseJson(text);

  if (isRecord(parsed)) {
    const { error, message } = parsed;
    if (isRecord(error) && typeof error.message === "string") {
      const code = KNOWN_CODES.find((c) => c === error.code) ?? null;
      return { message: error.message, code, body: parsed };
    }
    if (typeof error === "string" && error) return { message: error, code: null, body: parsed };
    if (typeof message === "string" && message) return { message, code: null, body: parsed };
  }

  const raw = text.trim();
  // Don't surface HTML error pages (e.g. a proxy 502) to users.
  if (raw && parsed === undefined && !raw.startsWith("<") && raw.length < 300) {
    return { message: raw, code: null, body: raw };
  }
  const fallbackByStatus: Record<number, string> = {
    404: "This service isn't available on the server yet (404). Please try again later.",
    429: "Too many requests. Please slow down.",
  };
  return {
    message: fallbackByStatus[status] ?? GENERIC_ERROR_MESSAGE,
    code: null,
    body: parsed ?? raw,
  };
}

export function getErrorMessage(error: unknown, fallback = GENERIC_ERROR_MESSAGE): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
