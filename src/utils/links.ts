import * as WebBrowser from "expo-web-browser";

/** The public website — always the production site, even when the API points elsewhere. */
export const WEBSITE_URL = "https://whaustralia.com";

// Legal pages are linked, not duplicated, so legal copy updates never need an app
// release (docs/mobile/09-content-and-copy.md). Routes per 03-screens.md.
export const legalLinks = {
  privacy: `${WEBSITE_URL}/privacy-policy`,
  termsOfService: `${WEBSITE_URL}/terms-of-service`,
  termsOfBusiness: `${WEBSITE_URL}/terms-and-conditions`,
} as const;

/** Shareable web URLs for app content (same paths as the website). */
export const webUrls = {
  event: (slug: string) => `${WEBSITE_URL}/events/${slug}`,
  business: (slug: string) => `${WEBSITE_URL}/businesses/${slug}`,
  deal: (id: string) => `${WEBSITE_URL}/deals/${id}`,
};

export function openInAppBrowser(url: string) {
  return WebBrowser.openBrowserAsync(url);
}
