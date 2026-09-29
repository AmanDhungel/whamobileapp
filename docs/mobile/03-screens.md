# Screens

## Full sitemap

Auth column: **Public** = no gate; **User** = any logged-in account (redirected to
`/auth` if not, via `AuthGuard` — see `05-auth-and-user.md`); **Business** = expected to
be a `category: "business"` account (client-side convention, not always
server-enforced — verify per screen before assuming); **Super-admin** = `category:
"super-admin"`; **Logged-out only** = redirects *away* if already authenticated
(the `/auth/*` family).

| Route | Page file | Component | Auth | Dynamic params |
|---|---|---|---|---|
| `/` | `app/page.tsx` | `LandingPage` | Public | — |
| `/events` | `app/events/page.tsx` | `EventsPageClient` (`components/Event/EventPage.tsx`) | Public | — |
| `/events/[id]` | `app/events/[id]/page.tsx` | `EventDetailPage` (`components/Event/SingleEventPage.tsx`) | Public (ticket purchase allows guest) | `id` = event slug |
| `/deals` | `app/deals/page.tsx` | `DealsPageClient` | Public | — |
| `/deals/[id]` | `app/deals/[id]/page.tsx` | `DealDetailPage` (`components/Deal/SingleDealPage.tsx`) | Public / User to redeem | `id` |
| `/businesses/[id]` | `app/businesses/[id]/page.tsx` | `SingleBusinessPage` | Public | `id` |
| `/search` | `app/search/page.tsx` | `BusinessesClientPage` (`components/Business/BusinessPage.tsx`) | Public | — (⚠️ despite the name, this is the **business directory list**, not a generic search — see Open Questions) |
| `/search/[id]` | `app/search/[id]/page.tsx` | `SingleBusinessPage` (same component as `/businesses/[id]`) | Public | `id` — ⚠️ apparent duplicate route for the same screen; confirm which is canonical before building the app's single "business detail" screen |
| `/bookings` | `app/bookings/page.tsx` | `BookingsContainer` | Public to browse / User to book | — |
| `/favorites` | `app/favorites/page.tsx` | (client component, not traced) | User | — |
| `/activity` | `app/activity/page.tsx` | `ActivityPage` | User | — |
| `/activity/tickets/[id]` | `app/activity/tickets/[id]/page.tsx` | `TicketDetailPage` | User | `id` = `EventTicketPurchase._id` |
| `/checkout/receipt/[id]` | `app/checkout/receipt/[id]/page.tsx` | `GuestTicketReceiptPage` | Public, but **data comes only from sessionStorage** written at the moment of a successful guest checkout — see below | `id` = purchase id |
| `/auth` | `app/auth/page.tsx` | `AuthChoicePage` | Logged-out only | — |
| `/auth/user` | `app/auth/user/page.tsx` | (not traced) | Logged-out only | — |
| `/auth/user/login` | `app/auth/user/login/page.tsx` | `AuthShell` + `LoginPage` | Logged-out only | — |
| `/auth/user/signup` | `app/auth/user/signup/page.tsx` | `SignupPage` (`components/Auth/Signup.tsx`) | Logged-out only | — |
| `/auth/business` | `app/auth/business/page.tsx` | (not traced) | Logged-out only | — |
| `/auth/business/login` | `app/auth/business/login/page.tsx` | `AuthShell` + `LoginPage` | Logged-out only | — |
| `/auth/business/signup` | `app/auth/business/signup/page.tsx` | `BusinessSignupPage` | Logged-out only | — |
| `/forgot-password` | `app/forgot-password/page.tsx` | (not traced) | Logged-out only (presumed) | — |
| `/verify-code` | `app/verify-code/page.tsx` | (not traced) | Public | — |
| `/reset-password` | `app/reset-password/page.tsx` | (not traced) | Public | — |
| `/verify-email` | `app/verify-email/page.tsx` | inline (imports `Link` only) | Public | `?token=` |
| `/email-sent` | `app/email-sent/page.tsx` | (not traced) | Public | — |
| `/blocked` | `app/blocked/page.tsx` | `BlockedPage` | — | shown to `isblocked` accounts |
| `/unauthorized` | `app/unauthorized/page.tsx` | `UnauthorizedPage` | — | wrong-role landing |
| `/privacy-policy`, `/terms-and-conditions`, `/terms-of-service` | — | `LegalLayout` | Public | static legal content |
| `/v2.0` | `app/v2.0/page.tsx` | inline | ❓ | ⚠️ UNVERIFIED purpose — possibly a WIP/preview route |
| **Dashboard (business + super-admin shell)** | | | | |
| `/dashboard` | `app/dashboard/page.tsx` | `Dashboard` (`components/Dashboard/dashboard.tsx`) | Business | Overview/stats |
| `/dashboard/complete-profile` | | `CompleteProfilePage` | User (post-signup gate) | |
| `/dashboard/profile` | | `ProfilePage` | User | |
| `/dashboard/settings` | | `Settings` | Business | |
| `/dashboard/favorite` | | `FavoritesPage` | User | business-side view of favorites, ⚠️ possibly same concept as `/favorites` — confirm before building two screens |
| `/dashboard/events` | | `EventsBackend` (`components/Dashboard/Events/EventsPage.tsx`) | Business | "My events" list — this session rebuilt its UI (Manage button, Upcoming/Live/Past tabs, Archive) |
| `/dashboard/events/add-event` | | (event create/edit form) | Business | `EventsForm.tsx` — full sidebar-nav multi-tab form built this session (Basic Info, Pricing, Promo Codes, Settings, etc.) |
| `/dashboard/events/redemtion-table/[id]` | | `ManageEventPage` | Business | **This is the actual "Manage Event" screen** (Overview/Orders/Attendees/Scanning/Verify/Analytics sidebar) despite the URL's legacy name — built this session |
| `/dashboard/events/redemtion-table` | | `EventRedemptionTable` | Business | list of events to pick from before drilling into Manage Event |
| `/dashboard/events/verify-event` | | `VerifyEventPage` (`VerifyEvents.tsx`) | Business | scanner-based ticket verification |
| `/dashboard/tickets` | | `Ticket` (`components/Dashboard/Ticket/Ticket.tsx`) | User | "My tickets" list — ⚠️ likely overlaps with `/activity`; confirm canonical screen |
| `/dashboard/deals`, `/deals/new`, `/deals/edit`, `/deals/verify-deal`, `/deals/redeemtion/[id]` | | `DealsPage`/`DealForm`/`EditDealForm`/`VerifyDealPage`/`RedemtionTable` | Business | deal CRUD + redemption + scanning |
| `/dashboard/services`, `/services/add`, `/services/edit/[id]` | | `ServicesTable` + form | Business | service catalog CRUD |
| `/dashboard/inventory` | | `ServicePage` (`components/Dashboard/Inventory/Service.tsx`) | Business | ⚠️ naming overlap with "services" — confirm these are actually distinct concepts (categories/inventory-style services vs. bookable services) |
| `/dashboard/employees`, `/employees/add`, `/employees/edit/[id]`, `/employees/schedule-shift` | | employee CRUD + shift scheduling | Business | |
| `/dashboard/resources`, `/resources/[id]` | | `Resources` + `ResourceSchedulePage` | Business | resource-capacity scheduling (for `resource_based`/`group_session` services) |
| `/dashboard/calendar` | | `Calendar` | Business | booking calendar |
| `/dashboard/reservations`, `/todayreservations` | | `Reservation` / `TodayReservations` | Business | |
| `/dashboard/bookings`, `/bookings/success` | | `BookingsTable` (business list) / `BookingSuccessPage` | Business | note: `BookingSuccessPage` lives at `components/Business/SingleBusinessPage/Bookings/Success.tsx` — under the *consumer-facing* business folder despite being routed under `/dashboard` |
| `/dashboard/my-bookings` | | `UserBookings` | User | **this is the actual consumer "my bookings" screen** |
| `/dashboard/clients` | | (not traced) | Business | |
| **Super-admin** | | | | |
| `/super-admin` | `app/super-admin/page.tsx` | `Dashboard` (same component as `/dashboard`!) | ⚠️ likely a bug/placeholder — see `99-open-questions.md` |
| `/super-admin/businesses` | | `SuperAdminBusiness` | Super-admin | |
| `/super-admin/users` | | `SuperAdminUser` | Super-admin | |
| `/super-admin/events` | | `SuperAdminEvent` | Super-admin | |
| `/super-admin/deals` | | `SuperAdminDeals` | Super-admin | |

---

## Detailed screens (core consumer + business flows)

### Landing (`/`, `LandingPage`)
Homepage aggregating featured content by city (via `GET /api/landing?city=`), gated by
the global `CityFilterProvider` (`contexts/city-filter-context.tsx`) which almost
certainly drives a persistent city picker in the header. Components used: hero/banner,
featured events, featured deals, featured/sponsored businesses (`isSponsor` flag on
both `User` and `Event`), a bottom nav (`components/ResuableComponents/BottomNavbar.tsx`,
rendered globally in `app/layout.tsx:56` and hidden on desktop via the `md:pb-0`
padding pattern). **Proposed Expo Router path**: `app/(tabs)/index.tsx`.

### Events list (`/events`, `EventsPageClient`)
Browse/filter events. Query params surfaced by `useGetAllEvents`
(`services/event.service.ts:148-177`): `category, search, city, community, from, to,
lat, lng, radius`. Card taps navigate to `/events/[slug]`. **Proposed path**:
`app/(tabs)/events/index.tsx`.

### Event detail + checkout (`/events/[id]`, `SingleEventPage.tsx`)
The most complex consumer screen, extensively built/hardened this session:
- **Layout**: hero image, title, date/time, venue (with a Leaflet map + "View map"
  link), host/business summary, reviews, and — depending on `price_category` — either
  a ticket-options list with quantity steppers (`paid`), a single "Register" button with
  a remaining-spots counter (`registration`), or a "Get Tickets" external link
  (`external`).
- **Ticket purchase flow** (paid events), as a modal (`components/Stripe/EventCheckOut.tsx`):
  1. **Tickets** step — quantity per option, capped by `remaining` (capacity − sold −
     held) and by `max_tickets_per_request`.
  2. **Details** step (guests only — skipped entirely for a signed-in buyer) — name,
     email, phone.
  3. **Checkout** step — hold countdown banner ("Your tickets are on hold for
     04:32"), promo code field + live re-pricing, itemized order summary (ticket lines,
     service fee, surcharge, total), Stripe `PaymentElement` (tabs layout — Card +
     Apple Pay), Pay button.
  - Step indicator uses icons (Ticket/User/CreditCard), not numerals.
  - Clicking Buy calls `getEventTicketPaymentIntent` then `POST /api/event/ticket/hold`
    (5-minute reservation); closing the modal or letting the timer expire releases the
    hold; re-entering pricing (promo applied) re-hold automatically.
  - On successful Stripe confirmation, `POST /api/event/ticket/purchase` finalizes. A
    signed-in buyer sees a success toast and stays on the page (button becomes "Buy
    More Tickets"). **A guest buyer is redirected to `/checkout/receipt/[purchaseId]`**
    (this session's most recent addition) since they have no Activity page to find
    their ticket in later.
  - Error/edge handling built this session: if payment succeeds but finalize fails
    (e.g. a lost session), the buyer sees a "confirm your details" recovery dialog
    that retries the *same* PaymentIntent rather than losing the charge; the Pay
    button stays disabled through the whole charge→finalize window to prevent
    double-submit.
- **Free registration**: "Register" button → `POST /api/event/redeem`, shows the
  resulting QR code inline.
- **Proposed path**: `app/(tabs)/events/[slug].tsx`, with the checkout flow as a modal
  route (`app/(tabs)/events/[slug]/checkout.tsx` or an in-screen bottom sheet) — Stripe's
  React Native SDK (`@stripe/stripe-react-native`) has its own `PaymentSheet`, which is
  the natural replacement for the web `PaymentElement`; this needs a client secret from
  the same pricing/hold endpoints (a Server Action currently — see the gap report).

### Guest ticket receipt (`/checkout/receipt/[id]`, `GuestTicketReceiptPage.tsx`)
Shown immediately after a guest completes checkout. **Not securable by URL alone** — it
reads its data purely from `sessionStorage` (key `wha-guest-receipt-<purchaseId>`,
written by `SingleEventPage.tsx` right after a successful finalize using the
`receipt` object the API now returns). Typing/pasting the URL fresh finds nothing and
shows a "not available, check your email" state. Layout mirrors `TicketDetailPage`: QR
code carousel (one per ticket), date/venue card, invoice breakdown, Download Ticket /
Download Invoice (client-side PDF via jsPDF + the already-rendered QR canvases), and a
"Continue browsing" link. **Mobile equivalent**: since there's no `sessionStorage`
across app installs/tabs, use a securely-stored (e.g. `expo-secure-store` or an
in-memory nav param) one-time payload passed directly from the checkout screen's
success handler — do not build a "receipt by ID" API endpoint without an auth check,
since that would newly expose ticket/QR data to anyone who can guess a purchase ID.

### Activity hub (`/activity`, `ActivityPage`)
Signed-in user's "everything I've bought/booked" list — backed by `GET /api/tickets`,
which merges deal redemptions + event redemptions + event ticket purchases into one
array (`app/api/tickets/route.ts`). Tapping an item navigates to
`/activity/tickets/[id]`. **Proposed path**: `app/(tabs)/activity/index.tsx`.

### Ticket detail (`/activity/tickets/[id]`, `TicketDetailPage.tsx`)
Full-screen ticket view: QR carousel (one code per ticket in the purchase, swipeable),
checked-in badge per code, date/time/venue, invoice breakdown (itemized, service fee,
surcharge, promo code, total), Download Ticket (per-code QR PDF) and Download Invoice
(A4 PDF) buttons, share sheet. Data comes from the same `GET /api/tickets` list (found
by `_id` client-side) rather than a dedicated single-ticket endpoint — ⚠️ note for
mobile: either fetch the whole list and find-by-id the same way, or add a real
`GET /api/tickets/:id` (see gap report).

### Business directory (`/search` → `BusinessesClientPage`)
List/search screen despite the URL. Filters per `useGetBusiness`
(`services/business.service.ts:49-68`): `category, search, service, city, community`
plus **two different geo modes** — radius (`lat,lng,radius`) and bounding-box
(`swLat,swLng,neLat,neLng`) for a map-viewport search, implying the web UI has (or had)
a map view toggle. **Proposed path**: `app/(tabs)/businesses/index.tsx`.

### Business detail (`/businesses/[id]`, `SingleBusinessPage`)
Business profile: hero/gallery (`venue_images`, `portfolio_images`), hours
(`OperatingHour` data), services list (if `business_type === "employee_based"` or
`item_based"`), reviews + reply threads, a favorite button, and (for bookable
businesses) a path into the booking flow. **Proposed path**: `app/(tabs)/businesses/[id].tsx`.

### Deals list / detail (`/deals`, `/deals/[id]`)
Coupon-style listing and detail with redemption. A deal's `deal_code`/generated
`uniqueKey` is likely shown as a QR/code for in-person redemption, mirroring the event
redemption pattern. `discount_percentage`, `valid_till`, `max_redemptions` vs.
`current_redemptions` (capacity messaging) are the key data points. **Proposed paths**:
`app/(tabs)/deals/index.tsx`, `app/(tabs)/deals/[id].tsx`.

### Bookings — consumer flow (`/bookings`, `BookingsContainer`)
Browse bookable services, pick a service → employee (if applicable) → date/time (via
`GET /api/bookings/available-slots`) → lock the slot (`POST /api/bookings/lock`,
returns `lock_id` + `total_price`) → confirm (`POST /api/bookings`). **No online
payment currently happens in this path** — the booking is created with
`payment_status: "pending"` (see the dead `checkout-session` flag in
`04-api-reference.md`); ⚠️ OPEN QUESTION whether payment is meant to happen in-person or
this is an incomplete feature — confirm with the team before deciding whether the
mobile app needs a payment step here at all. **Proposed path**:
`app/(tabs)/bookings/...` as a multi-step flow, likely a stack navigator.

### My bookings — consumer (`/dashboard/my-bookings`, `UserBookings`)
The actual consumer-facing "my upcoming/past bookings" screen (despite living under the
`/dashboard` URL prefix, which elsewhere means "business dashboard" — an inconsistency
worth flagging). Confirmed data source: `GET /api/bookings/user` (list) and
`PATCH /api/bookings/user/[id]` with `{action:"cancel"}` (cancel) — not the
business-scoped `GET /api/bookings`.

### Auth screens (`/auth`, `/auth/user/*`, `/auth/business/*`)
`AuthChoicePage` (`/auth`) offers "Continue as a customer" vs. "I'm a business" (each
leading to its own login/signup pair). `LoginPage` (shared component, parameterized by
`loginType`) renders email/password + a "Continue with Google" button; the Sign In
button was fixed this session to `type="button"` to prevent a native-form-submit page
reload. Signup (`Signup.tsx` / `BusinessSignupPage.tsx`) is a multi-field form gated by
the email-verification-code flow described in `05-auth-and-user.md`, ending with
`router.replace("/auth?tab=login")` on success (not an auto-login). Google signup
auto-creates a `category:"user"` account only — business accounts cannot originate from
Google. **Proposed paths**: `app/(auth)/choice.tsx`, `app/(auth)/login.tsx` (with a
`role` param), `app/(auth)/signup.tsx`.

### Manage Event — business (`/dashboard/events/redemtion-table/[id]`, `ManageEventPage.tsx`)
The most-iterated business screen this session. Sidebar sections: **Overview**
(sold/capacity stats, "Earnings by Ticket Type" card), **Orders** (searchable table —
invoice/buyer — with per-row View/Print/Send-Invoice/Download-Tickets actions, a
top-level "Generate Sales Report" submenu producing CSV or PDF with per-ticket-type
price/sold-count/promo-uses/discount-given columns and a buyer-level promo-usage
table), **Attendees** (searchable by name, manual status-change dropdown with an
"Are you sure?" confirmation, clearing the check-in date on revert-to-pending),
**Scanning count**, **Verify Tickets** (an event-scoped QR scanner replacing the older
generic "Host App" concept), **Analytics**. A red dot appears on any sidebar section
whose tab currently has a validation error (used on the event-edit form, not this page
itself — cross-reference `07-forms-and-validation.md`). Low priority for a first mobile
release (business-operator tooling) unless the team wants a business-side companion
app — flag in `99-open-questions.md`.

### My events — business (`/dashboard/events`, `EventsPage.tsx`)
List of the business's own events with Upcoming/Live/Past tabs, a "Manage" button per
row (→ Manage Event above), and an Archive action gated by real business rules: an
event can only be archived once it has ended, and only if it never sold a ticket OR has
now ended (see `06-features-and-business-logic.md` for the exact rule) — editing an
already-active event's end date can't be moved earlier than its previous end date.

### Dashboard overview — business (`/dashboard`, `Dashboard`)
Stats overview (`GET /api/business-dashboard`): daily stats series, total
appointments/sales, recent/upcoming/today bookings. Low mobile priority (business
back-office).

### Profile / Settings (`/dashboard/profile`, `/dashboard/settings`)
Standard profile editor (name, image, contact info, location) and business settings
(operating hours, business type, ABN, SEO fields). Straightforward CRUD forms — see
`07-forms-and-validation.md`.

---

## Screens not detailed here (lower mobile priority, still catalogued above)

Employee/resource/shift scheduling, clients, inventory, calendar, reservations,
super-admin panels, and the Sanatan Samaj vertical are business/operator or
platform-admin tooling. They're listed in the sitemap table with file citations so a
future session can pick them up, but weren't traced screen-by-screen in this pass —
treat any UI description for them as ⚠️ UNVERIFIED until read directly.

## Web-only patterns needing a mobile equivalent

- **Bottom-of-viewport sticky "Buy"/"Book" bar** on mobile web (`md:hidden` fixed
  footer, seen in `SingleEventPage.tsx`) → this maps naturally to a persistent
  bottom action bar in RN (not a tab bar item — a screen-level footer).
- **Hover-triggered dropdown menus** (business row actions, `DropdownMenu` from
  shadcn) → RN has no hover; use a long-press or an explicit "..." button opening an
  action sheet (`expo-router`'s modal or a bottom-sheet library).
- **Leaflet/OpenStreetMap embeds** → `react-native-maps` (or Apple/Google native maps)
  for venue location display.
- **Wide data tables** (Orders, Attendees, Clients, Bookings lists in the business
  dashboard) → these are desktop-oriented and not a mobile-app priority; if ported,
  use a card-list layout instead of a literal table.
