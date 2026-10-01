import type { ConfigContext, ExpoConfig } from "expo/config";

// app.json holds the static config; this adds what has to come from the environment
// at build time. EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY: local .env for `expo start`,
// EAS environment variables (per profile) for cloud builds.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  plugins: [
    ...(config.plugins ?? []),
    // Google Maps on Android (iOS uses Apple Maps — no key).
    [
      "react-native-maps",
      { androidGoogleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY ?? "" },
    ],
  ],
});
