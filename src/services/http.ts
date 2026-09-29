import Constants from "expo-constants";

// Identity sent to third-party providers (OpenStreetMap requires a descriptive
// User-Agent with contact details — https://operations.osmfoundation.org/policies/).
const APP_NAME = "WHAustraliaApp";
const APP_VERSION = Constants.expoConfig?.version ?? "0.0.0";
const CONTACT = "info@whatshappeningaustralia.com";

export const PROVIDER_USER_AGENT = `${APP_NAME}/${APP_VERSION} (+https://whaustralia.com; ${CONTACT})`;

export const providerHeaders: Record<string, string> = {
  "User-Agent": PROVIDER_USER_AGENT,
  "Accept-Language": "en",
};
