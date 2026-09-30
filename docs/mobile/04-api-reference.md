# API Reference

**Base URL**: relative to the site origin — see `00-README.md`. All request/response
shapes below are transcribed from the actual route handlers and the `services/*.ts`
callers; fields not directly observed in a route body are marked `⚠️ inferred` (taken
from the client-side type in `services/*.ts` rather than confirmed server-side).

**Auth column key**: 🔒 = requires a NextAuth session (`getServerSession(authOptions)`
returns non-null) or the route 401s; — = no auth check found; 🔒role = session required
AND a specific `category` is checked server-side.

**Standard envelope**: most routes return
`ApiResponseType<T> = { status, message, error, data: T, pagination? }`
(`services/apitypes.ts:1-20`) but this is **not universal** — many routes (bookings,
tickets, deals-redeem, auth) return their own ad hoc `{ success, data/message/error }`
shape instead. There is **no single standard response envelope** across this API — see
the "Inconsistent conventions" item in `12-mobile-gap-report.md`.

---

## Shared TypeScript interfaces (data models)

```ts
// User / Auth — server/models/Auth.model.ts
interface User {
  _id: string;
  name?: string;
  category?: "user" | "business" | "super-admin";
  email: string; // unique, lowercased
  city?: string;
  longitude?: number;
  latitude?: number;
  geo?: { type: "Point"; coordinates: [number, number] }; // [lng, lat]
  city_name?: string;
  location?: string;
  community: string[];
  image?: string;
  venue_images: string[];
  portfolio_images: string[];
  accpetalltermsandcondition: boolean;
  emailVerified?: Date | null;
  provider: "credentials" | "google" | "guest";
  googleId?: string;
  business_name?: string;       // unique when present
  business_type?: "employee_based" | "item_based" | null;
  phone_number?: string;
  business_category?: string;
  is24_7: boolean;
  schedule?: Record<string, { open: boolean; slots: { from: string; to: string }[] }> | null;
  isblocked: boolean;
  abn_number?: string;
  seo_keywords: string[];       // max 10
  seo_description?: string;     // max 200 chars
  verified: boolean;
  isSponsor: boolean;
  createdAt: string; updatedAt: string;
}

// Event — server/models/Event.model.ts (fields per services/event.service.ts:9-86, cross-checked against route usage this session)
interface EventOption {
  _id?: string; name?: string; release_date?: string | null; close_date?: string | null;
  price?: number | null; capacity?: number | null; sold?: number | null; held?: number | null; // held = actively-reserved-but-unpaid count
}
interface EventPromoCode {
  _id?: string; code?: string; discount_percentage?: number | null; limit?: number | null;
  used?: number | null; applicable_options?: string[]; // option names this code discounts; empty = applies to all
}
interface Event {
  _id: string; title: string; description: string;
  dateRange?: { from: string; to: string };
  user: { _id: string; email: string; name: string; business_name: string; city: string; location: string; image: string }; // the organizing business
  location: string; location_tba?: boolean;
  event_rules?: string; refund_policy?: string; host_name?: string; support_details?: string;
  category_name: string; email: string; phone_number: string; website_link: string;
  price_category: "registration" | "paid" | "external"; // free-with-registration / paid ticketed / external ticket link
  registration_capacity?: number | null; registration_sold?: number | null;
  max_tickets_per_request?: number | null; // default 10
  show_remaining_tickets?: boolean;         // default true
  community_name: string; city: string; community: string;
  startTime: string; endTime: string; // "HH:mm"
  venue: string; category: string; image: string;
  latitude: number; longitude: number; isSponsor: boolean;
  geo?: { type: string; coordinates: [number, number] };
  distance?: number; // metres, only when a geo query is active
  ticket_link: string | null; // for price_category "external"
  options?: EventOption[]; promo_codes?: EventPromoCode[];
  slug?: string; archived?: boolean; createdAt?: string; updatedAt?: string;
}

// EventTicketPurchase — server/models/EventTicketPurchase.model.ts
interface EventTicketLineItem { optionId: string; optionName: string; quantity: number; unitPrice: number; uniqueKeys: string[]; }
interface EventTicketPurchase {
  _id: string; event: string | Event; user: string | User; business: string;
  items: EventTicketLineItem[]; uniqueKeys: string[]; verifiedKeys: string[];
  verifiedTimestamps: { key: string; verifiedAt: Date }[]; // per-ticket check-in time
  promoCode?: string; invoiceNumber: string;
  ticketTotal: number; serviceFee: number; surcharge: number; totalAmount: number;
  paymentIntentId: string; status: "pending" | "verified"; verifiedAt?: Date;
}

// Deal — server/models/DealSchema.model.ts (fields per services/deal.service.ts:9-26)
interface Deal {
  _id: string; title: string; current_redemptions: number; max_redemptions: number;
  discount_percentage: number; price: number; valid_till: string; deals_for: string;
  category?: string; city?: string; image?: string; description: string; user: User;
  terms_for_the_deal: string; deal_code: string; verifiedRedemptions: number;
}

// Service / Employee / Booking — server/models/{Service,Employee,Booking}.model.ts (per services/booking.service.ts:7-66)
interface Service {
  _id: string; business_id: string; name: string; description?: string; category: string;
  base_price: number; base_duration: number; // minutes
  service_type?: "employee_based" | "resource_based" | "group_session";
  require_employee_selection: boolean; assigned_employees: Employee[]; is_active: boolean;
  buffer_time?: number; availability_type?: "always" | "specific";
  max_concurrent_bookings?: number; allow_multiple_bookings?: boolean;
  max_bookings_per_slot?: number; is_one_time_booking?: boolean;
}
interface Employee {
  _id: string; business_id: string; full_name: string; email?: string; phone_number?: string;
  bio?: string; is_active: boolean; employee_photo?: string;
}
interface Booking {
  _id: string; business_id: string; user_id: string; service_id: Service | string;
  employee_id: Employee | string | null; start_time: string; end_time: string;
  duration: number; total_price: number; currency: string;
  payment_status: "unpaid" | "pending" | "paid" | "refunded" | "failed";
  status: "pending" | "confirmed" | "rescheduled" | "arrived" | "completed" | "cancelled" | "no_show" | "refunded";
  notes?: string; idempotency_key?: string | null; created_at: string; updated_at: string;
}
```

---

## Auth

See `05-auth-and-user.md` for full detail. Table form:

| Purpose | Method | Path | Auth | Request | Response |
|---|---|---|---|---|---|
| NextAuth handler (session, providers, callback) | GET/POST | `/api/auth/[...nextauth]` | varies | NextAuth internal | NextAuth internal — do not call directly from the app |
| Send pre-signup code | POST | `/api/auth/send-verification-code` | — | `{ email }` | `{ message, success }` |
| Verify pre-signup code | POST | `/api/auth/verify-signup-code` | — | `{ email, code }` | `{ message, success }` |
| User signup | POST | `/api/auth/user/signup` | — | `FormData{ name, email, password, accpetalltermsandcondition, image? }` | 201 `{ message, success, userId }` |
| Business signup | POST | `/api/auth/business/signup` | — | `FormData{ name, email, password, business_name, business_type?, business_category, phone_number?, city, location, is24_7, latitude?, longitude?, community(json), schedule(json), accpetalltermsandcondition, image?, venue_image_0..8? }` | 201 `{ message, success, userId }` |
| Forgot password (send code) | POST | `/api/reset-password` | — | `{ email }` | `{ message }` / 404 |
| Verify reset code | POST | `/api/auth/verify-code` | — | `{ email, code }` | `{ message }` |
| Set new password | POST | `/api/auth/update-password` | — | `{ email, code, password }` | `{ message }` |
| Send "verify my email" link | POST | `/api/send-email-verification` | — | `{ email }` | `{ success }` |
| Consume verify-email link | GET | `/api/verify-email?token=` | — | — | `{ message }` |

### Mobile Auth (`/api/mobile/v1/*`) — implemented, Phase 1

New, parallel bearer-token auth namespace — see `05-auth-and-user.md` and
`12-mobile-gap-report.md` for the design rationale. All 9 routes below share one
response envelope: `{ data, error: {message}|null, meta }`. `authOptions` /
`app/api/auth/[...nextauth]/route.ts` was never modified to build this — every route
either reuses extracted shared logic (`server/lib/accountCreation.ts`,
`server/lib/passwordReset.ts`, `server/lib/guestAuth.ts`) or, for Google sign-in, a
deliberate duplicate of the NextAuth callback's find-or-create block
(`server/lib/googleAuth.ts` — see that file's comment for why).

| Purpose | Method | Path | Auth | Request | Response (`data`) |
|---|---|---|---|---|---|
| Login | POST | `/auth/login` | — | `{email,password,category:"user"\|"business",deviceId?,platform?}` | `{accessToken,refreshToken,expiresIn,user}` |
| Register | POST | `/auth/register` | — (rate-limited: 10/10min/IP) | `FormData` — same fields as the existing web signup routes, plus `category`, `deviceId?`, `platform?` | 201 `{accessToken,refreshToken,expiresIn,user}`. Checks `MOBILE_JWT_SECRET` is configured *before* creating the account (500 config error, nothing created, if not). If the account is created but token issuance then fails for some other reason, still 201 — `{user,tokens:null}` with `meta:{message:"Account created, please log in"}` — the account is never deleted or treated as a failed registration once it exists; the client should fall back to `/auth/login`. |
| Refresh | POST | `/auth/refresh` | — | `{refreshToken,deviceId?,platform?}` | `{accessToken,refreshToken,expiresIn}` (rotated — see below) |
| Logout | POST | `/auth/logout` | — | `{refreshToken}` | `{success:true}` |
| Forgot password | POST | `/auth/forgot-password` | — | `{email}` | `{message}` (reuses `/api/reset-password`'s logic) |
| Reset password | POST | `/auth/reset-password` | — | `{email,code,password}` | `{message}` (reuses `/api/auth/verify-code` + `/api/auth/update-password`'s logic in one call) |
| Social sign-in | POST | `/auth/social` | — | `{idToken,provider:"google"\|"apple",name?,deviceId?,platform?}` | `{accessToken,refreshToken,expiresIn,user}` — `name` only matters for Apple (its id_token never carries a name; the client sends it separately on first authorization) |
| Guest checkout identity | POST | `/auth/guest` | — (rate-limited: 10/10min/IP) | `{name,email,phone,deviceId?,platform?}` | `{accessToken,refreshToken,expiresIn,user}`, or 409 if that email already belongs to a password-protected account (never auto-signs into an account it doesn't own) |
| Current user | GET | `/me` | bearer | — | `{user}` |
| Delete account | DELETE | `/me` | bearer | — | `{success:true}` — anonymizes in place (email → `deleted+<id>@invalid`, PII wiped, googleId/appleId/password unset, `deletedAt` set); the `User` document and its `_id` are kept so existing Booking/EventTicketPurchase/Review references never dangle |

**Token design**: access tokens are short-lived (15 min) HS256 JWTs signed with
`MOBILE_JWT_SECRET` (a new secret, deliberately separate from `NEXT_AUTH_SECRET`),
verified via `server/lib/mobileJwt.ts` — the only file `proxy.ts` imports from, kept
free of any Mongoose dependency so it stays Edge-runtime-safe. Refresh tokens are
opaque random strings (30-day lifetime), stored server-side only as a sha256 hash
(`server/models/RefreshToken.model.ts`) — the raw value is never persisted.

**Refresh rotation**: each successful `/auth/refresh` call atomically revokes the
presented token and issues a new pair (a single `findOneAndUpdate` guarded on
`revokedAt:null`, so two simultaneous calls can never both win). Presenting an
already-revoked token within a 30-second grace window of its own revocation — the
signature of a racing duplicate call, not theft — issues a fresh **sibling** pair
without touching the token's real successor; both remain valid. Presenting a dead
token outside that window (or with no valid successor) is treated as a replayed/stolen
token: every other active refresh token for that user is revoked immediately, forcing
re-login on every device.

**`getAuthUser(req)`** (`server/lib/getAuthUser.ts`) is the one identity check both
the web session cookie and the mobile bearer token go through. It tries the existing
NextAuth session first, falling back to `Authorization: Bearer`; either path does a
*fresh* Mongo read and rejects if the account is `isblocked` or has `deletedAt` set —
this is applied consumer-side to `event/ticket/purchase`, `event/ticket/hold`,
`event/ticket/hold/release` (all still guest-allowed — `getAuthUser` returning `null`
is handled identically to a missing session before), `tickets`, `favroite`, `review`,
`review/edit/[id]`, `review/delete/[id]`, `event/redeem`, `user/profile`,
`user/update`. **Business-only routes (event create/edit/delete/archive, event
verify*, event/redeem/get-business, send-invoice) are explicitly NOT swapped in this
phase** — v1 is consumer-only.

⚠️ **Behavior change on the web path, not just additive**: those 10-11 routes now
reject a blocked (`isblocked`) or deleted user even on an existing, still-valid web
session cookie — previously a stale JWT session could keep working against these
specific routes until it naturally refreshed. This also adds one extra DB read per
authenticated request to those routes.

Rate limiting: `proxy.ts`'s global 20-req/10s-per-IP limiter now keys by
`user:<id>` when a valid bearer token is present (verified Edge-side via
`mobileJwt.ts`, no DB call), falling back to `ip:<ip>` exactly as before — the limit
itself is unchanged. `/auth/register` and `/auth/guest` additionally have their own
stricter 10-req/10min-per-IP limiter (`server/lib/mobileRateLimit.ts`) on top of that,
since they're the two endpoints that can create an account/identity with no password
guess required.

### Error codes

Every `error` object in the `{data,error,meta}` envelope may carry an optional
`code` alongside `message` — a stable, machine-readable string the client can switch
on without parsing prose. Only `GET /me` and `DELETE /me` return these today (they're
the only routes that expose `getAuthUserDetailed`'s reason — see
`server/lib/getAuthUser.ts`); every other mobile route's `error.code` is currently
`null`, message-only.

| Code | HTTP status | Meaning |
|---|---|---|
| `ACCOUNT_BLOCKED` | 403 | The credential (session or bearer token) is valid and identifies a real account, but that account has `isblocked:true`. The client should show a "your account has been blocked" message, not prompt for re-login. |
| `ACCOUNT_NOT_FOUND` | 401 | The credential identifies a user id that no longer resolves to a usable account — either genuinely doesn't exist, or resolves to one with `deletedAt` set (anonymized via `DELETE /me`). The client should clear stored tokens and treat this as "not logged in". |
| `TOKEN_INVALID` | 401 | No bearer token was presented, or the one presented is malformed, unsigned, or expired. The client should attempt `/auth/refresh`, and if that also fails, clear tokens and prompt for login. |

The 11 pre-existing consumer routes this phase swapped to `getAuthUser` (tickets,
favroite, review*, event redeem/ticket/hold/purchase, user profile/update) deliberately
do **not** return these codes — they use the plain `getAuthUser` wrapper, which
collapses every rejection reason back to a bare `null`, so their response shape for
both the web session-cookie path and a mobile bearer-token caller is byte-identical to
what it was before this phase. Only new, mobile-only routes distinguish reasons.

---

## Events & Tickets

This is the deepest, most-recently-built area of the codebase (this session built the
guest checkout, ticket holds, and business scanning/reports on top of it).

| Purpose | Method | Path | Auth | Notes |
|---|---|---|---|---|
| List/search events | GET | `/api/event/getallevent` | — | Query params (from `useGetAllEvents`, `services/event.service.ts:148-177`): `category, search, city, community, from, to, lat, lng, radius`. Returns `ApiResponseType<Event[]>`. Geo-radius search implies a `$geoNear`/2dsphere query — same pattern as `User.geo` (`Auth.model.ts:83`) and likely `Event.geo`. |
| Get single event | GET | `/api/event/single-event/[id]` | — | Path param is the **slug** (lowercased, non-alphanumeric stripped — see `components/Event/SingleEventPage.tsx`), not the Mongo `_id`. Returns `ApiResponseType<Event>` with `reviews: ReviewType[]` embedded. |
| Get event for edit form | GET | `/api/event/single-event-for-form/[id]` | 🔒 | Business-only variant (raw, unformatted for the edit form). |
| Create event | POST | `/api/event` | 🔒 | `FormData` — see field list in `app/api/event/route.ts` (title, description, venue, city, community, category, location, location_tba, email, phone_number, website_link, dateRange(json), price_category, ticket_link, options(json), promo_codes(json), event_rules, refund_policy, host_name, support_details, startTime, endTime, latitude, longitude, registration_capacity, max_tickets_per_request, show_remaining_tickets, image file). |
| Edit event | PATCH | `/api/event/edit/[id]` | 🔒 | Same field set. **Important**: merges `options[].sold`/`promo_codes[].used` by `_id` rather than blindly overwriting — a naive full-array replace would zero out real sales counters (a bug this session fixed). A mobile edit screen must send existing option/promo `_id`s back, not just names, or it will silently create duplicates. |
| Archive event | POST | `/api/event/archive/[id]` | 🔒 | Business rule (added this session): can only archive once the event has ended AND (if any ticket was ever sold) not before then — see `06-features-and-business-logic.md`. |
| Delete event | POST/DELETE | `/api/event/delete/[id]` | 🔒 | ⚠️ UNVERIFIED exact HTTP verb — `services/event.service.ts` has this commented out (`useDeleteEvent`, lines 194-203); not currently called from the UI. |
| Price + hold a cart | server action | `getEventTicketPaymentIntent` in `app/actions/eventTicketStripe.tsx` | — (guests allowed) | **This is a Next.js Server Action, not a REST endpoint** — see the Server Actions gap in `12-mobile-gap-report.md`. Re-derives pricing server-side: `serviceFee = quantity * $2.00`, `surcharge = 2.5% of (ticketTotal+serviceFee)`, creates/updates a Stripe PaymentIntent, returns `{ clientSecret, paymentIntentId, invoiceNumber, items[], ticketTotal, serviceFee, surcharge, totalToPay, promoApplied }`. |
| Hold tickets | POST | `/api/event/ticket/hold` | — (guests allowed) | Body `{ eventId, items:[{optionId,quantity}], paymentIntentId }`. Idempotent per `paymentIntentId` (repeat calls don't reset the 5-minute timer). Validates `capacity - sold - held >= quantity` per option inside a Mongo transaction; increments `held`; creates a `TicketHold` doc (TTL index, `expiresAt`). Response `{ success, expiresAt }`. Errors: `` `Only ${remaining} ${name} ticket(s) available right now` `` / `` `${name} tickets are not available right now` ``. |
| Release a hold | POST | `/api/event/ticket/hold/release` | — | Body `{ paymentIntentId }`. No session required — the `paymentIntentId` itself is treated as a bearer secret for release authorization (only the client holding that ID would know it). Decrements `held`, deletes the `TicketHold` doc. |
| Finalize purchase | POST | `/api/event/ticket/purchase` | — (guests allowed) | Body `{ eventId, paymentIntentId, guestInfo?: { name, email, phone } }`. **Idempotency check runs first** (returns the same result if `paymentIntentId` already has a purchase — safe to retry). If no session and no `guestInfo`, 400 `{ error, code: "GUEST_INFO_REQUIRED" }`. Verifies the Stripe PaymentIntent succeeded, re-derives pricing, consumes the hold (or falls back to a raw capacity check if the hold expired), creates the `EventTicketPurchase`, emails tickets, and — for a brand-new/passwordless guest account — mints an auto-login session cookie (see `05-auth-and-user.md`). Response: `{ success, purchaseId, invoiceNumber, items:[{optionName,codes}], signedIn, receipt?: {...} }` — `receipt` (added this session) carries everything needed to render a post-payment ticket page without another authenticated call: event summary, itemized `items` (with `uniqueKeys`), `ticketTotal, serviceFee, surcharge, totalAmount, promoCode, createdAt, holderName`. |
| List purchases (business) | GET | `/api/event/ticket/purchase?eventId=` | 🔒 | Business-scoped: `EventTicketPurchase.find({business: session.user.id})`, `.populate("event").populate("user","name email")`. `eventId` query param optional (filters to one event). |
| Send invoice email | POST | `/api/event/ticket/purchase/[purchaseId]/send-invoice` | 🔒 | Re-sends the invoice email for an existing purchase. |
| Redeem a free ("registration") ticket | POST | `/api/event/redeem` | 🔒 | Body `{ eventId, userId, business }`. For `price_category: "registration"` events — generates a `uniqueKey`, response `{ success, uniqueKey }`. |
| List my redemptions | GET | `/api/event/redeem` | 🔒 | Current user's registration-ticket redemptions. |
| List redemptions for my business | GET | `/api/event/redeem/get-business` | 🔒 | Business-scoped. |
| Scanner/manual verify | GET/POST | `/api/event/verify`, `/api/event/verify/[id]`, `/api/event/verify/manual` | 🔒 | Verifies a scanned QR code or manual status change; scoped so a business can only verify tickets for events it created. Case-insensitive code matching (a bug fixed this session — legacy mixed-case codes are backfilled on read). Manual status change writes a per-code `verifiedTimestamps` entry rather than a single shared `verifiedAt`, so changing one ticket's status never corrupts another ticket's displayed check-in time (also a fix from this session). |
| List tickets for a session | GET | `/api/tickets` | 🔒 | Merges deal redemptions + event redemptions + event ticket purchases into one array for the logged-in user's "My tickets" screen. |

### Pricing formulas (re-derive these exactly — do not trust client input)
- `serviceFee = totalQuantity * 2.00` (AUD, flat per ticket)
- `surcharge = (ticketTotal + serviceFee) * 0.025` (2.5% card surcharge)
- `totalToPay = ticketTotal + serviceFee + surcharge`
- A promo code discounts `unitPrice` by `discount_percentage`% on each matching option
  (`applicable_options` empty ⇒ applies to every option in the event).
- The finalize route **compares `paymentIntent.amount` (cents) to the re-derived
  total** and 400s on any mismatch — a mobile client must never assume it can pass a
  price; it only ever supplies `eventId` + `items` and reads back the authoritative price.

---

## Deals

| Purpose | Method | Path | Auth | Notes |
|---|---|---|---|---|
| List all deals (public browse) | GET | `/api/deals/get-all` | — | Query: `category, search, from, to, city`. |
| List my deals (business) | GET | `/api/deals` | 🔒 | |
| Create/update deal | POST/PATCH | `/api/deals` / `/api/deals/edit/[id]` | 🔒 | `FormData`, image upload. |
| Get single deal | GET | `/api/deals/single-deal/[id]` | — | |
| Delete deal | POST | `/api/deals/delete/[id]` | 🔒 | |
| Redeem a deal | POST | `/api/deals/redeem` | 🔒 | Body `{ dealId, userId, business, paymentIntentId?, quantity? }` — deals can apparently also be paid (`paymentIntentId`/`quantity` present) ⚠️ UNVERIFIED whether deal purchase uses the same Stripe pattern as events; not traced this pass. Response `{ success, uniqueKey, paymentIntentId? }`. |
| Redeem multiple | POST | `/api/deals/redeem/multiple` | 🔒 | Same shape, presumably a quantity > 1 path — ⚠️ UNVERIFIED how this differs from passing `quantity` to the single endpoint above. |
| List my redemptions | GET | `/api/deals/redeem` | 🔒 | |
| Get redemptions for one deal (business) | GET | `/api/deals/redeem/single/[id]` | 🔒 | |
| Verify a redemption code | POST | `/api/deals/verify` | 🔒 | Business scanning/manual verify, mirrors event verify. |

---

## Business directory & profile

| Purpose | Method | Path | Auth | Notes |
|---|---|---|---|---|
| Search/list businesses | GET | `/api/business` | — | Query (from `useGetBusiness`, `services/business.service.ts:49-68`): `category, search, service, city, community, lat, lng, radius, swLat, swLng, neLat, neLng` — supports both radius search and a bounding-box (`sw*/ne*`) search, i.e. map-viewport search. Returns `ApiResponseType<UserBusinessType[]>`. |
| List all businesses (no filters) | GET | `/api/business` (no params) | — | `useGetALLBusiness` calls the same endpoint with an empty query. |
| Single business (public) | GET | `/api/business/single/[id]` | — | |
| Single business (dashboard) | GET | `/api/business/getwithid/[id]` | 🔒 | |
| Get/update operating hours | GET/POST | `/api/business/operating-hours` | 🔒 | |
| Get operating hours (public, by id) | GET | `/api/business/operating-hours/get-single/[id]` | — | |
| Update business type | POST | `/api/business/businesstype` | 🔒 | `{ business_type: "employee_based" \| "item_based" }` |
| Update ABN | POST | `/api/business/abn` | 🔒 | `{ abn_number }` |
| Business profile | GET/PATCH | `/api/business/profile` | 🔒 | |
| Business settings | GET/PATCH | `/api/business/settings` | 🔒 | |
| Complete business profile (post-signup) | POST | `/api/profile-complete-business` | 🔒 | |
| Business dashboard stats | GET | `/api/business-dashboard` | 🔒 | `{ dailyStats:[{date,appointments,sales}], totalAppointments, totalSales, recentBookings, upcomingBookings, todayBookings }` |
| General dashboard (user) | GET | `/api/dashboard` | 🔒 | `{ favorite?, deals? }` |
| Dashboard search | GET | `/api/dashboard/search` | 🔒 | ⚠️ UNVERIFIED query params/shape — not traced this pass. |

---

## Bookings (services/appointments)

| Purpose | Method | Path | Auth | Notes |
|---|---|---|---|---|
| List services | GET | `/api/services?business_id=` | — for browse / 🔒 for `/api/services/user` | `business_id` optional query param. |
| Single service | GET | `/api/services/single/[id]` | — | |
| My services (business) | GET | `/api/services/user` | 🔒 | |
| Create/update service | POST | `/api/services` / `/api/services/single/[id]` | 🔒 | Also used for the `is_active` toggle (partial `{ is_active }` body to the single-service POST). |
| Delete service | DELETE | `/api/services/single/[id]` | 🔒 | |
| Assign employees to service | POST | `/api/services/assign-employee` | 🔒 | `{ serviceId, employeeId: string[] }` |
| Available slots | GET | `/api/bookings/available-slots` | — | Query: `service_id, date, business_id?, duration_minutes, employee_id?, timezone`. Response `{ success, count, available_slots: string[], slot_remaining?: Record<string,number> }` (the latter only for `resource_based` services). |
| Create a booking lock (hold a slot) | POST | `/api/bookings/lock` | 🔒 (⚠️ inferred — not traced; `useCreateBookingLock` implies session context via `user_id`) | Body: `BookingLockPayload{ business_id, service_id, employee_id, start_time, timezone, inventory_quantity, items:[{service_id,quantity,multiplier}] }`. Response `{ success, lock_id, total_price }`. |
| Confirm booking | POST | `/api/bookings` | 🔒 | Body `{ lock_id, start_time, service_id, items, idempotency_key?, employee_id? }` (per the actual route read — the client type `BookingPayload` in `services/booking.service.ts:88-102` is narrower than what the route reads; ⚠️ treat the route, `app/api/bookings/route.ts:32-388`, as authoritative). **Creates the booking directly with `payment_status: "pending"` — does not itself call Stripe.** Re-validates the lock, re-derives price/duration server-side from `Service`/`Employee` overrides, runs concurrency checks (employee double-booking, resource capacity peak-usage, group-session slot capacity), sends confirmation emails, creates a business `Notification`. Response 201 `{ success, message, data: Booking }`, or 409 for `SLOT_TAKEN`/`OUT_OF_STOCK`. |
| List my bookings (business) | GET | `/api/bookings` | 🔒 | Despite the name, filters `Booking.find({business_id: session.user.id})` — i.e. this is the **business's own bookings**, not a consumer's. |
| List my bookings (consumer) | GET | `/api/bookings/user` | 🔒 | **Confirmed** (`components/Dashboard/UserBookings/UserBookings.tsx:755`) — this is the real consumer "my bookings" endpoint. Response `{ data: BookingRecord[] }`. |
| Cancel a booking (consumer) | PATCH | `/api/bookings/user/[id]` | 🔒 | Body `{ action: "cancel" }` (`UserBookings.tsx:774-777`) — the same route likely supports other `action` values; only `cancel` was observed. |
| Single booking | GET/PATCH | `/api/bookings/[id]` | 🔒 | |
| Update booking status | PATCH | `/api/bookings/status` | 🔒 | `{ bookingId, newStatus, notes }` |
| Today's bookings | GET | `/api/bookings/today` | 🔒 | |
| Verify a booking (QR/manual, presumably) | POST | `/api/bookings/verify` | 🔒 | ⚠️ UNVERIFIED — not traced this pass, inferred from naming parallel to event/deal verify. |
| Calendar view | GET | `/api/calendar/bookings`, `/api/calendar/appointments` | 🔒 | `start_date, end_date, timezone` query params. |
| ~~Hosted Stripe Checkout for bookings~~ | POST | `/api/checkout-session` | — | ⚠️ **Likely dead/legacy code** — computes price from a **hardcoded `basePrice = 50.0`** (`app/api/checkout-session/route.ts:32`, comment: "Replace with your service db price logic if dynamic") rather than the real service price. The live booking-creation path (`POST /api/bookings` above) does not call this route or go through Stripe at all — it creates the booking as `payment_status: "pending"` directly. Its paired webhook (`app/api/webhooks/stripe/route.ts`) still listens for `checkout.session.completed` and would create a *second*, differently-shaped `Booking` document if ever triggered. **Do not model mobile booking-payment on this route** — flagged as a blocker-priority question in `99-open-questions.md`/`12-mobile-gap-report.md`: is online payment for bookings intentionally deferred to in-person, or is this an incomplete feature? |

---

## Employees, resources, scheduling (business-side; light coverage — lower mobile priority)

| Purpose | Method | Path | Auth |
|---|---|---|---|
| List/create employees | GET/POST | `/api/employees` | 🔒 |
| Single/update/delete employee | GET/POST/DELETE | `/api/employees/[id]` | 🔒 |
| Employee weekly schedule | PATCH | `/api/employees/[id]/schedule` | 🔒 |
| Time off (list/create) | GET/POST | `/api/employees/time-off` | 🔒 |
| Time off (delete) | DELETE | `/api/employees/time-off/[id]` | 🔒 |
| Shift overrides (list/upsert) | GET/POST | `/api/employees/shift-overrides` | 🔒 |
| Shift override (delete) | DELETE | `/api/employees/shift-overrides/[id]` | 🔒 |
| Resource overrides (list/upsert/delete) | GET/POST/DELETE | `/api/resources/overrides` | 🔒 |
| Resource schedule | PATCH | `/api/resources/[id]/schedule` | 🔒 |
| Categories (inventory-style, list/create/update/delete) | GET/POST/PATCH/DELETE | `/api/categories`, `/api/categories/[id]` | 🔒 |
| Clients list / detail | GET | `/api/clients`, `/api/clients/[id]` | 🔒 | `q` search param on list. |
| Inventory categories/services | GET/POST | `/api/... ` (component-level `/api/inventory` per `services/inventory.service.ts` — ⚠️ that literal path was not found in the `app/api/**/route.ts` glob; likely nested under `/api/services` or renamed — **treat as unverified**, flagged in `99-open-questions.md`) | 🔒 |

---

## Reviews, favorites, notifications, profile

| Purpose | Method | Path | Auth | Notes |
|---|---|---|---|---|
| List reviews for a business | GET | `/api/review?business_id=` | — | |
| Create/update review | POST/PATCH | `/api/review` / `/api/review/edit/[id]` | 🔒 | `{ business_id, rating, comment, review_id? }` |
| Delete review | POST | `/api/review/delete/[id]` | 🔒 | |
| Reply to a review (business) | POST | `/api/review/reply/[id]` | 🔒 | `{ reply: string }` |
| Add/remove favorite | POST | `/api/favroite` | 🔒 | `{ item_id, item_type: "Event"\|... }` — toggles; ⚠️ inferred toggle vs. separate add/remove verbs, not traced. |
| List my favorites | GET | `/api/favroite` | 🔒 | `{ events, deals, services, business }` |
| Notifications (list) | GET | `/api/notifications` | 🔒 | |
| Single notification (read/delete) | GET/PATCH/DELETE | `/api/notifications/[id]` | 🔒 | |
| Profile (view/update) | GET/PATCH | `/api/user/profile`, `/api/user/update`, `/api/edit-profile` | 🔒 | ⚠️ three routes touch the same data — see `05-auth-and-user.md`. |
| Delete account | POST | `/api/delete-profile` | 🔒 | |
| Upload profile pic | POST | `/api/upload-profile-pic` | 🔒 | `FormData{ image }` → `{ url }` |
| Landing page data | GET | `/api/landing?city=` | — | Aggregated homepage data (featured events/deals/businesses by city) — shape not traced. |
| Categories (public taxonomy) | GET | `/api/categories` | — | Note: same path family as the business-scoped inventory categories above but likely a different, public route — ⚠️ UNVERIFIED whether these are the same handler with conditional scoping or two different concerns sharing a name. |

---

## Sanatan Samaj (community org vertical)

| Purpose | Method | Path | Auth |
|---|---|---|---|
| Donate | POST | `/api/sanatansamaj/donate` | ⚠️ unverified |
| Community events | GET/POST | `/api/sanatansamaj/event` | ⚠️ unverified |
| Membership | GET/POST | `/api/sanatansamaj/membership` | ⚠️ unverified |

Not traced this pass — low priority for a first mobile release unless the team says
otherwise (flag in `99-open-questions.md`).

---

## Super-admin (platform operator — likely out of scope for v1 mobile)

| Purpose | Method | Path | Auth |
|---|---|---|---|
| List/manage businesses | GET/DELETE | `/api/super-admin/business`, `/business/delete/[id]` | 🔒role (super-admin) |
| Block/unblock | POST | `/api/super-admin/business/block/[id]` | 🔒role |
| Verify business | POST | `/api/super-admin/business/update-verify/[id]` | 🔒role |
| List users | GET | `/api/super-admin/users` | 🔒role |
| List/manage events | GET/DELETE | `/api/super-admin/events`, `/events/[id]` | 🔒role |
| List/manage deals | GET/DELETE | `/api/super-admin/deals`, `/deals/[id]` | 🔒role |
| Sponsor a business/event | POST | `/api/super-admin/sponsor`, `/sponsor/event` | 🔒role |

## Infrastructure / webhooks (not app-facing)

| Purpose | Method | Path | Notes |
|---|---|---|---|
| Stripe webhook | POST | `/api/webhooks/stripe` | Signature-verified (`STRIPE_WEBHOOK_SECRET`). Only handles `checkout.session.completed` (the booking hosted-checkout flow that appears to be dead — see above). The event-ticket flow does **not** rely on this webhook; it finalizes synchronously via `confirmPayment({redirect:"if_required"})` + `POST /api/event/ticket/purchase`. |
| One-off geo backfill | POST(?) | `/api/migrate-geo` | Admin/ops utility, not app-facing. |

---

## Pagination

`useFetcher` (`lib/generic.service.tsx:8-37`) defaults every list query to
`{ page: "1", per_page: "10" }` appended as query params, and `ApiResponseType` carries
a matching `pagination: { total_number, count, per_page, current_page, last_page }`
block. This is only meaningful for routes that actually implement server-side paging —
⚠️ UNVERIFIED which specific list routes honor `page`/`per_page` vs. return everything
regardless (several routes read in this pass, e.g. event/deal listing, showed no
`.skip()/.limit()` — treat pagination as **not implemented** on those until proven
otherwise per-route).

## Caching / revalidation

Purely client-side via TanStack Query — no `revalidatePath`/`revalidateTag`,
no `Cache-Control` headers observed on API responses. Mutations call
`queryClient.invalidateQueries({queryKey:[...]})` after success (seen throughout the
components worked on this session). A mobile client should replicate this with its own
React Query (or equivalent) cache and invalidate on the same mutation/queryKey
boundaries — there is no server-driven caching contract to depend on.

## Error handling convention

`lib/action.ts`'s `Post`/`PATCH` throw `new Error(rawResponseBodyText)` on any non-2xx —
i.e. **the raw JSON string**, not a parsed object. Callers that do
`toast.error(error.message)` directly (without `JSON.parse`-ing first) will show raw
`{"error":"..."}` text to the user — a real bug pattern that recurred several times in
this codebase's history (see `components/Stripe/EventCheckOut.tsx`'s
`parseErrorMessage` helper for the correct pattern). **The mobile HTTP client should
always attempt `JSON.parse` on an error body** and fall back to the raw text only if
that fails.

## ⚠️ Mobile compatibility check — see `12-mobile-gap-report.md` for the full table

Quick summary of what's flagged there: the Server Action
(`getEventTicketPaymentIntent`), the entire cookie-only auth model, the dead
`checkout-session`/webhook booking-payment path, the missing consumer-facing
"my bookings" confirmation, and the global unauthenticated IP rate limit (20 req/10s)
are the items most likely to block a straightforward "point the app at these APIs" plan.


---

## Phase B — shapes discovered (mobile app, 2026-09-29)

Recorded while building the consumer screens. **Live** = read-only `GET` against
`https://whaustralia.com` on 2026-09-29; **source** = read from the route handler in the
website repo because production had no data (or the route needs a session). The app's
TypeScript types live in `src/api/types.ts` and declare **public fields only**.

### ⚠️ Security findings (report to backend — highest priority)

| Endpoint (public unless noted) | Leak |
|---|---|
| `GET /api/landing` (`business`, `sponser`, populated `user` on events/deals) | Full User docs incl. **bcrypt `password` hash**, email, `token`, `resetPasswordToken` |
| `GET /api/business` | Same (raw User docs, no projection) — live-verified |
| `GET /api/deals/get-all`, `GET /api/deals/single-deal/[id]` | `.populate("user")` → deal owner's full doc incl. password hash — live-verified |
| `GET /api/favroite` (bearer) | Populated business / event.user / deal.user docs incl. password hash |
| `GET /api/user/profile` (bearer) | Own raw doc incl. password hash (app uses `/api/mobile/v1/me` instead) |
| `GET /api/review?business_id=` | Reviewer's **email + phone** (`populate` excludes only `password`); with no `business_id` returns every review |
| `GET /api/event/getallevent` | `promo_codes` (codes, discounts, limits) — the `-options.promo_code` exclusion targets a non-existent field |
| `GET /api/deals/redeem` | **No auth** — returns every user's deal redemptions |
| `POST /api/services/assign-employee`, `DELETE /api/services/single/[id]` | No auth on write routes |

### Key conventions discovered

- **Business "slug"** = `business_name.toLowerCase().replace(/[^a-z0-9]/g, "")`. It is the
  lookup key for `GET /api/business/single/[slug]` **and** the `Review.business_id` value.
  Server-side matching only tolerates whitespace differences, so names with punctuation
  (e.g. "Joe's") can't be found; an unknown slug or an `_id` returns **500**
  (`Cannot read properties of null (reading '_id')`), not 404.
- **Event slug** = stored `slug` (title lowercased, non-alphanumerics removed, spaces
  removed). No unique index; regenerated when the title changes (old links break).
- **Deals** are addressed by Mongo `_id`.
- **No pagination anywhere** in these read routes: `page`/`per_page` are ignored
  (verified live on `/api/business?per_page=1` → 2 results). Caps: businesses/events 200,
  landing 20 businesses / 5 events / 10 deals.

### Shapes

**`GET /api/landing?city=`** — live. `{ data: { upcomingevents: Event[] (5, no city filter,
user populated), deals: Deal[] (10, not rendered by the web), business: Business[] (20, city
regex, + reviews by slug), sponser: (Event|Business)[] }, message }`.

**`GET /api/business`** — live. Query: `category, search, service, city, community, lat, lng,
radius, swLat, swLng, neLat, neLng`. `{ data: Array<Business & { reviews: Review[];
services: Service[]; distance?: number /* metres, geo only */ }>, message }`. Rating/review
count are **not** computed server-side (client averages `reviews`).

Business (public fields): `_id, name, business_name, business_category, business_type
("employee_based"|"item_based"|null), city, city_name?, location, latitude, longitude,
community[], image, venue_images[], portfolio_images[], is24_7, schedule
{ mon..sun: { open, slots:[{from,to}] } } | null, verified, isSponsor, seo_keywords[],
seo_description, phone_number, createdAt`.

**`GET /api/business/single/[slug]`** — live. `{ data: Business & { review: Review[]
(queried by _id → normally empty; use /api/review), hours: OperatingHours | null,
event: Event[] (dateRange.to > now), deal: Deal[], services: Service[],
employees: Employee[] }, message }`.

**OperatingHours** — live: `{ _id, business_id, is24_7, schedule: [{ day: "Monday", isOpen,
openTime: "HH:mm", closeTime: "HH:mm", _id }] }`. Also `GET
/api/business/operating-hours/get-single/[_id]` (404 `{message:"No hours found"}`).

**Services** — `GET /api/services?business_id=` is **not public** (401; it's the logged-in
business's own list). Public services come only from `/business/single/[slug]`.
Service (source): `_id, business_id, name, description?, category, base_price (AUD),
base_duration (min), service_type?, is_active, assigned_employees[]`.

**`GET /api/review?business_id=<slug>`** — live. `{ message, count, data: [{ _id,
business_id (slug), user: {_id, name, image?, …}, rating 1–5, comment 10–500,
business_reply?: { text, replied_at }, replies: [{ _id, user (id only), text, created_at }],
created_at, updated_at }] }`.
Writes (bearer OK): `POST /api/review {business_id, rating, comment}` → 201
`{message, data}` / **409** "You have already reviewed this business." (one per user per
business) / invalid body → 500 (the zod schema isn't applied on POST).
`PATCH /api/review/edit/[id]` (owner) `{rating?, comment?}`; delete is
`POST /api/review/delete/[id]` (owner or super-admin). Reply `POST /api/review/reply/[id]`
is cookie-only.

**`GET /api/event/getallevent`** — source (production has 0 events). Query: `category,
search, city, community, from, lat, lng, radius, swLat…neLng` (`to` ignored). Only
`dateRange.from >= today`; **archived events are not excluded**. `{ data: Event[],
message }`, `user` = ObjectId (not populated). Event fields: `_id, title, slug,
description (HTML), dateRange {from,to} ("YYYY-MM-DD"), startTime, endTime ("HH:mm"),
venue, location, location_tba, city, category, category_name, community, image, latitude,
longitude, price_category ("registration"|"paid"|"external"), ticket_link, options
[{_id, name, release_date, close_date, price, capacity, sold, held}],
registration_capacity, registration_sold, max_tickets_per_request,
show_remaining_tickets, isSponsor, archived, distance?`.

**`GET /api/event/single-event/[slug]`** — source. Promo codes excluded; `user` populated
`"email business_name city location image"`; adds `email, phone_number, website_link,
host_name, support_details, event_rules, refund_policy, reviews[]`. 404 `{message:"Event
not found"}`.

**`GET /api/deals/get-all`** — live. Query: `category, search, from, to, city` (city exact,
case-insensitive; `community` ignored). **No expiry filter** (web filters client-side).
`{ message, data: Deal[] }`. Deal: `_id, title, description, valid_till (ISO), city,
category, terms_for_the_deal, deals_for?, max_redemptions, current_redemptions, image,
price, discount_percentage, user (populated), createdAt`. Live categories seen:
"Groceries", "Events".

**`GET/POST /api/favroite`** (sic, bearer OK). POST `{item_id, item_type:
"Event"|"Deal"|"User"|"Service"}` **toggles** → `{ success, is_favorited, message }`. A
business is `"User"`. GET → `{ data: { events, deals, services, business } }` (populated
docs). No `isFavorite` flag on list items — clients look ids up in this list.

**`GET /api/tickets`** (bearer OK). Unsorted merge of three shapes, **no discriminator**:
deal redemption `{ deal, uniqueKeys[], status, … }` (codes `WHA-DEAL-XXXXXXXX[-1of3]`),
event registration `{ event, uniqueKey, status }` (`WHA-EVT-XXXXXXXX`), ticket purchase
`{ event, items:[{optionId, optionName, quantity, unitPrice, uniqueKeys[]}], uniqueKeys,
verifiedKeys, verifiedTimestamps, invoiceNumber, ticketTotal, serviceFee, surcharge,
totalAmount, promoCode?, status }`. The QR value is the raw code string. No single-ticket
endpoint.

**Profile.** `PATCH /api/user/update {name, image}` (bearer OK; `$set`s **both**, so send
the current image). `POST /api/edit-profile {phone_number?, location?, latitude?,
longitude?}` and `POST /api/upload-profile-pic` (FormData `file` → `{data:{url}}`, also sets
`user.image`) are **cookie-only** today.

**Mobile auth additions seen in the backend (uncommitted at time of writing):**
`POST /api/mobile/v1/auth/verify-reset-code {email, code}` → `{data:{message}}`;
`/auth/refresh` now returns 403 `ACCOUNT_BLOCKED` / 401 `ACCOUNT_NOT_FOUND` codes;
routes swapped to `getAuthUser` return `{ error: { message, code } }` for rejected bearer
tokens.

### Cookie-only routes the consumer app needs (bearer token → 401)

`POST /api/upload-profile-pic`, `POST /api/edit-profile` (swap in progress),
`POST /api/deals/redeem`, `POST /api/deals/redeem/multiple`, `POST /api/review/reply/[id]`,
all of `/api/bookings/*` (incl. `GET /api/bookings/user`, lock, create),
`/api/services*`, `/api/notifications*`, `/api/categories`, `POST /api/delete-profile`
(the app uses `DELETE /api/mobile/v1/me`), `GET /api/event/ticket/purchase` (business).

---

## Phase C — checkout contract as implemented (mobile app, 2026-09-30)

Read from the website repo at `e513aef` (clean tree). Supersedes the older notes above
where they differ.

### Ticket checkout sequence (same as the web `EventCheckOut.tsx`)
1. `POST /api/mobile/v1/event/ticket/price` (guests allowed; bearer optional, used only for
   rate-limit keying — 30/min per user or IP). Body `{ eventId, items:[{optionId,quantity}],
   promoCode?, previousPaymentIntentId? }`. Returns (envelope `data`) `{ clientSecret,
   paymentIntentId, invoiceNumber, items:[{optionId,name,quantity,unitPrice,originalPrice,
   discounted}], ticketTotal, serviceFee, surcharge, totalToPay, promoApplied }` — amounts are
   **unrounded floats**. Every call creates a **new** PaymentIntent (AUD, no customer, no
   `automatic_payment_methods`) and a **new** invoice number (the web keeps its number on
   re-price; mobile can't). The previous PaymentIntent is never cancelled.
   `previousPaymentIntentId` → its hold is released **first, with no ownership check,
   even if validation then fails**. Errors: all status 400, `code: null` (incl. Stripe/DB
   failures): "Event not found", "This event is not a paid event", "Select at least one
   ticket", "You can book a maximum of N tickets per request", "Promo code is not valid",
   "Promo code usage limit has been reached", "Quantity must be at least 1", "Ticket option
   not found", "`X` is not released yet", "`X` is no longer available", "Only N `X` ticket(s)
   available right now", "`X` tickets are not available right now". A valid promo that
   matches nothing in the cart → `promoApplied:false`, no error.
2. `POST /api/event/ticket/hold` (getAuthUser; guests allowed) `{ eventId, items,
   paymentIntentId }` → `{ success, expiresAt }` (5 min). Idempotent per PaymentIntent (does
   not reset the timer). The hold records the signed-in user. Errors 400 `{ error }` incl. raw
   `EVENT_NOT_FOUND` / `OPTION_NOT_FOUND`. Does not validate quantity ≥ 1, the per-request
   cap, or that items match the PaymentIntent.
3. Stripe PaymentSheet with the `clientSecret`.
4. `POST /api/event/ticket/purchase` (getAuthUser; guests allowed) `{ eventId,
   paymentIntentId, guestInfo? }` — idempotent per PaymentIntent (checked first; replays
   return `signedIn:false`, `holderName:"Ticket Holder"`). Signed-in → buyer = account,
   `guestInfo` ignored. Otherwise `guestInfo` required: 400 `{ error, code:
   "GUEST_INFO_REQUIRED" }` — note an **expired bearer token lands here, not on a 401**.
   Guest buyer: matched by email to an existing account (never auto-signed-in if it has a
   password). Response `{ success, purchaseId, invoiceNumber, items:[{optionName,codes}],
   signedIn, receipt:{ holderName, event:{title,image,venue,location,dateRange,latitude,
   longitude,slug,startTime,endTime}, items:[{optionName,uniqueKeys,quantity,unitPrice}],
   invoiceNumber, ticketTotal, serviceFee, surcharge, totalAmount, promoCode, createdAt } }`.
   For new passwordless guests it sets a **NextAuth session cookie** (`signedIn:true`) — no
   mobile tokens are ever returned. Refund-worthy failures (no `code`): "One or more selected
   tickets are no longer available. Please contact support for a refund.", "The promo code is
   no longer available. Please contact support for a refund.", "Payment amount mismatch".
   Other errors → 500.
5. Release: `POST /api/event/ticket/hold/release` `{ paymentIntentId }` → `{ success }`.
   Guest holds: anyone with the id. **Holds created while signed in: only that same user**
   (403 `{ message: "Unauthorized" }` otherwise — including an expired token). Unknown hold
   → success.

**Webhook:** `app/api/webhooks/stripe` handles only `checkout.session.completed` (bookings).
There is **no `payment_intent.succeeded` fallback for tickets** — a paid order becomes
tickets only when a client calls `/purchase`. The app persists paid-but-unfinalized orders
and retries them (idempotent).

### Free registration — `POST /api/event/redeem` (bearer OK)
Body `{ eventId }` (other fields ignored). 201 `{ success, message: "Ticket generated!
Check your email.", uniqueKey }`; 400 `{ message: "You have already claimed a ticket for this
event.", uniqueKey }`; 400 `{ message: "This event is fully booked." }`; 404 "Event not found";
500 on a malformed id. `GET /api/event/redeem` → `{ data: EventRedemption[] }` (event
populated). Gaps: no `price_category` check (a paid event can be registered for free), the
duplicate check isn't atomic.

### Deals — still cookie-only (blocked in the app)
`POST /api/deals/redeem` and `/redeem/multiple` use `getServerSession` and take `userId` from
the **body** (impersonation). Paid-deal PaymentIntents come from a server action
(`app/actions/stripe.tsx`) — no HTTP route. `GET /api/deals/redeem` is **unauthenticated and
returns every user's redemptions**. `/redeem/multiple` doesn't prevent replaying one
PaymentIntent. `/api/deals/verify` queries a non-existent `uniqueKey` field.

### Guest identity — `POST /api/mobile/v1/auth/guest` (not used by the app)
Issues access/refresh tokens for **any existing account without a password** (incl.
Google-only accounts) given just the email, with no blocked/deleted check → account
takeover risk. 409 (`code: null`) only for password accounts.

### PDFs
No endpoint. `POST /api/event/ticket/purchase/[id]/send-invoice` is cookie-only and for the
owning business only. The app renders ticket/invoice PDFs on-device from `/api/tickets` /
the purchase `receipt`.

### Backend needs before release (Phase C)
1. Fix `/auth/guest` (require a verification step, never issue tokens for existing accounts
   the caller doesn't prove they own; check blocked/deleted).
2. Stop setting NextAuth cookies for mobile requests (`X-Client: mobile` header is sent on
   every app request) — or return mobile tokens instead.
3. `payment_intent.succeeded` webhook that finalizes ticket purchases (idempotent), so a
   paid order can't be stranded if the app is killed and never reopened.
4. Price route: keep the invoice number on re-price, cancel superseded PaymentIntents,
   release the previous hold only after validation and only for its owner, return stable
   error `code`s (e.g. `SOLD_OUT`, `PROMO_INVALID`).
5. Hold route: validate quantity ≥ 1, the per-request cap and that items match the
   PaymentIntent metadata.
6. Deals: `POST /api/mobile/v1/deals/redeem` (bearer, user from the token), a deal price /
   PaymentIntent route, replay protection; lock down `GET /api/deals/redeem`.
7. Registration: check `price_category === "registration"`, unique index on (event, user).
8. Buyer-facing invoice email/PDF endpoint (bearer).
