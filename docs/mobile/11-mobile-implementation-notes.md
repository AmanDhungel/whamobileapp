# Mobile Implementation Notes

## Web → React Native mapping table

| Web | React Native / Expo |
|---|---|
| `<div>`, `<section>`, `<article>` | `View` |
| `<img>` / `next/image` | `expo-image` (`Image` from `expo-image` — supports the same three remote hosts already allowlisted in `next.config.ts`, no allowlist needed on RN) |
| `<p>`, `<span>`, `<h1-h6>` | `Text` (font weight/size come from the `theme.ts` typography scale in `01-design-system.md`) |
| `<button>` / shadcn `Button` | `Pressable` + `Text`, styled per `02-components.md` |
| `<input>` | `TextInput` |
| Tailwind CSS classes | `StyleSheet.create` (or `nativewind`, which lets the actual Tailwind class strings be reused almost verbatim — worth evaluating given how Tailwind-saturated this codebase is) |
| CSS `hover:` | no equivalent — use `Pressable`'s `onPressIn`/`onPressOut` for a pressed state instead |
| `:focus-visible` ring | RN has native focus handling on some platforms but no visual ring convention — usually dropped on mobile |
| `localStorage` (not used for auth here — see below) | `AsyncStorage` (`@react-native-async-storage/async-storage`) for non-sensitive prefs (e.g. selected city) |
| `sessionStorage` (used for the guest ticket receipt, `lib/guestReceipt.ts`) | no direct RN equivalent (no per-tab storage concept) — pass the payload directly as a navigation param, or a short-lived in-memory store, from the checkout success handler to the receipt screen |
| Auth session cookie (NextAuth) | `expo-secure-store` for access/refresh tokens — see `05-auth-and-user.md` |
| `window.location` / `next/navigation` (`useRouter`, `usePathname`) | `expo-router`'s `useRouter()`/`usePathname()` — near-identical API |
| `fetch` via `lib/action.ts` | Keep the same `Get/Post/PATCH/Delete` wrapper shape, swap `getHeaders()` to attach `Authorization: Bearer <token>` from secure storage instead of reading a cookie |
| `<a download>` (CSV/PDF export in the business dashboard) | no equivalent — build the file with `expo-print` (PDF) or plain string-building (CSV) into `expo-file-system`, then present it with `expo-sharing`'s `shareAsync()` (opens the OS share sheet — "Save to Files", "Share...", etc.) instead of a silent browser download |
| `window.print()` (Print Invoice action) | drop, or replace with "Share as PDF" via `expo-print` + `expo-sharing` |
| `navigator.share` (native share sheet on ticket detail) | `expo-sharing` — this one maps almost 1:1, both are "hand the OS a file/URL" |
| Canvas-rendered QR (`qrcode.react` + `toDataURL()`) | `react-native-qrcode-svg` (renders directly, no capture step needed) — see `08-integrations-and-third-party.md` |
| Leaflet map embed | `react-native-maps`, or keep the "open in Maps app" external-link pattern to avoid a native map SDK in v1 |
| Server Actions (`app/actions/*.tsx`) | **must become real REST endpoints** — RN cannot call a Next.js Server Action directly. See `12-mobile-gap-report.md`. |
| NextAuth `signIn()`/`useSession()` | replaced entirely by the mobile auth endpoints + a custom auth context/store (Zustand is already a project dependency — use it) wrapping `expo-secure-store` |
| Toast (`sonner`) | `react-native-toast-message` |
| Radix Dialog/Dropdown/Popover (hover- and portal-based) | bottom sheets / action sheets / RN `Modal` — see `02-components.md` per-component |

## Recommended libraries (Expo Go compatible unless noted)

- **Navigation**: `expo-router` (file-based, matches this project's own App Router
  mental model closely — easiest conceptual port).
- **Data fetching / server cache**: `@tanstack/react-query` (already the exact library
  this codebase uses — reuse the query-key and invalidation conventions directly).
- **Forms**: `react-hook-form` + `zod` (`@hookform/resolvers/zod`) — identical to web,
  works unmodified on RN.
- **State**: `zustand` (already a project dependency) for auth/session and the
  city-filter equivalent.
- **Icons**: `lucide-react-native`.
- **Styling**: plain `StyleSheet` + the `theme.ts` token object from
  `01-design-system.md`, or `nativewind` if the team wants to keep writing Tailwind
  class strings (recommended given how much of this codebase's styling is inline
  Tailwind utility classes — a straight port would otherwise mean rewriting every
  className by hand).
- **Secure storage**: `expo-secure-store`.
- **Non-sensitive storage**: `@react-native-async-storage/async-storage`.

## Features that cannot run in Expo Go (need a custom dev build / EAS Build)

- `@stripe/stripe-react-native` (native payment module — Expo Go has no native module
  support beyond what ships in the Expo Go binary itself).
- `react-native-maps` (native map views).
- Native QR/barcode scanning via `expo-camera`'s barcode API is actually **fine in
  Expo Go** (it's a first-party Expo module) — only flag true third-party native
  modules as dev-build-required.
- Any push-notification testing beyond Expo's own push service basics may need a dev
  build depending on the exact provider chosen (Expo's own push notification service
  works in Expo Go for basic testing; FCM/APNs direct integration does not).

## Suggested build order

1. **Auth** — implement the mobile auth endpoints (`12-mobile-gap-report.md`), the
   token storage/refresh flow, and the four auth screens. Nothing else in the app is
   usable without this.
2. **Read-only browse** — Home, Events list/detail, Business directory/detail, Deals
   list/detail — all public GET endpoints, no auth complexity, good early
   win to validate the API-consumption layer and design system end-to-end.
3. **Event ticket checkout** — the highest-value, most-recently-hardened flow on the
   web side. Requires the Server-Action-to-REST conversion (gap report) plus
   `PaymentSheet` integration (dev build).
4. **Activity / My Tickets** — ties auth + checkout together; straightforward once
   both exist.
5. **Favorites, Reviews, Notifications** — smaller, mostly-independent features.
6. **Bookings** — larger scope (availability, locks, the three capacity models in
   `06-features-and-business-logic.md`) and blocked on the open payment question — do
   this after confirming with the team whether/how bookings should be paid for
   in-app.
7. **Business/operator tooling** (Manage Event, dashboard, employee/resource
   scheduling, super-admin) — treat as a v2/separate-app decision; the web dashboard is
   desktop-oriented and heavy (wide tables, multi-step forms) and porting it faithfully
   is a substantial second project, not a natural extension of the consumer app.

## Environment variables the app will need

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_API_URL` | Base URL of the backend (production/staging/local) — new; nothing like this exists today since the website calls itself |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Mirrors `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| (Google Sign-In client IDs, iOS/Android, if `expo-auth-session`'s Google provider is used) | New — the web `GOOGLE_CLIENT_ID`/`SECRET` are for a web OAuth flow; native Google Sign-In typically needs its own platform-specific client IDs |
| (Google Maps API key, if `react-native-maps` is adopted on Android) | New — not present anywhere in the current web env |

No secret values are reproduced anywhere in this doc set — only variable names and
where they're used, per the task's own instruction.
