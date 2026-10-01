import type { ConfigContext, ExpoConfig } from "expo/config";

// app.json holds the static config; this adds what has to come from the environment
// at build time: local .env for `expo start` / local builds, EAS environment
// variables (per profile) for cloud builds.

/** Reversed iOS client ID, "com.googleusercontent.apps.…". */
const googleIosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_REVERSED_CLIENT_ID?.trim();

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  plugins: [
    ...(config.plugins ?? []),
    // Native Google Sign-In: iOS needs the URL scheme; Android needs no plugin options
    // (autolinked; its OAuth client is matched by package + SHA-1). Without a scheme the
    // plugin is left out — the plugin throws on a missing one — and the app shows Google
    // sign-in as not set up on iOS.
    ...(googleIosUrlScheme
      ? [
          ["@react-native-google-signin/google-signin", { iosUrlScheme: googleIosUrlScheme }] as [
            string,
            unknown,
          ],
        ]
      : []),
    // Google Maps on Android (iOS uses Apple Maps — no key).
    [
      "react-native-maps",
      { androidGoogleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY ?? "" },
    ],
  ],
});
