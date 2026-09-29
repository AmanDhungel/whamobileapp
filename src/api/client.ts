import { getDeviceInfo } from "@/utils/device";
import { env } from "@/utils/env";

import {
  ApiError,
  GENERIC_ERROR_MESSAGE,
  NETWORK_ERROR_MESSAGE,
  parseErrorBody,
  tryParseJson,
} from "./errors";
import { getSessionGeneration, getTokens, loadTokens, saveTokens } from "./tokenStorage";
import type { AuthTokens, MobileEnvelope } from "./types";

export const MOBILE_API = "/api/mobile/v1";

const REQUEST_TIMEOUT_MS = 20_000;
/** Refresh proactively when the access token has less than this left. */
const REFRESH_SKEW_MS = 30_000;

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export interface RequestOptions {
  method?: Method;
  /** JSON-serialisable value, or FormData for multipart uploads. */
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  /**
   * Attach the bearer token and run the refresh/logout logic (default true).
   * Pass false for the auth endpoints themselves (login, register, refresh, ...).
   */
  auth?: boolean;
  /**
   * "strict" (default): a 401 with no error code, on a request that carried a token,
   * means the token was rejected → refresh + retry once, then log out.
   * "lenient": a bare 401 is just thrown to the caller (no refresh, no logout). For
   * routes that are still cookie-only on the backend (e.g. /api/edit-profile) — their
   * 401 means "this route doesn't accept bearer tokens yet", not "your session died".
   * Coded rejections (TOKEN_INVALID / ACCOUNT_*) are always handled normally.
   */
  authMode?: "strict" | "lenient";
  signal?: AbortSignal;
}

export interface ApiResult<T> {
  data: T;
  meta: Record<string, unknown> | null;
}

// ─── Auth-failure hook ──────────────────────────────────────────────────────────
// The client never imports the auth store (avoids a require cycle); the store
// registers itself here instead.

export type AuthFailureReason = "expired" | "blocked" | "not_found";

let authFailureHandler: ((reason: AuthFailureReason) => void) | null = null;

export function setAuthFailureHandler(handler: (reason: AuthFailureReason) => void) {
  authFailureHandler = handler;
}

function reportAuthFailure(reason: AuthFailureReason) {
  authFailureHandler?.(reason);
}

// ─── Low-level fetch ────────────────────────────────────────────────────────────

function isMobileRoute(path: string) {
  return path.startsWith(MOBILE_API);
}

function buildUrl(path: string, query?: RequestOptions["query"]) {
  let url = `${env.apiUrl}${path}`;
  if (query) {
    const params = Object.entries(query)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    if (params.length) url += `${url.includes("?") ? "&" : "?"}${params.join("&")}`;
  }
  return url;
}

/**
 * One HTTP round-trip. Parses the {data,error,meta} envelope for /api/mobile/v1/*
 * routes and returns legacy routes' bodies as-is. Throws ApiError on any failure.
 */
async function send<T>(
  path: string,
  opts: RequestOptions,
  accessToken: string | undefined,
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = { Accept: "application/json" };
  let body: BodyInit | undefined;

  if (opts.body instanceof FormData) {
    body = opts.body; // fetch sets the multipart boundary itself
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const onExternalAbort = () => controller.abort();
  opts.signal?.addEventListener("abort", onExternalAbort);

  let res: Response;
  try {
    res = await fetch(buildUrl(path, opts.query), {
      method: opts.method ?? "GET",
      headers,
      body,
      signal: controller.signal,
    });
  } catch (err) {
    if (opts.signal?.aborted) throw err; // caller cancelled — not a network error
    const timedOut = controller.signal.aborted;
    throw new ApiError(
      timedOut ? "The request timed out. Please try again." : NETWORK_ERROR_MESSAGE,
      0,
    );
  } finally {
    clearTimeout(timeout);
    opts.signal?.removeEventListener("abort", onExternalAbort);
  }

  const text = await res.text();

  if (!res.ok) {
    const parsed = parseErrorBody(text, res.status);
    throw new ApiError(parsed.message, res.status, parsed.code, parsed.body);
  }

  const json = tryParseJson(text);

  if (isMobileRoute(path)) {
    const envelope = json as MobileEnvelope<T> | null | undefined;
    if (!envelope || typeof envelope !== "object" || !("data" in envelope)) {
      throw new ApiError(GENERIC_ERROR_MESSAGE, res.status, null, json ?? text);
    }
    if (envelope.error) {
      throw new ApiError(envelope.error.message, res.status, envelope.error.code, envelope);
    }
    return { data: envelope.data as T, meta: envelope.meta ?? null };
  }

  // Legacy routes: a few ad hoc shapes report failure with a 2xx + success:false.
  if (json && typeof json === "object" && (json as { success?: unknown }).success === false) {
    const parsed = parseErrorBody(text, res.status);
    throw new ApiError(parsed.message, res.status, parsed.code, json);
  }
  return { data: (json ?? text) as T, meta: null };
}

// ─── Token refresh (single-flight) ──────────────────────────────────────────────

export type RefreshOutcome = { ok: true } | { ok: false; reason: AuthFailureReason };

let refreshInFlight: Promise<RefreshOutcome> | null = null;

/**
 * Rotates the token pair. Only ONE refresh runs at a time — concurrent callers all
 * await the same promise. Resolves { ok:false, reason } when the server rejected the
 * refresh token (caller should log out). /auth/refresh reports ACCOUNT_BLOCKED (403)
 * and ACCOUNT_NOT_FOUND so a suspended user sees the right message. Network/5xx
 * failures throw instead, so being offline never logs anyone out.
 */
export function refreshTokens(): Promise<RefreshOutcome> {
  refreshInFlight ??= doRefresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

function reasonFromError(err: ApiError): AuthFailureReason {
  if (err.code === "ACCOUNT_BLOCKED") return "blocked";
  if (err.code === "ACCOUNT_NOT_FOUND") return "not_found";
  return "expired";
}

async function doRefresh(): Promise<RefreshOutcome> {
  const tokens = await loadTokens();
  if (!tokens) return { ok: false, reason: "expired" };
  const generation = getSessionGeneration();

  try {
    const device = await getDeviceInfo();
    const { data } = await send<AuthTokens>(
      `${MOBILE_API}/auth/refresh`,
      { method: "POST", body: { refreshToken: tokens.refreshToken, ...device } },
      undefined,
    );
    // Logged out while the refresh was in flight — don't resurrect the session.
    if (generation !== getSessionGeneration()) return { ok: false, reason: "expired" };
    await saveTokens(data);
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
      return { ok: false, reason: reasonFromError(err) };
    }
    throw err;
  }
}

async function ensureFreshAccessToken(): Promise<void> {
  const tokens = await loadTokens();
  if (!tokens || tokens.accessExpiresAt - Date.now() > REFRESH_SKEW_MS) return;
  const outcome = await refreshTokens();
  if (!outcome.ok) {
    reportAuthFailure(outcome.reason);
    throw new ApiError(
      outcome.reason === "blocked"
        ? "Your account has been suspended."
        : "Your session has expired. Please log in again.",
      outcome.reason === "blocked" ? 403 : 401,
      outcome.reason === "blocked" ? "ACCOUNT_BLOCKED" : "TOKEN_INVALID",
    );
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────────

export async function apiRequestWithMeta<T>(
  path: string,
  opts: RequestOptions = {},
): Promise<ApiResult<T>> {
  const useAuth = opts.auth ?? true;
  if (!useAuth) return send<T>(path, opts, undefined);

  await ensureFreshAccessToken();

  for (let attempt = 0; ; attempt++) {
    const usedToken = getTokens()?.accessToken;
    try {
      return await send<T>(path, opts, usedToken);
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;

      if (err.status === 403 && err.code === "ACCOUNT_BLOCKED") {
        reportAuthFailure("blocked");
        throw err;
      }
      if (err.status === 401 && err.code === "ACCOUNT_NOT_FOUND") {
        reportAuthFailure("not_found");
        throw err;
      }

      // Mobile routes (and swapped routes, for bearer callers) say TOKEN_INVALID; older
      // routes may return a bare 401 with no code — treated as "token rejected" unless
      // the caller opted into lenient mode for a route that's still cookie-only.
      const bare401CountsAsRejection = (opts.authMode ?? "strict") === "strict";
      const tokenRejected =
        err.status === 401 &&
        !!usedToken &&
        (err.code === "TOKEN_INVALID" || (err.code === null && bare401CountsAsRejection));

      if (tokenRejected && attempt === 0) {
        // Another request already refreshed while this one was in flight — just retry.
        const current = getTokens()?.accessToken;
        if (current && current !== usedToken) continue;
        const outcome = await refreshTokens();
        if (outcome.ok) continue;
        reportAuthFailure(outcome.reason);
        throw err;
      }
      if (tokenRejected) reportAuthFailure("expired");
      throw err;
    }
  }
}

export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { data } = await apiRequestWithMeta<T>(path, opts);
  return data;
}
