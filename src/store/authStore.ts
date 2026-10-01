import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

import * as authApi from "@/api/auth";
import { setAuthFailureHandler, type AuthFailureReason } from "@/api/client";
import { ApiError } from "@/api/errors";
import { queryClient } from "@/api/queryClient";
import { queryKeys } from "@/api/queryKeys";
import {
  clearSession,
  getTokens,
  loadCachedUser,
  loadTokens,
  saveCachedUser,
  saveTokens,
} from "@/api/tokenStorage";
import type { AccountCategory, AuthSession, AuthUser } from "@/api/types";
import { showToast } from "@/components/Toast";
import { clearApiCookies } from "@/services/cookies";
import { signOutOfGoogle } from "@/services/googleSignIn";

// Removed in Phase B (guest browsing is no longer a mode — browsing is public).
// Cleaned up on restore for installs that still have it.
const LEGACY_GUEST_KEY = "wha.isGuest";

export type AuthStatus = "loading" | "signedIn" | "signedOut";

/** Which area of the app the current state belongs in. */
export type AccountArea = "public" | "customer" | "business";

/** Business and super-admin accounts use the business area (never the customer tabs). */
export function isBusinessCategory(category?: AccountCategory | null): boolean {
  return category === "business" || category === "super-admin";
}

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;

  /** App start: load tokens from secure storage and validate them with GET /me. */
  restore: () => Promise<void>;
  signIn: (session: AuthSession) => Promise<void>;
  /** Re-fetch the current user (e.g. after a profile edit, or pull-to-refresh). */
  refreshUser: () => Promise<void>;
  /** User-initiated logout: revokes the refresh token server-side (best effort). */
  logout: () => Promise<void>;
  /** Drops the local session without calling the API (after delete / forced logout). */
  clearLocalSession: () => Promise<void>;
}

const FORCED_LOGOUT_MESSAGES: Record<AuthFailureReason, string> = {
  expired: "Your session has expired. Please log in again.",
  blocked: "Your account has been suspended.",
  not_found: "Your account is no longer available. Please log in again.",
};

/** Queries holding the signed-in user's own data — dropped on logout. */
const PRIVATE_QUERY_KEYS = [queryKeys.favorites, queryKeys.tickets, queryKeys.registrations];

function dropPrivateQueries() {
  for (const queryKey of PRIVATE_QUERY_KEYS) queryClient.removeQueries({ queryKey });
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  status: "loading",
  user: null,

  restore: async () => {
    AsyncStorage.removeItem(LEGACY_GUEST_KEY).catch(() => undefined);
    const tokens = await loadTokens();
    if (!tokens) {
      set({ status: "signedOut", user: null });
      return;
    }

    // The cached user (with its category) decides the area immediately; /me re-checks.
    const cachedUser = await loadCachedUser();
    // Mark signed-in first so a 401/403 during /me goes through the forced-logout path.
    set({ status: "signedIn", user: cachedUser });

    try {
      const { user } = await authApi.getMe();
      await saveCachedUser(user);
      if (get().status === "signedIn") set({ user });
    } catch (err) {
      // Auth rejections were already handled by the failure handler (→ signedOut).
      // Offline / server errors: stay signed in with the cached user.
      if (!(err instanceof ApiError)) throw err;
    }
  },

  signIn: async (session) => {
    await saveTokens(session);
    await saveCachedUser(session.user);
    dropPrivateQueries();
    set({ status: "signedIn", user: session.user });
  },

  refreshUser: async () => {
    const { user } = await authApi.getMe();
    await saveCachedUser(user);
    if (get().status === "signedIn") set({ user });
  },

  logout: async () => {
    const refreshToken = getTokens()?.refreshToken;
    await get().clearLocalSession();
    if (refreshToken) {
      // Best effort — the local session is already gone either way.
      authApi.logout({ refreshToken }).catch(() => undefined);
    }
  },

  clearLocalSession: async () => {
    await clearSession();
    await clearApiCookies();
    // Forget the Google account too, so the next Google sign-in shows the account
    // picker. Covers logout, forced logout and account deletion; no-op otherwise.
    await signOutOfGoogle();
    dropPrivateQueries();
    set({ status: "signedOut", user: null });
  },
}));

/** "public" (logged out), "customer" or "business". */
export function useAccountArea(): AccountArea {
  return useAuthStore((s) =>
    s.status !== "signedIn"
      ? "public"
      : isBusinessCategory(s.user?.category)
        ? "business"
        : "customer",
  );
}

/** True only for a signed-in customer (favourites, reviews, tickets, profile). */
export function useIsCustomer(): boolean {
  return useAccountArea() === "customer";
}

// Called by the API client on refresh failure / ACCOUNT_BLOCKED / ACCOUNT_NOT_FOUND.
setAuthFailureHandler((reason) => {
  const { status, clearLocalSession } = useAuthStore.getState();
  if (status !== "signedIn") return; // several requests can fail at once — act once
  void clearLocalSession();
  showToast({
    type: reason === "expired" ? "info" : "error",
    message: FORCED_LOGOUT_MESSAGES[reason],
  });
});
