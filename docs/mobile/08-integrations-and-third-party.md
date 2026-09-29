# Integrations and Third-Party Services

## Payments — Stripe

- **Event tickets**: embedded Stripe **PaymentElement** (`@stripe/react-stripe-js`),
  `layout: "tabs"` (Card + Apple Pay tabs), confirmed client-side with
  `stripe.confirmPayment({elements, redirect: "if_required"})`. The PaymentIntent is
  created/updated by a **Server Action** (`getEventTicketPaymentIntent` in
  `app/actions/eventTicketStripe.tsx`), not a REST route — see the gap report for why
  this blocks the app and the proposed fix. PaymentIntent metadata carries `eventId`,
  a JSON-encoded `items` array, `promoCode`, and `invoiceNumber`, which the finalize
  route reads back rather than trusting the request body.
- **Bookings**: a separate, apparently-unused hosted-Checkout path
  (`app/api/checkout-session/route.ts` + `app/api/webhooks/stripe/route.ts`) — see the
  "likely dead code" flag in `04-api-reference.md`. The live booking path does not
  charge via Stripe at all currently.
- **Env vars**: `STRIPE_SECRET_KEY` (server), `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  (client), `STRIPE_WEBHOOK_SECRET` (webhook signature verification).
- **Expo replacement**: `@stripe/stripe-react-native` — its `PaymentSheet` is the
  direct native equivalent of `PaymentElement` and supports Apple Pay/Google Pay
  natively; it needs the *same* `client_secret` this backend already produces, so no
  backend payment-logic changes are required beyond exposing the Server Action as a
  real endpoint (see `12-mobile-gap-report.md`). **Requires a custom dev build** —
  `@stripe/stripe-react-native` is a native module and does not run in Expo Go.

## File storage — AWS S3

- Bucket `wha-sunya-my-uploads`, region `ap-southeast-2` (Sydney) — `next.config.ts:11-15`.
- Uploaded via `@aws-sdk/client-s3` + `@aws-sdk/lib-storage`, server-side only
  (`server/lib/function.ts:uploadToS3`), from `multipart/form-data` request bodies —
  the client never talks to S3 directly (no presigned-URL pattern observed; every
  upload goes browser → Next.js API route → S3). This **does** work from React Native
  as-is: build the same `FormData` with a `{uri,name,type}` file entry and POST it to
  the same route — no new backend work needed for uploads specifically. Env vars:
  `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_BUCKET_NAME`.
- Expo tooling: `expo-image-picker` (camera roll / camera) and/or
  `expo-document-picker`, both Expo-Go-compatible.

## Maps — Leaflet / OpenStreetMap

- `leaflet` + `react-leaflet`, tiles from the public OSM tile server (no Google Maps
  API key found in env vars) — used for venue location display (e.g.
  `components/Event/SingleEventPage.tsx`). "View map" links elsewhere just open a
  `google.com/maps/search` URL rather than embedding Google Maps.
- **Expo replacement**: `react-native-maps` (Apple Maps on iOS, Google Maps on
  Android — the latter needs a Google Maps API key configured in `app.json`/EAS,
  which this project doesn't currently have) — needs a **custom dev build**, not Expo
  Go. Alternative for a lighter first pass: keep the "open in Google/Apple Maps"
  external-link pattern already used for the "View map" links, avoiding an in-app map
  SDK entirely for v1.

## Email — Nodemailer + Mailtrap

- `lib/mail.ts` sends transactional email (signup verification codes, password reset
  codes, "verify your email" links, ticket/invoice confirmations, booking
  confirmations) via `nodemailer` configured against Mailtrap SMTP. Env vars:
  `MAILTRAP_USER`, `MAILTRAP_PASS`, `SMTP_HOST`, `SMTP_PORT`, `MAIL_MAILER`,
  `MAIL_ENCRYPTION`, `MAIL_TOKEN`. ⚠️ UNVERIFIED whether Mailtrap is used as a
  sandbox/testing relay only or the real production sender — Mailtrap's own product is
  primarily an email-testing tool, so confirm with the team before assuming production
  email actually reaches real inboxes. Nothing here is mobile-specific — emails (ticket
  confirmations, password reset codes) work identically regardless of what client
  triggered them.

## Rate limiting — Upstash Redis

- `proxy.ts` (Next 16's root middleware-equivalent file) rate-limits **every**
  `/api/*` request to **20 requests / 10 seconds per client IP**
  (`Ratelimit.slidingWindow(20, "10 s")`), based on `x-forwarded-for`/`x-real-ip`.
  Returns HTTP 429 `{success:false, error:"Too many requests. Please slow down."}` when
  exceeded. A second, unused-looking rate limiter (`lib/ratelimit.ts`, 10 req/10s) also
  exists — ⚠️ UNVERIFIED whether anything actually imports it; `proxy.ts` has its own
  separate `Ratelimit` instance.
  **Mobile implication**: many devices on the same NAT/carrier IP (common on mobile
  networks, especially in shared/corporate wifi or carrier-grade NAT) could collide
  against the same 20-req/10s budget. Flagged in `12-mobile-gap-report.md`.
  Env vars: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.

## QR codes

- **Generation** (buyer side): `qrcode.react`'s `<QRCodeCanvas>` renders a QR image to
  an actual DOM `<canvas>`; PDF export then reads it back via `canvas.toDataURL()`.
  This DOM-dependent "render then screenshot" approach has **no direct RN
  equivalent** — RN has no canvas/DOM. Use a library that can produce QR image data
  directly, e.g. `react-native-qrcode-svg` (renders as SVG, can export via
  `react-native-view-shot` if a raster image is needed for a PDF) or generate the QR
  as a data URL server-side (e.g. via the `qrcode` npm package, which this project does
  **not** currently depend on — only `qrcode.react` is installed) and simply serve the
  image URL/base64 to the client, avoiding on-device QR rendering-for-capture entirely.
- **Scanning** (business side): `@yudiel/react-qr-scanner` (a web camera-based
  scanner). RN equivalent: `expo-camera`'s barcode scanning API (`CameraView` with
  `barcodeScannerSettings`), which **is** Expo-Go-compatible.

## Analytics / tracking

No analytics or tracking pixel library (no Segment, Mixpanel, GA4, Meta Pixel, etc.)
was found in `package.json`. ❓ OPEN QUESTION for the team: does the mobile app need
analytics from day one, and if so which provider (Expo has first-party support for a
few via EAS).

## PDF generation

`jspdf` + `jspdf-autotable` — used for tickets, invoices, and the business-side sales
report (CSV + PDF). This is a **browser-only** library (builds a PDF client-side and
triggers a `Blob` download). RN equivalent: generate PDFs the same way isn't directly
portable; use either `expo-print` (HTML → PDF, good for invoices/reports built from a
template string) or a native PDF library, then save/share via `expo-file-system` +
`expo-sharing` (see `11-mobile-implementation-notes.md`) instead of the web's
`<a download>` pattern, which does not exist on RN.

## Push notifications

Not implemented anywhere in this codebase (no APNs/FCM/OneSignal/Expo-notifications
integration found; the in-app `Notification` model — `server/models/Notification.model.ts`
— is an in-app notification feed, not a push mechanism). This is new backend work for
mobile — see `12-mobile-gap-report.md`'s push-token endpoint proposal.

## Other libraries with no RN equivalent to note

- `framer-motion` (web animation) → `react-native-reanimated` + `moti` (built on
  reanimated) is the closest DX-equivalent for RN.
- `embla-carousel-react` (used by the shadcn `Carousel`) → RN `FlatList`
  horizontal/paging or `react-native-reanimated-carousel`.
- `cmdk` (command palette) → no RN equivalent needed; command palettes aren't a mobile
  pattern.
- `vaul` (drawer) → `@gorhom/bottom-sheet`.
