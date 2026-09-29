# Mobile Readiness Gap Report

This is the input for the next task: adding new backend endpoints/changes so the React
Native app can work. No code was changed to produce this report — analysis only.

## 1. Authentication (the blocker)

**Current state**: NextAuth v4.24.13, config at `app/api/auth/[...nextauth]/route.ts`.

- **Providers**: `google` (OAuth), `user-credentials` and `business-credentials`
  (email+password, two separate Credentials providers scoping by `category`).
- **Session strategy**: JWT (`session: {strategy: "jwt"}`), no database session
  adapter wired in despite `@auth/prisma-adapter` being a dependency.
- **Token contents**: `mongodbId, googleId, category, business_name, image, city_name,
community_name, emailVerified, isblocked, verified, location, phone_number,
business_type` (`route.ts:133-176`) — re-hydrated from MongoDB on every refresh where
  `user` isn't freshly provided, so profile edits propagate without re-login.
- **Cookie**: `next-auth.session-token` / `__Secure-next-auth.session-token`,
  `secret: process.env.NEXT_AUTH_SECRET!`.
- **Password storage**: bcryptjs, hash cost 12 at signup / 10 at reset, verified with
  `bcrypt.compare`. `password` is conditionally required only when
  `provider === "credentials"` (Google/guest accounts have none).
- **How protected routes check session today**: **per-route**, not centrally — 65 of
  107 API route handlers individually call `getServerSession(authOptions)` and check
  `session?.user` (or a specific `category`). There is **no root `middleware.ts`**
  doing this centrally (the only root-level file, `proxy.ts`, does IP rate limiting,
  not auth). Page-level redirects (`/dashboard` → `/auth` if logged out) are enforced
  entirely **client-side** by `components/Auth/SessionWrapper.tsx`'s `AuthGuard` —
  a UX nicety, not a security boundary; the real boundary is each API route's own check.
- **The actual blocker**: there is **no bearer-token mechanism anywhere**. A vestigial
  `getHeaders()` helper (`lib/http.utilis.ts`) checks for a cookie named `user_token`
  and would attach `Authorization: Bearer <that cookie>` if found — but nothing in the
  entire codebase ever sets a `user_token` cookie (confirmed via a full-repo grep). It
  is dead code. Every session check today is **cookie-only**, which a React Native app
  cannot use (no shared cookie jar with a browser session, no same-origin concept).

### Proposed mobile auth design

New namespace, `/api/mobile/auth/*`, reusing the **existing** `User` model, bcrypt
logic, and `EmailVerification` collection — no duplicated business rules:

| Endpoint                           | Method | Request                                                                                                               | Response                                                                                                                                                                                                                 |
| ---------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/api/mobile/auth/login`           | POST   | `{ email, password, category: "user"\|"business" }`                                                                   | `{ accessToken, refreshToken, expiresIn, user: {...same shape as session.user today} }`                                                                                                                                  |
| `/api/mobile/auth/register`        | POST   | same fields as the existing web signup `FormData` (see `05-auth-and-user.md`), as `multipart/form-data` for the image | `{ accessToken, refreshToken, expiresIn, user }`                                                                                                                                                                         |
| `/api/mobile/auth/refresh`         | POST   | `{ refreshToken }`                                                                                                    | `{ accessToken, expiresIn }`                                                                                                                                                                                             |
| `/api/mobile/auth/logout`          | POST   | `{ refreshToken }` (bearer access token in header)                                                                    | `{ success: true }` — invalidate the refresh token server-side                                                                                                                                                           |
| `/api/mobile/auth/forgot-password` | POST   | `{ email }`                                                                                                           | `{ message }` (reuses the existing 6-digit-code logic)                                                                                                                                                                   |
| `/api/mobile/auth/reset-password`  | POST   | `{ email, code, password }`                                                                                           | `{ message }`                                                                                                                                                                                                            |
| `/api/mobile/auth/social`          | POST   | `{ idToken, provider: "google" }`                                                                                     | `{ accessToken, refreshToken, expiresIn, user }` — verifies the ID token server-side against Google, then runs the exact same find-or-create logic as `authOptions.callbacks.signIn`'s Google branch (`route.ts:82-124`) |
| `/api/mobile/me`                   | GET    | bearer token                                                                                                          | `{ user }` — mirrors what `useSession()` exposes today                                                                                                                                                                   |

**Token design**: short-lived access token (JWT, ~15-30 min, signed with the existing
`NEXT_AUTH_SECRET` or a dedicated `MOBILE_JWT_SECRET` if the team prefers isolating
blast radius) + a longer-lived refresh token (~30 days, matching the
`SESSION_MAX_AGE = 30 * 24 * 60 * 60` constant already used for guest auto-login in
`server/lib/guestAuth.ts:5`). Store both with `expo-secure-store` on-device, never
`AsyncStorage`.

**Shared auth helper** (the mechanical-but-important part): add a
`getAuthUser(req)` helper that tries `getServerSession(authOptions)` first (web). Falls
back to verifying an `Authorization: Bearer` header (mobile) - then swap every one of
those 65 `getServerSession(authOptions)` call sites to use it instead. This is
low-risk (purely additive to existing checks) but touches many files — sequence it
route-by-route, starting with the ones the mobile v1 scope actually needs (see
implementation order below), not all 65 at once.

**Do not**: change `authOptions` itself, change the web cookie/session behavior, or
require the web app to adopt bearer tokens — the two systems should coexist
permanently, not converge.

## 2. Data with no API (Server Components / Server Actions / direct DB calls)

- **`getEventTicketPaymentIntent`** (`app/actions/eventTicketStripe.tsx`) — a Next.js
  **Server Action**, callable from the web client via a hidden RSC protocol, but
  **not reachable over plain HTTP from React Native**. This is the function that
  prices a cart, applies promo codes, creates/updates the Stripe PaymentIntent, and
  returns the client secret — i.e. it's on the critical path for the single most
  important consumer transaction in the app. **Fix**: wrap its existing logic in a real
  `POST /api/mobile/event/ticket/price` (or promote it to a shared route both the
  Server Action and a new REST route call) — method: POST, request
  `{ eventId, items:[{optionId,quantity}], promoCode?, previousPaymentIntentId? }`,
  response identical to what the Server Action already returns
  (`{clientSecret, paymentIntentId, invoiceNumber, items, ticketTotal, serviceFee,
surcharge, totalToPay, promoApplied}`). Priority: 🔴 blocker (checkout doesn't work
  at all without it). Effort: S (the logic already exists, this is a thin wrapper).
- No other Server Components/`getServerSideProps`/direct-DB-in-page patterns were found
  — this codebase is unusually consistent about routing all data through
  `app/api/**/route.ts`, which is good news for the mobile port generally.

## 3. Cookie / session / CSRF dependencies outside auth

- None found beyond the auth cookie itself. No cart-in-cookie pattern, no separate
  CSRF token scheme on forms (NextAuth's Credentials provider has its own internal CSRF
  handling for the web sign-in POST, which mobile bypasses entirely by using the new
  bearer-token login endpoint instead).
- The **ticket-hold release mechanism** (`POST /api/event/ticket/hold/release`) uses
  the `paymentIntentId` itself as a bearer secret rather than requiring a session —
  this already works identically for both web and mobile, no change needed.

## 4. Web-only responses (HTML/redirects instead of JSON)

- None found — every route read returns JSON via `NextResponse.json(...)`. The Stripe
  webhook (`app/api/webhooks/stripe/route.ts`) returns JSON too and isn't app-facing
  anyway (Stripe calls it directly).

## 5. Middleware and security rules that could block the app

- **Global IP rate limit**: `proxy.ts` limits **every** `/api/*` call to 20
  requests/10 seconds per client IP (Upstash Redis sliding window), returning HTTP 429
  on breach. Mobile devices sharing a carrier-grade-NAT or public wifi IP could
  collide against this shared budget in ways a browser-per-person model doesn't. 🟠
  important — not a hard blocker, but worth deciding whether mobile traffic needs its
  own bucket (e.g. keyed by user ID/device ID once authenticated, falling back to IP
  only for anonymous requests) before launch.
- **No CORS configuration found** at all (`next.config.ts` has no `headers()`/CORS
  setup). ⚠️ UNVERIFIED whether the hosting platform (behind `output: "standalone"`)
  applies any default CORS policy. React Native's `fetch` doesn't enforce
  browser-style CORS the way a web page does, so this may be a non-issue for a
  same-origin-style mobile client hitting the API directly — but confirm rather than
  assume, especially if any part of the app ever runs inside a WebView.
- No bot-protection/reCAPTCHA was found on any form.

## 6. Payments and checkout

- **Event tickets**: ready to port — see Server Action fix in §2. The rest (hold,
  finalize) are already real REST endpoints usable as-is. Needs
  `@stripe/stripe-react-native`'s `PaymentSheet` on the client, fed by the same
  `clientSecret`. 🔴 blocker until §2 is fixed; 🟢 otherwise low-effort.
- **Bookings**: ⚠️ **open product question, not just a technical gap** — the live
  booking-creation path never charges via Stripe (see `06-features-and-business-logic.md`);
  a parallel `checkout-session`/webhook pair exists but appears to compute price from a
  hardcoded `$50` placeholder and doesn't match the real booking-creation flow. Do not
  build mobile booking-payment against this dead path. Get a product answer first:
  is booking payment meant to happen in-person, or is this an incomplete web feature
  that needs finishing (on web) before mobile can copy it? Priority: 🔴 blocker _for
  the bookings feature specifically_ — does not block shipping ticketing/events/deals
  without bookings.

## 7. File uploads

Already RN-compatible as-is: every upload route reads `multipart/form-data` server-side
and uploads to S3 itself (no presigned-URL/direct-to-S3 pattern to reimplement). A
mobile client just needs to build the equivalent `FormData` with `{uri,name,type}`
entries from `expo-image-picker`. No backend change needed. Priority: n/a (already works).

## 8. Push notifications

Nothing exists today — no APNs/FCM/Expo-push integration, and the existing in-app
`Notification` model is a feed, not a push mechanism. New work needed:

- `POST /api/mobile/notifications/register-token` — body `{ token, platform: "ios"|"android" }`,
  bearer-authed, upserts onto the user's record (new field, e.g. `expoPushTokens: string[]`).
- A send-side integration (Expo's push service is the simplest given the RN stack) —
  triggered from existing notification-creation points (e.g. the `Notification.create(...)`
  call in `app/api/bookings/route.ts:345-356`, and equivalents for new orders/ticket
  sales/deal redemptions) rather than a new notification system.
  Priority: 🟠 important, not a launch blocker — the app is usable without push, just
  less engaging.

## 9. Deep links / email links

Password-reset codes and email-verification links are delivered by **email** as
6-digit codes (reset) and a token-bearing **web URL** (`GET /api/verify-email?token=`)
respectively. The verification link specifically needs to work as a **universal
link** that opens the app if installed and falls back to the web page if not — see
`10-navigation-map.md`. No backend change needed for this (the existing token/endpoint
works as-is); this is purely an app-side (Associated Domains / App Links) + possibly a
small web-page tweak (detect app-installed and offer an "Open in app" button) task.
Priority: 🟢 nice to have for v1, since the code path works via mobile browser regardless.

## 10. Third-party / browser-only libraries with no RN/Expo Go equivalent

See `08-integrations-and-third-party.md` for the full list; the two requiring a custom
dev build (not Expo Go) are **Stripe** (`@stripe/stripe-react-native`) and, if adopted,
**native maps** (`react-native-maps`). QR scanning (`expo-camera`) and everything else
has an Expo-Go-compatible path.

## 11. Inconsistent or missing API conventions

- **No single response envelope.** Most routes return
  `ApiResponseType<T> = {status,message,error,data,pagination?}`, but bookings, event
  tickets, deals-redemption, and most of auth return their own ad hoc
  `{success, data/message/error}` shapes instead. A mobile HTTP client will need
  per-domain response typing rather than one generic unwrapper — this is a real,
  if minor, integration cost. **Recommend**: don't try to retrofit 107 existing routes
  to one shape (high regression risk for zero mobile benefit, since the mobile client
  can just type each response individually, exactly as the web `services/*.ts` layer
  already does) — instead, standardize only the **new** `/api/mobile/*` namespace on
  one consistent `{ data, error, meta }` shape from day one.
- **No pagination actually implemented** on most list routes despite `useFetcher`
  defaulting every query to `page=1&per_page=10` — most routes read in this pass return
  everything unpaginated. Not a blocker (small dataset sizes today), but will need
  real pagination before the app's list screens scale.
- **No API versioning** anywhere (`/api/event`, not `/api/v1/event`). Recommend the new
  `/api/mobile/v1/...` prefix specifically so future breaking changes to the mobile
  contract don't require another full migration.
- **Error bodies are the raw JSON string wrapped in `new Error(...)`**, not a parsed
  object, at the `lib/action.ts` HTTP-client layer — several web components historically
  forgot to `JSON.parse` this and showed raw `{"error":"..."}` text to users (a bug
  pattern that recurred multiple times in this codebase's history). Build the mobile
  HTTP client to always attempt `JSON.parse` on a non-2xx body from the start.

## 12. Everything else worth flagging

- **65 of 107 routes already do the right thing** (proper server-side session checks) —
  the auth-helper swap in §1 is mechanical, not a rewrite, once the helper exists.
- The codebase is **more than an events/ticketing app** — deals, service bookings
  (with real scheduling/capacity algorithms), and a super-admin panel all exist. Scope
  the mobile v1 deliberately (see recommended order below) rather than assuming
  "the API" means only what this session's own work touched.
- Two routes/screens that look like near-duplicates (`/search` vs `/businesses`,
  `/dashboard/favorite` vs `/favorites`, `/dashboard/tickets` vs `/activity`) should be
  resolved with the team **before** the mobile app commits to one canonical version of
  each — see `99-open-questions.md`.

---

## All new/changed endpoints needed

| Method              | Path                                                                       | Purpose                                                           | Request                                               | Response                                                                                                      | Auth               | Priority | Effort                                               |
| ------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------ | -------- | ---------------------------------------------------- |
| POST                | `/api/mobile/auth/login`                                                   | Mobile login                                                      | `{email,password,category}`                           | `{accessToken,refreshToken,expiresIn,user}`                                                                   | —                  | 🔴       | M                                                    |
| POST                | `/api/mobile/auth/register`                                                | Mobile signup                                                     | `FormData` (same fields as web)                       | `{accessToken,refreshToken,expiresIn,user}`                                                                   | —                  | 🔴       | M                                                    |
| POST                | `/api/mobile/auth/refresh`                                                 | Refresh access token                                              | `{refreshToken}`                                      | `{accessToken,expiresIn}`                                                                                     | —                  | 🔴       | S                                                    |
| POST                | `/api/mobile/auth/logout`                                                  | Invalidate refresh token                                          | `{refreshToken}`                                      | `{success}`                                                                                                   | bearer             | 🔴       | S                                                    |
| POST                | `/api/mobile/auth/forgot-password`                                         | Send reset code                                                   | `{email}`                                             | `{message}`                                                                                                   | —                  | 🟠       | S (reuses existing logic)                            |
| POST                | `/api/mobile/auth/reset-password`                                          | Set new password                                                  | `{email,code,password}`                               | `{message}`                                                                                                   | —                  | 🟠       | S (reuses existing logic)                            |
| POST                | `/api/mobile/auth/social`                                                  | Google sign-in via native ID token                                | `{idToken,provider}`                                  | `{accessToken,refreshToken,expiresIn,user}`                                                                   | —                  | 🟠       | M                                                    |
| GET                 | `/api/mobile/me`                                                           | Current user                                                      | —                                                     | `{user}`                                                                                                      | bearer             | 🔴       | S                                                    |
| (new shared helper) | `getAuthUser(req)`                                                         | Session-or-bearer check, swapped into existing routes             | —                                                     | —                                                                                                             | —                  | 🔴       | L (mechanical, many call sites, sequence by feature) |
| POST                | `/api/mobile/event/ticket/price`                                           | Price a cart + create/update PaymentIntent (Server Action → REST) | `{eventId,items,promoCode?,previousPaymentIntentId?}` | `{clientSecret,paymentIntentId,invoiceNumber,items,ticketTotal,serviceFee,surcharge,totalToPay,promoApplied}` | — (guests allowed) | 🔴       | S (logic exists, needs a route wrapper)              |
| POST                | `/api/mobile/notifications/register-token`                                 | Save an Expo push token                                           | `{token,platform}`                                    | `{success}`                                                                                                   | bearer             | 🟠       | S                                                    |
| —                   | (clarify) `GET /api/bookings/lock`→confirm auth requirement                | —                                                                 | —                                                     | —                                                                                                             | ⚠️ unverified      | 🟢       | —                                                    |
| —                   | Standardize `/api/mobile/*` on one `{data,error,meta}` envelope            | —                                                                 | —                                                     | —                                                                                                             | —                  | 🟠       | M (discipline, not code volume)                      |
| —                   | Real pagination on list-heavy mobile endpoints (events, deals, businesses) | `?page&per_page` honored server-side                              | `pagination` block populated                          | —                                                                                                             | 🟠                 | M        |

Everything **not** in this table (the existing 107 routes) is reachable as-is once
§1's auth helper exists and is applied to the specific routes the mobile v1 scope
needs — most of the "new work" here is auth + the one Server Action, not a
wholesale rebuild.

## Recommended implementation order

1. **Auth** (§1) — the `/api/mobile/auth/*` endpoints + shared `getAuthUser` helper.
   Nothing else can be properly tested end-to-end without this.
2. **Apply `getAuthUser`** to the specific existing routes the v1 app needs first:
   `/api/event/*`, `/api/tickets`, `/api/favroite`, `/api/review`, `/api/user/*` —
   not all 65 at once.
3. **Event ticket pricing endpoint** (§2) — unblocks the highest-value transaction.
4. **Push token registration** (§8) — small, independent, do whenever convenient before
   the app needs re-engagement notifications.
5. **Bookings payment** — blocked on the product question in §6; resolve that first,
   then this is either "already works, just needs the auth helper" (if payment truly
   is in-person) or a real new Stripe integration (if not).
6. Everything else (favorites, reviews, notifications feed, deals) needs only the auth
   helper applied — no new endpoints.

## Risks to the existing website

- **Auth**: adding `/api/mobile/auth/*` and the shared `getAuthUser` helper is
  additive — the helper should try the existing `getServerSession` path first and only
  fall back to bearer-token verification, so web behavior is provably unchanged as long
  as each swapped route is tested with an existing web session after the change.
  **Never modify `authOptions` itself** (secret, providers, callbacks) for mobile's
  sake — the mobile system should be a parallel, independent scheme reusing the same
  `User` data, not a shared session mechanism.
- **Rate limiting**: if mobile traffic ever needs a separate budget from
  `proxy.ts`'s global IP limiter, change the limiter's _key_ (e.g. include a device ID
  once authenticated) rather than raising the limit for everyone, to avoid opening the
  website itself up to more abuse.
- **New routes under `/api/mobile/`**: keep every new endpoint under this prefix so
  there is zero risk of colliding with or altering existing web route behavior —
  nothing existing needs to change except the internal auth-check helper swap, which
  is designed to be behavior-preserving for the web case.
- **Server Action extraction** (§2): the safest approach is to move the pricing logic
  into a plain function both the existing Server Action and the new REST route call,
  rather than deleting the Server Action — the web checkout flow keeps working
  unmodified throughout.

## Questions for the team before backend work starts

1. Is the checkout-session/webhook booking-payment path (§6) dead code to be removed,
   or an incomplete feature to finish? This determines whether "mobile booking payment"
   is a port or a from-scratch build.
2. Should mobile auth tokens be signed with the existing `NEXT_AUTH_SECRET` or a
   dedicated new secret?
3. Is a business-operator mobile experience (Manage Event, dashboard) in scope at all,
   or is v1 consumer-only? This significantly changes the endpoint/auth-helper rollout
   scope in step 2 above.
4. Which of the near-duplicate route pairs (`/search` vs `/businesses`,
   `/dashboard/favorite` vs `/favorites`, `/dashboard/tickets` vs `/activity`) is
   canonical, so the app doesn't build two screens for one concept?
5. Is Mailtrap the real production email sender today, or a sandbox that needs
   replacing before mobile users depend on receiving password-reset/ticket emails?
6. Does the mobile app need its own, separate rate-limit budget from the shared
   20-req/10s-per-IP web limiter?
