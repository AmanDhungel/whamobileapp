import type * as GoogleSignInModule from "@react-native-google-signin/google-signin";
import { Platform } from "react-native";

import { env } from "@/utils/env";
import { isExpoGo } from "@/utils/runtime";

// Native Google Sign-In (@react-native-google-signin/google-signin). The module is
// loaded lazily: importing it in Expo Go — or in a dev build made before it was
// added — throws at startup, so everything here checks availability first.

type GoogleModule = typeof GoogleSignInModule;

/**
 * "available"     → ready to use
 * "expoGo"        → running in Expo Go (no native module)
 * "missingNative" → this build doesn't include the module (rebuild needed)
 * "notConfigured" → client IDs / iOS URL scheme not set for this build
 */
export type GoogleSignInAvailability = "available" | "expoGo" | "missingNative" | "notConfigured";

let loaded: GoogleModule | null | undefined;

function loadModule(): GoogleModule | null {
  if (loaded !== undefined) return loaded;
  if (isExpoGo) return (loaded = null);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    loaded = require("@react-native-google-signin/google-signin") as GoogleModule;
  } catch {
    loaded = null;
  }
  return loaded;
}

function isConfigured(): boolean {
  const { webClientId, iosClientId, iosUrlScheme } = env.google;
  // Android: the ID token's audience is the WEB client (the Android OAuth client is
  // only matched by package + SHA-1 in Google Cloud, never referenced here).
  if (Platform.OS === "ios") return !!webClientId && !!iosClientId && !!iosUrlScheme;
  return !!webClientId;
}

export function getGoogleSignInAvailability(): GoogleSignInAvailability {
  if (isExpoGo) return "expoGo";
  if (!isConfigured()) return "notConfigured";
  return loadModule() ? "available" : "missingNative";
}

let configured = false;

/** Call once at startup. No-op when Google sign-in isn't available in this build. */
export function configureGoogleSignIn(): void {
  if (configured || getGoogleSignInAvailability() !== "available") return;
  loadModule()?.GoogleSignin.configure({
    webClientId: env.google.webClientId,
    iosClientId: env.google.iosClientId,
  });
  configured = true;
}

/** A failure the user should see (cancellations never become one). */
export class GoogleSignInError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleSignInError";
  }
}

export type GoogleIdTokenResult =
  | { type: "success"; idToken: string }
  /** Closed the account picker, or a sign-in was already in progress. */
  | { type: "cancelled" };

const GENERIC_FAILURE = "Google sign-in failed. Please try again.";

/** Shows Google's account picker and returns the ID token for POST /auth/social. */
export async function getGoogleIdToken(): Promise<GoogleIdTokenResult> {
  const mod = loadModule();
  if (!mod || !configured) throw new GoogleSignInError(GENERIC_FAILURE);
  const { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } = mod;

  try {
    if (Platform.OS === "android") {
      // Prompts the user to install/update Play Services when it's missing or stale.
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return { type: "cancelled" };
    const { idToken } = response.data;
    if (!idToken)
      throw new GoogleSignInError("Google didn't return a sign-in token. Please try again.");
    return { type: "success", idToken };
  } catch (err) {
    if (err instanceof GoogleSignInError) throw err;
    if (isErrorWithCode(err)) {
      switch (err.code) {
        case statusCodes.SIGN_IN_CANCELLED:
        case statusCodes.IN_PROGRESS:
          return { type: "cancelled" };
        case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
          throw new GoogleSignInError(
            "Google Play Services is missing or out of date on this device. Update it from the Play Store, or log in with email.",
          );
      }
    }
    // e.g. Android DEVELOPER_ERROR (code 10): OAuth client / SHA-1 mismatch for this build.
    if (__DEV__) console.warn("[google] sign-in failed:", err);
    throw new GoogleSignInError(GENERIC_FAILURE);
  }
}

/** Forget the Google account on this device so the next sign-in shows the picker. */
export async function signOutOfGoogle(): Promise<void> {
  if (!configured) return;
  try {
    await loadModule()?.GoogleSignin.signOut();
  } catch {
    // Best effort — never blocks logging out of the app.
  }
}

/** Account deletion: revoke the app's Google grant, then sign out. */
export async function revokeGoogleAccess(): Promise<void> {
  if (!configured) return;
  try {
    await loadModule()?.GoogleSignin.revokeAccess();
  } catch {
    // Not signed in with Google on this device, or offline — nothing to revoke.
  }
  await signOutOfGoogle();
}
