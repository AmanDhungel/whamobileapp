# WHA Mobile App — Build Specification

## What this business does

"What's Happening Australia" (WHA) is a multi-vertical local-business marketplace and
events platform for the Australian community. Based on the code, it serves:

- **Events** — free ("registration") and paid ticketed events, with QR-code tickets,
  Stripe checkout, promo codes, guest (no-account) checkout, and business-side scanning/
  redemption. See `server/models/Event.model.ts`, `server/models/EventTicketPurchase.model.ts`.
- **Deals** — coupon-style discount codes businesses publish, redeemed in person via a
  unique code. See `server/models/DealSchema.model.ts`, `server/models/CouponCodeRedemtion.model.ts`.
- **Service bookings** — appointment scheduling for businesses (e.g. salons), with
  employees, resources (inventory-style bookable capacity), shifts, time-off, and a
  booking-lock + payment flow. See `server/models/Booking.model.ts`, `Employee.model.ts`,
  `Service.model.ts`, `BookingLock.model.ts`.
- **Business directory** — businesses can be found/searched by category, service,
  city, community, or geo-radius, with reviews.
- **Community org features** — a `sanatansamaj` vertical (donations, membership,
  community events) — `app/api/sanatansamaj/*`.
- **A super-admin panel** — for platform operators to manage businesses, users, events,
  deals, and sponsorships.

All three account "categories" (`user`, `business`, `super-admin`) live in one
`Auth.model.ts` collection, distinguished by a `category` field.

## Tech stack summary (website)

| Layer | Technology | Evidence |
|---|---|---|
| Framework | Next.js 16.1.6, App Router | `package.json:39`, `app/` directory structure |
| Rendering | Almost entirely client-rendered. Pages are thin server components that render a `"use client"` component which fetches its own data via TanStack Query. No `getServerSideProps`/`getStaticProps` (Pages Router APIs) found; no significant use of React Server Component data-fetching for page content. | Every `app/**/page.tsx` sampled renders a single client component; see `03-screens.md` |
| Language | TypeScript | throughout |
| Styling | Tailwind CSS v4 (CSS-first config, no `tailwind.config.js`), CSS custom properties in `app/globals.css`, shadcn/ui (Radix primitives) component library | `app/globals.css`, `components/ui/*` |
| State (server) | TanStack React Query v5 (`@tanstack/react-query`) via a shared `useFetcher`/`useMutator` wrapper | `lib/generic.service.tsx` |
| State (client/global) | Zustand (`zustand` dep present); React Context for a city filter (`contexts/city-filter-context.tsx`) and an auth-modal open state | `package.json:64`, grep |
| Forms | react-hook-form + zod resolvers | `package.json:14,74`, e.g. `components/Dashboard/Events/EventsForm.tsx` |
| Data fetching | Custom `fetch`-based helpers (`Get`/`Post`/`PATCH`/`Delete` in `lib/action.ts`), NOT axios/SWR/GraphQL, called from one `services/*.service.ts` file per domain | `lib/action.ts` |
| Auth | NextAuth v4.24.13, JWT session strategy, Google OAuth + two Credentials providers (`user-credentials`, `business-credentials`) | `app/api/auth/[...nextauth]/route.ts` |
| Backend | Same Next.js app — 107 route handlers under `app/api/**/route.ts` talking directly to MongoDB via Mongoose | `server/models/*.ts` |
| Database | MongoDB via Mongoose 9.1.5, one connection helper | `lib/db.ts` |
| Payments | Stripe (`stripe`, `@stripe/react-stripe-js`, `@stripe/stripe-js`) — embedded PaymentElement for event tickets; a separate `checkout-session` route for hosted Stripe Checkout (bookings) | `app/actions/eventTicketStripe.tsx`, `app/api/checkout-session/route.ts` |
| File storage | AWS S3 (`@aws-sdk/client-s3`, bucket `wha-sunya-my-uploads`, region `ap-southeast-2`) | `next.config.ts:13`, `server/lib/function.ts` |
| Email | Nodemailer + Mailtrap | `package.json:44,45`, `lib/mail.ts` |
| Rate limiting | Upstash Redis + `@upstash/ratelimit`, applied globally to all `/api/*` via `proxy.ts` (Next.js 16's middleware-equivalent convention): 20 req / 10s per client IP | `proxy.ts` |
| Maps | Leaflet + react-leaflet (OpenStreetMap tiles, no Google Maps API key found) | `package.json:38,41`, e.g. `components/Event/SingleEventPage.tsx` |
| PDF/QR | jsPDF + jspdf-autotable (tickets, invoices, reports), qrcode.react (QR generation), `@yudiel/react-qr-scanner` (business-side scanning) | `package.json` |

## API base URL(s) and environments

There is **one** base URL: the site itself. The frontend calls **relative paths**
(e.g. `/api/event`) via `fetch`, so the "base URL" is always whatever origin the page
is served from — there is no separate API host and no `NEXT_PUBLIC_API_URL`-style
variable.

- **Production**: defined by `NEXTAUTH_URL` (env var, value not read/copied here) — this
  is also what NextAuth uses to decide whether to set a `__Secure-` prefixed cookie.
  `NEXT_PUBLIC_APP_URL` also exists as a second env var; ⚠️ UNVERIFIED exactly which
  one is canonical for building absolute links (e.g. in emails) — both are referenced
  in different places; see `99-open-questions.md`.
- **Local/dev**: `next dev`, default `http://localhost:3000`.
- **Staging**: ❓ OPEN QUESTION — no staging-specific config or env file found in the repo.

For the mobile app, the single most important consequence is: **the app must be given
an explicit, configurable base URL** (e.g. `EXPO_PUBLIC_API_URL`) since nothing in this
codebase currently supports being called from a different origin. See
`11-mobile-implementation-notes.md` and the CORS gap in `12-mobile-gap-report.md`.

## Index

| File | Contents |
|---|---|
| [01-design-system.md](01-design-system.md) | Colors, typography, spacing, radius, shadows, icons, breakpoints, animations, RN `theme.ts` |
| [02-components.md](02-components.md) | Reusable UI component catalog with RN equivalents |
| [03-screens.md](03-screens.md) | Full sitemap + per-screen breakdown |
| [04-api-reference.md](04-api-reference.md) | Every endpoint: method, path, auth, request/response types, mobile-compatibility flags |
| [05-auth-and-user.md](05-auth-and-user.md) | Login/signup/reset/verify flows, session mechanics, protected routes |
| [06-features-and-business-logic.md](06-features-and-business-logic.md) | Ticketing, holds, pricing, bookings, deals — end-to-end logic |
| [07-forms-and-validation.md](07-forms-and-validation.md) | Every form's fields, validation, error text |
| [08-integrations-and-third-party.md](08-integrations-and-third-party.md) | Stripe, S3, maps, email, rate limiting, QR — with Expo notes |
| [09-content-and-copy.md](09-content-and-copy.md) | Static text inventory |
| [10-navigation-map.md](10-navigation-map.md) | Site nav structure + proposed app navigation tree |
| [11-mobile-implementation-notes.md](11-mobile-implementation-notes.md) | Web→RN mapping, libraries, Expo Go limits, build order |
| [12-mobile-gap-report.md](12-mobile-gap-report.md) | The backend work needed before the app can function — also posted to chat |
| [99-open-questions.md](99-open-questions.md) | Every unverified fact / open question, by priority |

## How to use these docs to build the app

1. Start with **12-mobile-gap-report.md** — it tells you which endpoints don't exist
   yet and must be built first (mobile auth being the blocker). Don't start UI work
   against endpoints that are flagged 🔴 blocker until they exist.
2. Read **05-auth-and-user.md** and implement the auth flow first — almost everything
   else is session-gated.
3. Use **10-navigation-map.md** to scaffold the Expo Router file tree, then
   **03-screens.md** per screen for what to build and **04-api-reference.md** for what
   to call.
4. Use **01-design-system.md**'s `theme.ts` block directly; use **02-components.md**
   for what each reusable piece needs to do and its suggested RN primitive.
5. Cross-check business rules (pricing, discounts, holds, GST/surcharge math) against
   **06-features-and-business-logic.md** before reimplementing them — several of these
   are non-obvious and must match the backend exactly (e.g. the backend always
   re-derives prices server-side and will reject a mismatched amount).
6. Whenever a doc says `⚠️ UNVERIFIED` or `❓ OPEN QUESTION`, do not guess — it's
   listed with priority in **99-open-questions.md**; resolve it (ask, or read the cited
   file yourself) before building on top of it.
