import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";

import { env } from "@/utils/env";

WebBrowser.maybeCompleteAuthSession();

/**
 * True when the OAuth client id for the current platform is set. The
 * expo-auth-session Google hook throws without one, so it must only be mounted
 * when this is true (see GoogleButton).
 */
export function isGoogleSignInConfigured(): boolean {
  const { iosClientId, androidClientId, webClientId } = env.google;
  if (Platform.OS === "ios") return !!iosClientId;
  if (Platform.OS === "android") return !!androidClientId;
  return !!webClientId;
}

/**
 * Obtains a Google ID token on-device; the caller exchanges it via POST
 * /auth/social. NOTE: Expo now recommends a native Google Sign-In library for this,
 * which needs a development build (not Expo Go). This hook is the swap point —
 * replace its body with the native library later; the rest of the flow is unchanged.
 */
export function useGoogleIdToken(
  onIdToken: (idToken: string) => void,
  onError: (message: string) => void,
) {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: env.google.iosClientId,
    androidClientId: env.google.androidClientId,
    webClientId: env.google.webClientId,
    selectAccount: true,
  });

  // Keep the latest callbacks without re-running the effect on every render.
  const handlers = useRef({ onIdToken, onError });
  useEffect(() => {
    handlers.current = { onIdToken, onError };
  });

  useEffect(() => {
    if (!response) return;
    if (response.type === "success") {
      const idToken = response.params.id_token ?? response.authentication?.idToken;
      if (idToken) handlers.current.onIdToken(idToken);
      else handlers.current.onError("Google didn't return a sign-in token. Please try again.");
    } else if (response.type === "error") {
      handlers.current.onError(
        response.error?.message ?? "Google sign-in failed. Please try again.",
      );
    }
    // "cancel" / "dismiss": the user closed the sheet — nothing to report.
  }, [response]);

  return { ready: !!request, prompt: () => promptAsync() };
}
