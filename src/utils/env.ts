// EXPO_PUBLIC_* vars are inlined at build time — they must be read with a static
// `process.env.EXPO_PUBLIC_X` expression (no destructuring / dynamic keys).
//
// Which values apply is tied to the EAS build profile (eas.json sets
// EXPO_PUBLIC_APP_VARIANT per profile; keys/URLs come from EAS environment variables).
// Development builds load their JS from the local Metro server, which reads `.env`.
//
//   development → Stripe TEST key, Google Pay testEnv, local API
//   preview     → Stripe TEST key, Google Pay testEnv, API from EAS env
//   production  → Stripe LIVE key, no testEnv, https://whaustralia.com

export type AppVariant = "development" | "preview" | "production";

const PRODUCTION_API_URL = "https://whaustralia.com";

/** Human-readable config problems. The root layout shows these instead of the app. */
export const configProblems: string[] = [];

function readVariant(raw: string | undefined): AppVariant {
  const value = raw?.trim() || "development";
  if (value === "development" || value === "preview" || value === "production") return value;
  configProblems.push(
    `EXPO_PUBLIC_APP_VARIANT is "${value}" — expected development, preview or production.`,
  );
  return "development";
}

const variant = readVariant(process.env.EXPO_PUBLIC_APP_VARIANT);
const isProduction = variant === "production";

function readApiUrl(raw: string | undefined): string {
  const url = raw?.trim().replace(/\/+$/, "") ?? "";
  if (!url) {
    configProblems.push(
      'EXPO_PUBLIC_API_URL is not set. Copy .env.example to .env (or set it for this EAS profile), then restart with "npx expo start --clear".',
    );
  } else if (isProduction && url !== PRODUCTION_API_URL) {
    configProblems.push(
      `Production builds must use ${PRODUCTION_API_URL} (EXPO_PUBLIC_API_URL is "${url}").`,
    );
  }
  return url;
}

function readStripeKey(raw: string | undefined): string {
  const key = raw?.trim() ?? "";
  if (!key) {
    configProblems.push(
      "EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set (use a pk_test_ key for development/preview, pk_live_ for production).",
    );
  } else if (!key.startsWith("pk_")) {
    configProblems.push(
      "EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY must be a Stripe *publishable* key (pk_…), never a secret key.",
    );
  } else if (isProduction && !key.startsWith("pk_live_")) {
    configProblems.push(
      "Production builds need a LIVE Stripe key (pk_live_…), but a test key is set.",
    );
  } else if (!isProduction && key.startsWith("pk_live_")) {
    configProblems.push(
      `This is a ${variant} build but EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY is a LIVE key (pk_live_…). Use a test key (pk_test_…).`,
    );
  }
  return key;
}

export const env = {
  variant,
  isProduction,
  apiUrl: readApiUrl(process.env.EXPO_PUBLIC_API_URL),
  stripe: {
    publishableKey: readStripeKey(process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY),
    /** Google Pay test environment — everything except production. */
    googlePayTestEnv: !isProduction,
    merchantDisplayName: "What's Happening Australia",
    merchantCountryCode: "AU",
    currencyCode: "AUD",
  },
  google: {
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() || undefined,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim() || undefined,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() || undefined,
  },
};
