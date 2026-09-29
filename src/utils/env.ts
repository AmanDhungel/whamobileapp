// EXPO_PUBLIC_* vars are inlined at build time — they must be read with a static
// `process.env.EXPO_PUBLIC_X` expression (no destructuring / dynamic keys).

function required(value: string | undefined, name: string): string {
  if (!value || !value.trim()) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env, set it, then restart with "npx expo start --clear".`,
    );
  }
  return value.trim();
}

export const env = {
  apiUrl: required(process.env.EXPO_PUBLIC_API_URL, "EXPO_PUBLIC_API_URL").replace(/\/+$/, ""),
  google: {
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() || undefined,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim() || undefined,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() || undefined,
  },
};
