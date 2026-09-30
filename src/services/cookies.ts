import * as ReactNative from "react-native";

/**
 * Cookie hygiene. The app authenticates with bearer tokens only, but some backend
 * routes set a website (NextAuth) session cookie — notably POST /api/event/ticket/purchase
 * for new guest buyers. The backend reads that cookie BEFORE the bearer token, so a
 * stored cookie would silently switch identity. Requests already use
 * `credentials: "omit"`, but RN's native networking may still store Set-Cookie, so we
 * also clear the native cookie jar after /purchase and on logout.
 *
 * Uses React Native's own networking module (`Networking.clearCookies`, a core
 * TurboModule on iOS + Android) — New-Architecture safe and available in Expo Go too.
 * (@react-native-cookies/cookies was dropped: unmaintained, no New Architecture support.)
 * `Networking` is exported by react-native at runtime but missing from its TS types.
 */
type NetworkingModule = { clearCookies?: (callback: (cleared: boolean) => void) => void };

function networking(): NetworkingModule | undefined {
  return (ReactNative as unknown as { Networking?: NetworkingModule }).Networking;
}

/** Clears every cookie in the native HTTP cookie jar (the app needs none). Never throws. */
export function clearApiCookies(): Promise<void> {
  return new Promise((resolve) => {
    try {
      const clear = networking()?.clearCookies;
      if (!clear) return resolve();
      clear(() => resolve());
    } catch {
      // Best effort — `credentials: "omit"` is the first line of defence.
      resolve();
    }
  });
}
