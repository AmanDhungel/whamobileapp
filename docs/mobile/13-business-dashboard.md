# 13 — Business dashboard (web `/dashboard/*` for `category: "business"`)

Source of truth: the website repo `F:\WHA` at HEAD `39335fd` (read-only, 2026-10-02). Every
fact below was read from code; file:line references point into `F:\WHA`. Anything not
provable from code is marked **UNVERIFIED**. Part 1 is the synthesis (what the mobile app
needs to know and decide); Part 2 holds the five detailed per-area reports (screens,
endpoints, exact response types, zod schemas, exact copy).

Versions: next 16.1.6, next-auth ^4.24.13, @tanstack/react-query ^5.90, zod 4.4.3,
mongoose 9.6.1.

---

# Part 1 — Synthesis

## 1. Headline findings

1. **The mobile app can't call any business-dashboard API today.** Every dashboard route
   uses `getServerSession(authOptions)` (NextAuth cookie). Only consumer routes and
   `/api/edit-profile`, `/api/upload-profile-pic` were moved to `getAuthUser` (§4).
2. **Server-side role checks are mostly missing.** Only `business-dashboard`, `clients*`,
   `dashboard/search` and `notifications` (GET) check `category === "business"`. Every
   other business route only checks "logged in" and scopes by `session.user.id`, so a
   customer account can create services/employees/deals under its own id.
3. **`isblocked` is enforced only client-side for the dashboard** (`DashboardLayout.tsx:530`
   → `/blocked`). No dashboard API checks it. `getAuthUser` does (bearer *and* cookie path),
   so swapping a route to it makes the web stricter for blocked businesses (§6, decision D3).
4. **Navigation has no conditions.** The business sidebar is a fixed 9-item list; nothing
   depends on `business_type`, `verified`, `isblocked` or profile completeness (§2).
5. **`business_type` (`employee_based` / `item_based`) gates nothing** in the dashboard.
   Behaviour differences come from the per-service `service_type`:
   `employee_based | resource_based | group_session` (`server/models/Service.model.ts:50-54`).
6. **Complete-profile is dead on the web**: the redirect fires only for
   `category === "none"` (not in the enum), and its submit POSTs to a PATCH-only route.
7. **`/dashboard/inventory` is a dead prototype**: `/api/inventory` doesn't exist (§5 #2).
8. **Deal-code verification can never succeed**: `/api/deals/verify` queries `uniqueKey`,
   the schema field is `uniqueKeys[]` → always 404 "Invalid code. No record found." (Part 2, Area 3 §7).
9. **Notifications exist only for appointments and reviews** (`type` enum
   `["appointment","review"]`). There is no notification for ticket sales or deal
   redemptions, and no DELETE endpoint (§5).
10. **Web fetch helpers swallow errors**: `lib/action.ts` `Get` never throws on non-2xx, so
    web screens have no real error states; `Post`/`PATCH` throw `Error(rawBodyText)`.
    Mobile must not copy the web's error handling — it has its own client (`src/api/client.ts`).

## 2. Navigation and gates (web)

Business sidebar — `components/ResuableComponents/Sidebar.tsx:33-90` (lucide icons). No
item has a condition (`Sidebar` calls `useSession()` but never reads it).

| # | Label | Route(s) | Icon | Condition |
|---|---|---|---|---|
| 1 | Dashboard | `/dashboard` | `LayoutDashboard` | none |
| 2 | Calendar (flyout) | Calendar `/dashboard/calendar` · Manage Reservations `/dashboard/reservations` · Todays Reservations `/dashboard/todayreservations` | `Calendar` | none |
| 3 | Deals | `/dashboard/deals` | `Tag` | none |
| 4 | Clients | `/dashboard/clients` | `Smile` | none |
| 5 | Catalog | `/dashboard/services` | `BookOpen` | none (Services/Inventory sub-flyout commented out) |
| 6 | Catalog (duplicate label) | `/dashboard/resources` | `Cog` | none |
| 7 | Marketing | `/dashboard/events` | `Megaphone` | none |
| 8 | Team (flyout) | Team members `/dashboard/employees` · Scheduled shifts `/dashboard/employees/schedule-shift` | `Users` | none |
| 9 | Settings | `/dashboard/settings` | `Settings` | none |

Top bar (business only, `DashboardLayout.tsx:575-615`): Search overlay
(`/api/dashboard/search?q=`), notification bell with unread badge (`"9+"` above 9),
avatar menu (only "Log out" works). Not in the nav: `/dashboard/profile` (consumer
sidebar only; business reaches settings instead), `/dashboard/bookings` (reached from
notifications), `/dashboard/inventory` (no nav entry).

Gates (complete list):
- `SessionWrapper.tsx:14-35` — unauthenticated → `/auth`; `category === "none"` →
  `/dashboard/complete-profile` (unreachable).
- `DashboardLayout.tsx:22-29,529-535` — `isblocked` → `/blocked` ("403" / "Access Blocked" /
  "This content is not accessible from your current location or network. Please contact
  administration for details." / "Go Front Page"); `category === "user"` on 6 prefixes
  (`bookings, deals, inventory, settings, complete-profile, clients`) → `/unauthorized`.
- `dashboard.tsx:542-556` — super-admin → `/super-admin`.

## 3. Screen inventory (where the detail lives)

| Web route | Component | Main endpoints | Part 2 |
|---|---|---|---|
| `/dashboard` | `components/Dashboard/dashboard.tsx` | GET `/api/business-dashboard` | Area 1 §2.1 |
| `/dashboard/complete-profile` | `CompleteProfile.tsx` (broken) | POST→PATCH-only `/api/business/profile` | Area 1 §2.2 |
| `/dashboard/profile` | profile page | POST `/api/edit-profile`, `/api/upload-profile-pic`, `/api/delete-profile` | Area 1 §2.3 |
| `/dashboard/settings` | `Settings*` tabs | GET `/api/business/getwithid/[id]`, PATCH `/api/business/settings` (multipart) | Area 1 §2.4 |
| notifications (bell) | `DashboardLayout.tsx` | GET `/api/notifications`, PATCH `/api/notifications/[id]` | Area 1 §2.5 |
| dashboard search | `SearchOverlay` | GET `/api/dashboard/search?q=` | Area 1 §2.6 |
| `/dashboard/clients` (+detail) | Clients | GET `/api/clients?q=`, `/api/clients/[id]` | Area 1 §2.7 |
| review replies | (public business page only) | POST `/api/review/reply/[id]` | Area 1 §2.8 |
| `/dashboard/events` | Events list | GET `/api/event`, archive, delete | Area 2 §1 |
| `/dashboard/events/add-event` | `EventsForm.tsx` | POST `/api/event`, PATCH `/api/event/edit/[id]`, GET `single-event-for-form/[id]` | Area 2 §2 |
| `/dashboard/events/redemtion-table` | Redemption overview | GET `/api/event/redeem/get-business` | Area 2 §3 |
| `/dashboard/events/redemtion-table/[id]` | Manage event | GET `/api/event/verify/[id]`, `/api/event/ticket/purchase`, send-invoice, verify/manual | Area 2 §4 |
| `/dashboard/events/verify-event` | Verify tickets | POST `/api/event/verify` | Area 2 §5 |
| `/dashboard/deals` (+new/edit/verify/redeemtion) | Deals | `/api/deals*` | Area 3 |
| `/dashboard/services` (+add/edit) | `ServicesTable`, `ServiceForm` | `/api/services*`, `/api/categories*` | Area 4 §2-3 |
| `/dashboard/inventory` | dead prototype | `/api/inventory` (404) | Area 4 §1, §4 |
| `/dashboard/employees` (+add/edit/schedule-shift) | Employee | `/api/employees*` | Area 4 §5-7 |
| `/dashboard/resources` (+[id]) | Resources | `/api/resources/*`, services | Area 5 §7.4-7.5 |
| `/dashboard/calendar` | `Calendar.tsx` | GET `/api/calendar/bookings`, POST `/api/calendar/appointments`, `/api/bookings/status`, `/api/bookings/[id]` | Area 5 §7.1 |
| `/dashboard/reservations` | `Reservation.tsx` | `/api/bookings`, status | Area 5 §7.2 |
| `/dashboard/todayreservations` | `TodayReservations.tsx` | GET `/api/bookings/today`, status | Area 5 §7.3 |
| `/dashboard/bookings` (+success) | `BookingsListBusiness.tsx` | GET `/api/bookings`, status; `/api/bookings/verify` | Area 5 §3-4 |

## 4. Auth audit — every API route the business dashboard calls

Legend — **Auth**: `session` = `getServerSession` only (cookie; mobile gets 401) ·
`getAuthUser` = bearer-first then cookie (mobile OK) · `none` = public.
**Role**: server-side category check. **Scope**: how the business is identified / ownership.
**Blk**: `isblocked` checked server-side.

| Route | Methods | Auth | Role check | Scope / ownership notes | Blk |
|---|---|---|---|---|---|
| `/api/business-dashboard` | GET | session | business | `session.user.id` | no |
| `/api/dashboard` | GET | session | branches on business/user | not used by any web screen | no |
| `/api/dashboard/search` | GET | session | business | own appointments/clients | no |
| `/api/notifications` | GET | session | business | own, 50 newest + `unread_count` | no |
| `/api/notifications/[id]` | PATCH | session | — | marks read; **PATCH only** (no GET/DELETE) | no |
| `/api/clients` | GET | session | business | own clients, `q` = name/email | no |
| `/api/clients/[id]` | GET | session | business | **cross-tenant user-info leak** (Area 1 §3) | no |
| `/api/review/reply/[id]` | POST | session | — | **any logged-in user can reply to any review** | no |
| `/api/business/getwithid/[id]` | GET | **none** | — | public read of a business (used by Settings) | no |
| `/api/business/settings` | PATCH | session | — | own user doc, multipart; every Settings tab writes here | no |
| `/api/business/profile` | PATCH | session | — | no working web caller | no |
| `/api/business/operating-hours` | GET, POST | session (GET) / **POST unauthenticated** | — | POST takes `business_id` from body; unused by UI | no |
| `/api/business/operating-hours/get-single/[id]` | GET | none | — | unused | no |
| `/api/business/abn`, `/api/business/businesstype` | POST | session | — | unused by UI (Settings uses `/business/settings`) | no |
| `/api/profile-complete-business` | POST, PATCH | session | — | not called anywhere | no |
| `/api/edit-profile` | POST | **getAuthUser** | — | own; phone/location/lat/lng | **yes** |
| `/api/upload-profile-pic` | POST | **getAuthUser** | — | own; field `file` | **yes** |
| `/api/delete-profile` | POST | session | — | own | no |
| `/api/event` | POST, GET | session | — | GET = own events | no |
| `/api/event/edit/[id]` | PATCH | session | super-admin bypass | owner or super-admin | no |
| `/api/event/delete/[id]` | POST | session | — | owner | no |
| `/api/event/archive/[id]` | POST | session | super-admin bypass | owner or super-admin; archive rule enforced | no |
| `/api/event/single-event-for-form/[id]` | GET | session | super-admin bypass | owner or super-admin | no |
| `/api/event/redeem/get-business` | GET | session | — | own events' redemptions | no |
| `/api/event/verify` | POST | session | — | scan verify (case-insensitive, trimmed) | no |
| `/api/event/verify/[id]` | GET | session | — | Manage Event data | no |
| `/api/event/verify/manual` | POST | session | — | attendee status (exact-match) | no |
| `/api/event/ticket/purchase` | GET | session (GET) | — | orders for Manage Event; POST is getAuthUser (consumer) | no |
| `/api/event/ticket/purchase/[purchaseId]/send-invoice` | POST | session | — | owning business | no |
| `/api/deals` | POST, GET | session | — | GET = own deals (+`verifiedRedemptions`) | no |
| `/api/deals/edit/[id]` | PATCH | session | — | owner (403 otherwise) | no |
| `/api/deals/delete/[id]` | POST | session | — | owner | no |
| `/api/deals/single-deal/[id]` | GET | none | — | public | no |
| `/api/deals/verify` | POST | session | — | business match; **broken field (`uniqueKey`)** | no |
| `/api/deals/redeem/single/[id]` | GET | session | — | **no ownership check** — any user sees any deal's redeemers | no |
| `/api/services` | POST, GET | session | — | own | no |
| `/api/services/single/[id]` | GET, POST (edit/toggle), DELETE | session | super-admin bypass on DELETE | owner | no |
| `/api/services/user` | GET | session | — | own | no |
| `/api/services/assign-employee` | POST | session | — | own | no |
| `/api/categories` | GET, POST | session | — | own | no |
| `/api/categories/[id]` | GET, PATCH, DELETE | session | — | own | no |
| `/api/employees` | POST, GET | session | — | own | no |
| `/api/employees/[id]` | GET, POST (edit), DELETE | session | — | own | no |
| `/api/employees/[id]/schedule` | PATCH | session | — | own | no |
| `/api/employees/time-off` | GET, POST | session | — | own | no |
| `/api/employees/time-off/[id]` | DELETE | session | — | own | no |
| `/api/employees/shift-overrides` | GET, POST (upsert) | session | — | own | no |
| `/api/employees/shift-overrides/[id]` | DELETE | session | — | own | no |
| `/api/resources/[id]/schedule` | PATCH | session | — | own | no |
| `/api/resources/overrides` | GET, POST, DELETE | session | — | own; **display-only** (never read by availability) | no |
| `/api/bookings` | POST, GET | session | — | GET = business's bookings | no |
| `/api/bookings/[id]` | PATCH | session | — | reschedule/status **without** state machine; rejects `arrived` | no |
| `/api/bookings/status` | PATCH | session | — | state machine (§5) | no |
| `/api/bookings/today` | GET | session | — | own | no |
| `/api/bookings/verify` | GET | **none** | — | by Stripe `session_id`; leaks booking data | no |
| `/api/bookings/available-slots` | GET | none | — | public | no |
| `/api/bookings/lock` | POST | session | — | consumer flow | no |
| `/api/calendar/bookings` | GET | session | — | own; paginated, default `limit` 10 (max 50) | no |
| `/api/calendar/appointments` | POST | session | — | own; walk-in appointment | no |

Not in the dashboard: `/api/user/profile` (GET, getAuthUser) and `/api/user/update` (PATCH,
getAuthUser) have **no callers**.

## 5. Open questions resolved

- **#2 — inventory.** `/api/inventory` does not exist (no `app/api/inventory`, no rewrites).
  `/dashboard/inventory` (`components/Dashboard/Inventory/Service.tsx`) calls it and ends in
  its empty state; its Mongoose model is commented out. "Inventory" survives only as the label
  for `service_type: "resource_based"` ("Resources (Inventory)", e.g. "Kayak, Tennis court"),
  scheduled under `/dashboard/resources`. **Inventory ≠ services; don't build it.**
- **#10 — profile endpoints.** Business **Settings** writes everything through
  `PATCH /api/business/settings` (multipart: phone, category, community, image, is24_7 +
  schedule, location/lat/lng, venue & portfolio images, ABN, business_type, SEO) and reads via
  the public `GET /api/business/getwithid/{id}`. **Profile** uses `POST /api/edit-profile`
  (phone/location/lat/lng), `POST /api/upload-profile-pic` (field `file`),
  `POST /api/delete-profile`. `/api/business/profile` has no working caller; `/api/user/profile`
  and `/api/user/update` have no callers. Name isn't editable anywhere.
- **#11 — isblocked.** Enforced: client redirect in `DashboardLayout.tsx:530`; every
  `getAuthUser` route (both paths); mobile refresh (`mobileTokens.ts:84,116`) and `/me`. Not
  enforced: any `session`-only route, NextAuth `signIn`, mobile `auth/login|social|guest`,
  `proxy.ts`. The NextAuth `jwt` callback re-reads the user from the DB on each call, so
  `session.user.isblocked` is fresh.
- **Complete-profile condition.** Only `category === "none"` — unreachable. No profile-field
  completeness is checked anywhere. (Mobile equivalent: none to mirror.)
- **`/api/bookings/status` transitions** (`app/api/bookings/status/route.ts:8-17`):

  | From | Allowed to |
  |---|---|
  | pending | confirmed, rescheduled, cancelled |
  | confirmed | arrived, completed, rescheduled, no_show, cancelled |
  | rescheduled | confirmed, arrived, cancelled |
  | arrived | completed, no_show, cancelled |
  | completed | refunded |
  | cancelled / no_show / refunded | — |

  Same status → 200 no-op; `refunded` also sets `payment_status = "refunded"`; `cancelled` /
  `rescheduled` email the customer. Each web screen offers a different subset (Area 5 §5).
  `PATCH /api/bookings/[id]` bypasses the machine (and rejects `arrived`).
- **Notification points** (`Notification` model: `business_id, type: "appointment"|"review",
  title, body, related_id, is_read`): new consumer booking (`app/api/bookings/route.ts:345-356`),
  customer cancel/reschedule (`lib/booking-notifications.ts:44-51`), new/edited review
  (`app/api/review/route.ts:77-83`, `review/edit/[id]/route.ts:52-58`). **No** notification for
  ticket sales, deal redemptions, Stripe webhook or business-created appointments.

## 6. Conflicts between the requested spec and the code (need a decision)

| # | Spec says | Code reality | Proposal |
|---|---|---|---|
| D1 | Phase 1 edits the backend | Earlier rule: don't edit `F:\WHA` (another session works there; HEAD moved to `39335fd`) | Need explicit go-ahead + coordination |
| D2 | "try the web session first, then bearer" | `getAuthUser` is **bearer first**, then cookie | Use `getAuthUser` as-is (web path unchanged) |
| D3 | Web behaviour must stay identical | `getAuthUser` also rejects **blocked/deleted** users on the cookie path → web becomes stricter | Accept (it closes a hole) or add a bearer-only variant |
| D4 | Gate menu by `business_type` "exactly as DashboardLayout" | Web gates nothing by `business_type` | Mirror web: no gating |
| D5 | Incomplete profile → complete-profile flow | Web condition is unreachable; form broken | Skip, or define a real rule (needs product decision) |
| D6 | Inventory CRUD | Dead prototype, no API | Drop Inventory |
| D7 | Notifications: read **and delete** | Only GET list + PATCH read | Read-only feed unless a DELETE route is added |
| D8 | Push on new booking, ticket sale, deal redemption | Only booking (+review) create notifications | Booking push now; ticket/deal need new call sites + enum values |
| D9 | Deal image upload as FormData `{uri,name,type}` | SDK 57 `expo/fetch` rejects `{uri}` parts ("Unsupported FormDataPart implementation") | Use expo-file-system `File` parts (as `src/services/imageUpload.ts` does) |
| D10 | lucide-react-native icons | App uses Feather (`@expo/vector-icons`) everywhere | Keep Feather for consistency, or migrate the whole app |
| D11 | Deals verification + redemptions list | Verify always 404s (`uniqueKey` vs `uniqueKeys`); redemptions endpoint has no ownership check | Backend fix required before mobile can verify deals |
| D12 | Calendar day/week agenda | `/api/calendar/bookings` returns max 10 unless `limit` (≤50) + `page` sent | Mobile pages through results |
| D13 | Settings: operating hours via `/api/business/operating-hours` | Web writes `schedule` via `/api/business/settings` | Use `/api/business/settings` |

## 7. Remaining unknowns (UNVERIFIED)

- Whether old `Redemption` docs carry a singular `uniqueKey` (would make deal verify work for them).
- Exact zod-4 default messages where the web relies on defaults (e.g. calendar appointment
  `.datetime()` / `.int()`, EventsForm date defaults) — Area 2 §2 and Area 5 §6.8 list them.
- Archive rule timezone: `getEventStatus` runs on the server's timezone (UTC vs local).
- Whether the Stripe webhook's `Booking.create` fails (missing `duration`/`total_price`).
- Whether archived events can still be purchased (listing/detail don't filter; finalize not inspected).
- Toasts after the deal Edit form's double PATCH (TanStack v5 behaviour, not observed).

## 8. Phase 1 — backend changes (F:WHA branch `feature/mobile-business-auth`)

Decisions (2026-10-02): getAuthUser's blocked/deleted rejection on the web path is accepted;
no `business_type` gating; complete-profile skipped; Inventory dropped; notifications are a
read-only feed + mark read / mark all read; Feather icons; uploads use expo-file-system `File`
parts; currency AUD; booking status options come only from the server state machine (§5),
`/api/bookings/status` for status changes, `/api/bookings/[id]` only for reschedule; the
calendar pages `/api/calendar/bookings` with `limit=50`.

Done:
- `server/lib/businessAuth.ts` — `requireBusinessUser()`: bearer or cookie, category
  `business` (super-admin where the web already allowed it). Bearer rejections:
  `{ <key>: { message, code } }` with `TOKEN_INVALID` / `ACCOUNT_NOT_FOUND` (401),
  `ACCOUNT_BLOCKED` / `NOT_BUSINESS` (403). Web rejections keep each route's old body.
- Every route in §4 marked `session` (except the unused/consumer ones below) now accepts
  bearer tokens. Fixes: deals/verify field (`uniqueKeys`, case-insensitive);
  deals/redeem/single ownership; clients/[id] leak; review reply only by the review's
  business; employees/[id], time-off, shift-overrides GET authenticated + scoped;
  bookings/verify limited to the booking's customer/business.
- New: `PATCH /api/notifications` (mark all read → `{ data: { updated }, unread_count: 0 }`);
  `POST|DELETE /api/mobile/v1/notifications/register-token` (`{ token, platform }` /
  `{ token }`, mobile envelope); pushes (Expo) on new booking and customer
  cancel/reschedule, `data: { type: "appointment", related_id }`.
- Also fixed (2026-10-05): `GET /api/event/verify/[id]` (attendees) only for the event's
  business or super-admin (else 404 "Event not found"); `/api/business/operating-hours`
  GET/POST require a signed-in business and POST ignores `body.business_id`.
- Tests: `docs/mobile/business-auth-matrix.mjs` (no auth / junk token, 64/64) and
  `docs/mobile/business-auth-e2e.mjs` (wha_test only: real bearer + real web cookie on every
  route, customer → 403 everywhere, business B isolated from A, every fix, push — 167/167).
  Branch pushed to `origin` (sunyaversetech/WHA), not merged.

Left unchanged on purpose: `POST /api/bookings` and `POST /api/event/ticket/purchase`
(consumer), `/api/event/delete/[id]` (disabled server-side), and the routes no screen uses
(`delete-profile`, `business/profile`, `abn`, `businesstype`, `profile-complete-business`,
`services/user`).

### TODO (follow-ups)
- **Push for ticket sales** — no Notification exists for them; needs a new `type` value and
  a call site where a purchase is finalised (`/api/event/ticket/purchase` POST / webhook).
- **Push for deal redemptions** — same: new `type` + call sites in `/api/deals/redeem` and
  `/api/deals/redeem/multiple`.
- **Website "Verify Deal" button** on `/dashboard/deals` sends no deal id, so the server
  always answers 403 "This code does not belong to this deal." Left for later; the app
  verifies codes from inside a deal (decision 2026-10-05). Verify also marks the whole
  multi-buy redemption verified from one code.
- **Archiving an event without coordinates 500s** ("Can't extract geo keys"): the Event
  schema defaults `geo.type = "Point"` with no coordinates and the 2dsphere index rejects it
  on `save()`; only the pre-save hook sets `geo` when lat/lng exist. Affects location-TBA
  events on web and app alike (pre-existing).

---

# Part 2 — Detailed per-area reports

The five reports below were produced by reading the source file by file. They contain the
per-screen breakdown (component files, endpoints + params, fields, actions, states with exact
copy), exact response TypeScript types, full zod schemas with exact error strings, React
Query keys/invalidations, and the contradictions with docs 03/04/06/07/99.


---

## Area 1 — Business dashboard shell and account screens (verified from source)

I read the web repo `F:\WHA` at HEAD `39335fd` (2026-10-01). All paths are relative to `F:\WHA` unless they say otherwise. Line numbers come from the files as they are now. Anything I could not confirm is marked **UNVERIFIED**.

**Top findings for the spec:**
- **No nav gating:** the business sidebar is a fixed 9-item array. No item depends on `business_type`, `verified`, `isblocked` or profile completeness.
- **`isblocked` is client-side only for the dashboard:** the only dashboard enforcement is one client-side `router.push("/blocked")`. Every dashboard API in this area accepts a blocked business.
- **Complete-profile redirect is dead:** it fires only when `category === "none"`, which the schema does not allow.
- **`/dashboard/complete-profile` is broken:** it POSTs to a PATCH-only route.
- **Settings use one endpoint:** every Settings tab saves through `PATCH /api/business/settings` (multipart). The `/api/business/operating-hours`, `/abn` and `/businesstype` routes are not called by any screen.
- **Mobile can't use most of these routes yet:** almost all of them use `getServerSession`, so they only work with the web cookie. A mobile bearer token gets a 401 from them.

---

### 1. Dashboard shell and navigation

#### 1.1 Layout chain
- `app/dashboard/layout.tsx:9-15` wraps every `/dashboard/*` page in `DashboardLayoutContent` from `components/Dashboard/DashboardLayout.tsx`.
- `app/layout.tsx:49` wraps the whole app in `SessionWrapper` (`components/Auth/SessionWrapper.tsx`), which contains the `AuthGuard` redirects.
- `components/ResuableComponents/NavbarProvider.tsx:12-14` renders `DashboardNavbar` on `/dashboard*` and `/super-admin*`. `DashboardNavbar.tsx` is **entirely commented out** (lines 6-135) and renders an empty `<nav>`. Its verified / pending-verification badges and its dropdown are dead code.
- `components/Dashboard/MobileDashboard.tsx` is **never imported** (grep found no importer), so it is dead code.
- `components/Dashboard/UserAccountMenu.tsx` is rendered by `dashboard.tsx:556,926` for non-business accounts only.

#### 1.2 Which sidebar is shown
`DashboardLayout.tsx:537,569`:
```ts
const isBusiness = session?.user?.category === "business";
{isBusiness ? <Sidebar /> : <UserSidebar />}
```
- **Business:** `components/ResuableComponents/Sidebar.tsx`. It is a fixed 48px icon rail (`ml-12`) and is visible on mobile too; there is no `md:` hide.
- **Everyone else, including super-admin:** `User-Sidebar.tsx`, which is `hidden md:flex`, so it is hidden on mobile.

#### 1.3 Business sidebar items (`Sidebar.tsx:33-90`)
No item has a condition. `Sidebar` calls `useSession()` (line 95) but never reads it. There is no check on `business_type`, `verified`, `isblocked` or profile completeness.

| # | Label (`title`) | Route | Icon (lucide) | Condition |
|---|---|---|---|---|
| 1 | Dashboard | `/dashboard` (active only on exact match, l.100-101) | `LayoutDashboard` | none |
| 2 | Calendar (flyout, no href) | → "Calendar" `/dashboard/calendar`; "Manage Reservations" `/dashboard/reservations`; "Todays Reservations" `/dashboard/todayreservations` | `Calendar` | none |
| 3 | Deals | `/dashboard/deals` | `Tag` | none |
| 4 | Clients | `/dashboard/clients` | `Smile` | none |
| 5 | Catalog | `/dashboard/services` | `BookOpen` | none (the Services/Inventory sub-flyout is commented out, l.57-66) |
| 6 | Catalog (**duplicate label**) | `/dashboard/resources` | `Cog` | none. Note: `key={item.label}` (l.139) is duplicated, which triggers a React key warning. |
| 7 | Marketing | `/dashboard/events` | `Megaphone` | none |
| 8 | Team (flyout) | → "Team members" `/dashboard/employees`; "Scheduled shifts" `/dashboard/employees/schedule-shift` | `Users` | none |
| 9 | Settings | `/dashboard/settings` | `Settings` | none |
| – | Help (bottom) | no handler (l.200-206) | `HelpCircle` | inert |

- The flyout header has "..." (`MoreHorizontal`) and "+" (`Plus`) buttons with no handlers (l.241-250).
- Clicking the logo goes to `/` (l.127).

#### 1.4 Consumer sidebar (`User-Sidebar.tsx:38-84`, desktop only)
| Label | Route | Icon |
|---|---|---|
| dashboard | `/dashboard` (`?city=` kept) | `LayoutDashboard` |
| Favorites | `/dashboard/favorite` | `HeartPlus` |
| profile | `/dashboard/profile` | `User` |
| My Bookings | `/dashboard/my-bookings` | `CalendarCheck` |
| tickets | `/dashboard/tickets` (no city param) | `TicketCheck` |

For consumers, `/dashboard` renders `UserAccountMenu` (`UserAccountMenu.tsx:26-31`):
- Profile (`User`) → `/dashboard/profile`
- Favourites (`Heart`) → `/dashboard/favorite`
- Tickets (`Ticket`) → `/dashboard/tickets`
- My Bookings (`CalendarCheck`) → `/dashboard/my-bookings`
- Log out, via `LogoutDialog`

#### 1.5 Business top bar (`DashboardLayout.tsx:575-615`, only when `isBusiness`)
- **Search** (`Search` icon) opens `SearchOverlay` (§2.6).
- **Bell** (`Bell` icon) opens `NotificationDrawer` (§2.5).
  - The badge shows when `unreadCount > 0`, and reads `"9+"` when the count is over 9 (l.587-591).
- **Avatar:** `session.user.image`, falling back to the first 2 letters of `displayName` in upper case.
  - `displayName = session.user.name ?? business_name ?? "User"` (l.562-564).
  - Tapping it opens `ProfileDropdown` (l.82-142). Everything in the dropdown is hard-coded:
    - The subtitle is always "No reviews yet".
    - The "Verify your email address / Secure your account" banner is always shown and does nothing.
    - "My profile", "Personal settings", "Help and support" and "English (US) us" have **no onClick**.
    - Only "Log out" works: `signOut({ callbackUrl: "/" })`.

#### 1.6 Redirects and gates (complete list for `/dashboard/*`)
1. **AuthGuard** (`SessionWrapper.tsx:14-35`):
   ```ts
   if (status === "unauthenticated" && pathname.startsWith("/dashboard")) router.push("/auth");
   if (status === "authenticated" && pathname.startsWith("/auth")) router.push("/dashboard");
   if (status === "authenticated" && userCategory === "none" && pathname !== "/dashboard/complete-profile")
     router.push("/dashboard/complete-profile");
   if (status === "loading") return <LoadingPage />;
   ```
2. **DashboardLayout** (`DashboardLayout.tsx:22-29, 529-535`):
   ```ts
   const PROTECTED_PATHS = ["/dashboard/bookings","/dashboard/deals","/dashboard/inventory",
     "/dashboard/settings","/dashboard/complete-profile","/dashboard/clients"];
   useEffect(() => {
     if (session?.user?.isblocked) router.push("/blocked");
     if (session?.user?.category === "user") {
       const blocked = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
       if (blocked) router.push("/unauthorized");
     }
   }, [pathname, session, router]);
   ```
   The client-side role gate covers only those 6 prefixes. Consumers are **not** redirected away from `/dashboard/calendar`, `/services`, `/employees`, `/resources`, `/events`, `/reservations` and so on.
3. **dashboard.tsx:542-556**:
   - super-admin is pushed to `/super-admin`.
   - `status==="loading"` shows `<BizSkeleton/>`.
   - `unauthenticated` shows "Access Denied. Please log in."
   - non-business accounts get `<UserAccountMenu/>`.
4. **Unverified business:** there is **no gate anywhere** in the dashboard. The only references to `verified` are in the commented-out `DashboardNavbar.tsx:26-38`.
5. **Profile completeness:** there is no check on any business field such as `business_type`, `abn_number`, `location` or `schedule`.

**What sends a business to complete-profile?** Only `session.user.category === "none"`. The `category` enum in `server/models/Auth.model.ts:6-9` is `["user","business","super-admin"]`. Every creation path (signup, the Google auto-create at `app/api/auth/[...nextauth]/route.ts:92-102`) sets a valid value. So the redirect is **unreachable in practice**; whether any old documents hold "none" is UNVERIFIED. `/dashboard/complete-profile` is also in `PROTECTED_PATHS`, so a `user` account visiting it is sent to `/unauthorized`.

---

### 2. Routes

#### 2.1 `/dashboard` (business overview)
- **Files:** `app/dashboard/page.tsx` renders `components/Dashboard/dashboard.tsx`. `/super-admin` (`app/super-admin/page.tsx`) renders the same component.
- **Data:** `useGetBusinessDashboard()` (`services/dashboard.service.ts:4-15`).
  - React Query key `["business-dashboard"]`; `GET /api/business-dashboard` with no query params. `queryKey` is null, so `useFetcher` adds no `page`/`per_page` (`lib/generic.service.ts`).
  - It is called **for every category** with no `enabled` flag, so consumers also fire it and get a 401.
  - `Get()` (`lib/action.ts`) never throws on non-2xx; it returns the JSON. **There is no error UI**: a 401 or 500 shows the empty states.
- `useGetDashboardData` (`GET /api/dashboard`, key `["dashboard"]`) is **not used by any component** (grep).
- **Loading:** `BizSkeleton` while the session is loading or `isBusiness && isPending`.

Cards (`dashboard.tsx:612-921`). Every card has the same empty-state layout: an icon, a title and a subtitle.

| Card | Source | Displayed | Empty copy (title / sub) |
|---|---|---|---|
| "Recent sales" / "Last 7 days" | `dailyStats`, `totalSales`, `totalAppointments` | `A$ {totalSales.toFixed(2)}`, "Appointments **n**", an SVG line chart (Sales `#3771db`, Appointments `#10b981`, x labels `d MMM`) | Shown when `dailyStats.length===0`, which never happens because the server always returns 7 rows: "No Sales Data" / "Make some appointments for sales data to appear" |
| "Upcoming appointments" / "Next 7 days" | `upcomingBookings.slice(0,6)` | `BookingRow` (`EEE HH:mm`) | "Your schedule is empty" / "Make some appointments for schedule data to appear" |
| "Appointments activity" | `recentBookings` (scroll box, max height 336) | `BookingRow` (`EEE, d MMM yyyy HH:mm`) | "No recent activity" / "Visit the calendar section to add some appointments" ("calendar" links to `/dashboard/calendar`) |
| "Today's next appointments" | `todayBookings` | `BookingRow` short | "No Appointments Today" / same calendar copy |
| "Top services" | **derived client-side** from `recentBookings` (last 7 days, at most 10), top 5 by count | columns "Service", "This month", "Last month" (Last month is **hard-coded 0**) | "No sales this month" / "Create some sales for sales data to appear" |
| "Top team member" | derived the same way from `employee_id` | avatar initial + name | same as above |

`BookingRow` (l.294-398) shows:
- A day number and a month abbreviation.
- A status pill. Colours exist for confirmed, cancelled, completed, pending, booked, no_show and rescheduled; anything else is grey; the default text is "pending".
- `service_id.name`, falling back to "Service".
- A subline built from `booking_type ?? type`, the duration (`1h 30min` style) and "with {employee_id.full_name}".

Bugs to know:
- The API never populates `employee_id`, so "with …" never renders and Top team member names always show **"Unknown"**.
- `booking_type`/`type` are not fields on the Booking schema, so that part of the subline is always null.

#### 2.2 `/dashboard/complete-profile`
- **Files:** `app/dashboard/complete-profile/page.tsx` renders `components/CompleteProfile.tsx`.
- **Form:** a react-hook-form discriminated union on `role`, with default `role:"user", country_code:"+1"`.
  - **user:** Country select (`+61` "au +61", `+977`), Username, Phone Number.
  - **business:** Business Name; Business Category select (restaurants, cafes, food_trucks, grocery, salons, consultancies, event, others); Service Category; a "Services Offered" list (Service Name, Price Category hr/day/monthly/unit, Description) with nested "Resources (Staff/Tools)" (Resource Name, Price, Type).
  - Note: `location` is required by the business schema but there is **no input for it**, so business submission always fails validation.
- **Submit** (l.167-173): `fetch("/api/business/profile", { method: "POST", body: JSON.stringify(data) })` with no Content-Type. `/api/business/profile` only exports **PATCH**, so this returns **405**. On `response.ok` it would `alert("Profile Saved!")`. There is no error handling or UI.
- `/api/profile-complete-business` (POST/PATCH) is **not called by any web code** (grep).
- **This screen is non-functional.**

#### 2.3 `/dashboard/profile`
- **Files:** `app/dashboard/profile/page.tsx` renders `components/Profile/ProfilePage.tsx`. The same page serves consumers and businesses.
- **Displayed** (all from `useSession()`, not fetched):
  - `ProfileAvatar` (`components/Dashboard/ProfilePic.tsx`).
  - H2 = `session.user.business_name || "User Name"`.
  - InfoRows: "Full name" (`name`), "Email", "Mobile Number" (`phone_number || "-"`).
  - "My addresses" → "Home" → `location || "No address found"`.
  - "Account Management" with "Warning: Deleting your account is permanent."
- **Actions:**
  - **Edit Number** / **Edit Address** (Nominatim autocomplete via `ProfileLocationFormField.tsx`; "Use current location"; "No results found.") then "Save Changes" calls `useEditProfile` → **`POST /api/edit-profile`** (`services/Auth/auth.service.ts:64-73`, mutationKey `["editProfile"]`).
    - The body contains only the non-empty fields among `{phone_number, location, latitude, longitude}`.
    - If nothing is set: toast "No changes detected".
    - Success: `await update()` (refreshes the session), toast "Profile updated", close the phone editor. **No React Query invalidation.**
    - Error: `toast.error(error.message || "Failed to update profile")`. `error.message` is the **raw response body text**, because `Post` throws `new Error(await res.text())`.
  - **Avatar:** a file input accepting `.jpg,.jpeg,.png,.webp` calls `useCreateProfilePic` → **`POST /api/upload-profile-pic`** (`services/profile-pic.service.ts`, key `["createProfilePic"]`) with FormData field **`file`**.
    - Success: toast "Profile picture updated successfully!" then `router.refresh()`.
    - Error: "Failed to upload profile picture. Please try again."
    - No invalidation.
  - **Delete My Account** (`DeleteConfirmDialog`, text "This Account") calls `useDeleteProfile` → **`POST /api/delete-profile`** with body `{id}`.
    - Success: `signOut({callbackUrl:"/"})`.
    - Error: `error.response?.data?.message || "Failed to delete account"`.
- **Validation** (l.20-25): `z.object({ location: z.string().optional(), latitude: z.number().optional(), longitude: z.number().optional(), phone_number: z.string().optional() })`. There are no error strings.

#### 2.4 `/dashboard/settings`
- **Files:** `app/dashboard/settings/page.tsx` renders `components/Dashboard/Settings/Settings.tsx`. `components/Dashboard/Settings.tsx` ("Account Settings") is unused.
- **Header:** "Business Settings" / "Manage your business profile, schedule, location and more."
- **Tabs** (`Settings.tsx:24-67`): left list on desktop, horizontal pills on mobile.
  - profile "Profile" (`User`), "Photo, email, phone & community"
  - schedule "Schedule" (`Clock`), "Opening hours & 24/7 settings"
  - location "Location" (`MapPin`), "Address, map & coordinates"
  - venue "Venue Photos" (`Images`), "Upload & manage venue photos"
  - business "Business Info" (`Building2`), "ABN number & booking type"
  - portfolio "Portfolio" (`Briefcase`), "Work samples & project photos"
  - seo "SEO & Search" (`Search`), "Keywords & description for search"
- **Shared read:** every tab uses `useGetSingleDashboardBusiness(session.user.id)`, which is key `["getbusiness", id]` → `GET /api/business/getwithid/{id}` (`business.service.ts:87-93`).
- **Shared write:** every tab saves with a raw `fetch("/api/business/settings", { method:"PATCH", body: FormData })`.
  - On non-2xx it throws `(await res.json()).message`.
  - On success it invalidates `["getbusiness", session.user.id]`.
  - The `useUpdateOperatingHours` / `useGetOperatingHours` / `useUpadteABN` / `useUpdateBusinessType` hooks in `business.service.ts` are **not used anywhere**.
- Each tab has a skeleton loading state. There is no fetch-error UI.

| Tab | Component | FormData fields | Toasts (success / error fallback) | Validation |
|---|---|---|---|---|
| Profile | `ProfileSettings.tsx` | `phone_number` (only if non-empty), `business_category`, `community` (JSON array), `image` (file, if changed) | "Profile updated successfully" / "Failed to update profile" | zod (l.43-47): `business_category: z.string().min(1, "Please select a category")`, `phone_number` optional, `community: z.array(z.string())`. Client-side: at most 3 communities (`toggleCommunity`, "{n} / 3 selected"); image over 5MB → toast "Profile photo must be under 5 MB". Email is read-only, with the note "Email address cannot be changed". |
| Schedule | `OperatingHours.tsx` (`BusinessHoursForm`) | `is24_7` ("true"/"false"), `schedule` (JSON) | "Schedule updated successfully" / "Failed to update schedule" | no zod. "Open 24 / 7" switch. Day keys `mon..sun`; at most **2 slots per day** (`addSlot` returns early when `>= 2`; "Add second shift"); times are 30-minute steps `"HH:mm"` from 00:00 to 23:30; **from < to is not validated**. Defaults: Mon–Fri open 09:00–18:00, Sat/Sun closed; a new 2nd shift defaults to 18:00–21:00. Removing the last slot sets `open:false`. Save is disabled until something is edited. Copy: "{n} shift(s) configured" / "Closed — not available". |
| Location | `LocationSettings.tsx` | `location`, `latitude`, `longitude` | "Location updated successfully" / "Failed to update location"; plus a pre-check toast "Please select a location from the dropdown first" | Nominatim with `countrycodes=au`, 3-character minimum, 400ms debounce; the pin on the map is draggable and reverse-geocodes. Empty state: "No location set yet. Search and select an address above." |
| Venue Photos | `VenueImagesSettings.tsx` | `existing_images` (JSON of kept URLs), `venue_image_0..n` | "Venue photos updated successfully" / "Failed to update venue photos" | Up to 10 images, 5MB each: `"{name}" exceeds 5 MB and was skipped`, `Maximum 10 images allowed`. Hint below 3 photos: "Add at least 3 photos to make your listing more attractive to customers." |
| Portfolio | `PortfolioSettings.tsx` | `existing_portfolio`, `portfolio_image_0..n` | "Portfolio updated successfully" / "Failed to update portfolio" | Up to 20 images, 3MB each (same message pattern). Hint: "Add at least 3 photos to showcase your work effectively." |
| Business Info – ABN | `UpdateABN.tsx` | `abn_number` | "ABN updated successfully" / "Failed to update ABN" | zod (l.26-32): `.min(11,"ABN must be 11 digits").max(11,"ABN must be 11 digits").regex(/^\d+$/,"ABN must contain only numbers")`; input `maxLength=11`. **No checksum.** |
| Business Info – Booking Model | `BusinessType.tsx` | `business_type` | "Booking model updated successfully" / "Failed to update booking model" | zod: `business_type: z.string().min(1,"Please select a booking model")`. Options: `employee_based` "Staff / Employee Based (e.g., Haircut, Massage, Consulting)", `item_based` "Item / Inventory Based (e.g., Kayak, Boat, Surfboard rentals)". Default `employee_based`. |
| SEO | `SeoSettings.tsx` | `seo_keywords` (JSON), `seo_description` | "SEO settings updated successfully" / "Failed to update SEO settings" | `MAX_KEYWORDS=10`, `MAX_DESCRIPTION=200` (l.17-18). Duplicate keywords (case-insensitive) are silently dropped; Enter or "," adds, Backspace removes. Placeholder at the limit: "Maximum keywords reached". |

The business category list comes from `BUSINESS_CATEGORIES` (`lib/data/business-categories.ts:36-81`), the deduplicated union of the employee and item categories. Communities (`ProfileSettings.tsx:29-41`): Nepali, Indian, Bhutanese, Chinese, Filipino, Vietnamese, Other Asian, Middle Eastern, African, European, Latin American.

#### 2.5 Notifications (bell + drawer in `DashboardLayout.tsx`)
- **Fetch** (l.539-552): plain `fetch("/api/notifications")`, not React Query. It runs only if `isBusiness`, **polls every 30s**, and sets `notifications = json.data ?? []` and `unreadCount = json.unread_count ?? 0`.
- **Mark read** (l.554-560): optimistically sets `is_read:true` and decrements the count, then `fetch('/api/notifications/{id}', {method:"PATCH"})`. The result is not checked.
- **Drawer** (l.358-513):
  - Category tabs are only "Appointments" (`CalendarDays`) and "Reviews" (`Star`); the default is Appointments. "Tips", "Online sales" and "Actions" exist in the type but are not rendered.
  - Empty state: "No notifications".
  - Item: title, `formatDistanceToNow(created_at)`, body. Unread items get a blue background and a red dot.
  - Tapping an appointment goes to `/dashboard/bookings?bookingId={related_id}`.
  - Tapping a review goes to `/businesses/{slugify(business_name)}#review-{related_id}`, where `slugify` lower-cases and strips everything except a-z0-9. Whether this matches the real business slug is UNVERIFIED.
  - The desktop-only left panel is static: "No scheduled team members", "Scheduled shifts" and "View all team members" (both buttons inert).
- **Review reply in the drawer:** a "Reply" button on review items opens `ReviewReplyBox`, covered in §2.8.
- **Who creates notifications:**
  - `app/api/bookings/route.ts:345` → "New appointment".
  - `lib/booking-notifications.ts:44` → "Booking cancelled" / "Booking rescheduled", only when the user is the one who acted.
  - `app/api/review/route.ts:77` → "New review" (`"{rating}-star review: \"{comment≤80}\""`).
  - `app/api/review/edit/[id]/route.ts:52` → "Review updated".

#### 2.6 Dashboard search (`SearchOverlay`, `DashboardLayout.tsx:160-306`)
- Opening it triggers a 250ms-debounced `fetch('/api/dashboard/search?q=' + encodeURIComponent(query))`. It also fires once on open with an empty `q`, which returns the next upcoming appointments and the most recent clients.
- **Copy:**
  - Placeholder: "What are you looking for?"
  - Hint: "Search by client name, mobile, email or booking reference"
  - Column headings: "Upcoming appointments", and "Clients (recently added)" when the query is empty or "Clients" otherwise.
  - Loading: "Searching…"; empty: "None found".
- **Rows:**
  - Appointment: `"{service_id.name||'Service'} — {user_id.name||'Unknown'}"` plus `en-AU` medium date / short time. Tapping goes to `/dashboard/bookings?bookingId={_id}`.
  - Client: name and `email · phone`. Tapping goes to `/dashboard/clients`; it does not open that client.
- Esc closes the overlay. There is no error state.

#### 2.7 `/dashboard/clients` and client detail
- **Files:** `app/dashboard/clients/page.tsx`, a single client component. Detail is a modal Dialog, not a separate route.
- **Calls** (`services/client.service.ts`):
  - `useGetClients(search)`: key `["clients", q]` → `GET /api/clients?q=` (no debounce, so one request per keystroke).
  - `useGetClientDetail(user_id)`: key `["client", id]` → `GET /api/clients/{id}`, enabled only when a client is selected.
- **Header:** "Clients" / "Everyone who has booked with you"; search placeholder "Search by name or email".
- **Table columns:** Client (avatar, name, email), Phone (`"—"` when empty), Bookings, Total spent (`A${total_spent.toFixed(2)}`), Last visit (`MMM d, yyyy`), Actions (`Eye` icon opens the detail).
- **States:** "Loading clients..." / "No clients yet." (also shown when a search has no results).
- **Detail dialog:**
  - Title is the client name; the description shows email and phone.
  - Booking list: `service_id.name || "Deleted service"`, `MMM d, yyyy · h:mm a`, status pill.
  - States: "Loading..." / "No bookings found."
  - `employee_id.full_name` and `total_price` are fetched but **not displayed**.
- No mutations.

#### 2.8 Review replies in the business dashboard
- **Yes, they are exposed**, but only inside the notification drawer (`DashboardLayout.tsx:308-356, 485-501`), on items with `type==="review"`.
- `ReviewReplyBox` uses `useReplyReview` (`services/review.service.ts:81-94`, mutationKey `["replyReview"]`) to call `POST /api/review/reply/{related_id}` with body `{ reply }`.
- **Copy:** placeholder "Write a reply...", button "Post reply" / "Posting…".
  - Success: toast "Reply posted".
  - Error: `error.response?.data?.error || "Failed to post reply"`. `Post` throws a plain `Error`, so the toast is **always "Failed to post reply"**.
- Empty or whitespace-only replies are ignored client-side. **Nothing is invalidated.**
- There is no review list page in the dashboard. The other reply UI is on the public business page (`components/Business/Comment.tsx:69-88`): `canReply = !!session?.user?.id`, so any logged-in account can reply there; it invalidates `["review"]`.

---

### 3. API routes (from each `route.ts`)

Assumptions behind the types below:
- Mongo ids and dates are serialised as strings.
- None of these routes uses the `{status, message, error, data}` envelope that `services/apitypes.ts:1-20` describes, and none returns `success` except where shown.
- Every `/api/*` route can also return **429** `{"success":false,"error":"Too many requests. Please slow down."}` (`proxy.ts:64-71`; 20 requests per 10s, keyed by IP, or by user when a valid bearer token is sent).
- The `isblocked` column is about the API itself; the client-side `/blocked` redirect is separate.

#### GET `/api/business-dashboard` (`app/api/business-dashboard/route.ts`)
- **Auth:** `getServerSession`; requires `session.user.category === "business"`, otherwise 401 `{error:"Unauthorized"}`. The business is `session.user.id`. No `isblocked` check.
- **Errors:** 500 `{error: err.message}`.
- **Logic:**
  - recent = `start_time` between now−7d and now, any status, sorted newest first; only 10 are returned.
  - upcoming = now to now+7d, status pending or confirmed, at most 10, ascending.
  - today = today 00:00–23:59:59.999 in **server local time**, status pending or confirmed.
  - `dailyStats` keys are `toISOString().slice(0,10)`, i.e. **UTC dates**.
  - `sales` and `totalSales` count only `payment_status === "paid"` (`total_price`).
```ts
type BookingLean = {
  _id: string; business_id: string; user_id: { _id: string; name: string; email: string } | null;
  service_id: { _id: string; name: string; base_price: number; base_duration?: number } | null; // base_duration only on upcoming/today
  employee_id: string | null;                 // NOT populated
  start_time: string; end_time: string; duration: number; total_price: number; currency: string;
  payment_status: "unpaid"|"pending"|"paid"|"refunded"|"failed";
  status: "pending"|"confirmed"|"rescheduled"|"arrived"|"completed"|"cancelled"|"no_show"|"refunded";
  notes?: string; inventory_quantity: number|null; idempotency_key: string|null;
  stripe_session_id: string|null; payment_intent_id: string|null; payment_transaction_id?: string;
  metadata?: Record<string,string>; is_reminder_sent: boolean; created_at: string; updated_at: string;
};
type BusinessDashboardResponse = { data: {
  dailyStats: { date: string /*YYYY-MM-DD UTC*/; appointments: number; sales: number }[]; // always 7
  totalAppointments: number; totalSales: number;
  recentBookings: BookingLean[]; upcomingBookings: BookingLean[]; todayBookings: BookingLean[];
}};
```
The Booking schema is at `server/models/Booking.model.ts`; `business_id` is a **String**.

#### GET `/api/dashboard` (not used by any web screen)
- **Auth:** `getServerSession`; no session → 401 `{error:"Unauthorized"}`.
- **user:** 200 `{message:"dashboard fetched successfully", data:{favorite: Favorite[≤2] (item_id populated), deals: Redemption[≤2] (status "pending", deal populated)}}`.
- **business:** 200 `{message, data: Array<Event|Deal>}`, a flat array of the business's events (newest first) followed by its deals, **not** `{favorite,deals}`.
- **super-admin:** falls through and returns **nothing** (undefined response; UNVERIFIED what Next does at runtime, probably a 500).
- **Errors:** 500 `{error}`. No `isblocked` check.

#### GET `/api/dashboard/search?q=` (`app/api/dashboard/search/route.ts`)
- **Auth:** `getServerSession`; requires `session.user.id` and category business, otherwise 401 `{error:"Unauthorized"}`. No `isblocked` check. **No try/catch.**
- **Clients:** an aggregate over Booking `{business_id}` grouped by `user_id`, joined to users; filtered by **regex** (`$options:"i"`, input not escaped) on name, email or `phone_number`; sorted by last booking; **limit 5**. An invalid regex such as `(` will throw, and with no try/catch that is an unhandled 500.
- **Appointments:** the first 50 bookings with `start_time >= now` and status not in cancelled, no_show, refunded or completed, sorted ascending. They are filtered **in JS** by substring of `_id`, user name, email, phone or service name, then sliced to 5.
```ts
type DashboardSearchResponse = { data: {
  appointments: (Omit<BookingLean,"user_id"|"service_id"> & {
    user_id: { _id: string; name: string; email: string; phone_number?: string } | null;
    service_id: { _id: string; name: string } | null; })[];          // ≤5
  clients: { user_id: string; name: string; email: string; phone?: string; image?: string }[]; // ≤5
}};
```

#### GET `/api/notifications`
- **Auth:** `getServerSession`; requires `session.user.id` and category business, otherwise 401 `{error:"Unauthorized"}`. Filtered by `business_id = session.user.id`. No `isblocked` check. No try/catch.
- Returns at most 50 items, newest first.
```ts
type Notification = { _id: string; business_id: string; type: "appointment"|"review"; title: string;
  body: string; related_id: string /*Booking._id or Review._id*/; is_read: boolean;
  created_at: string; updated_at: string; __v: number };
type NotificationsResponse = { data: Notification[]; unread_count: number };
```
The model is `server/models/Notification.model.ts`.

#### PATCH `/api/notifications/[id]`
- **Auth:** `getServerSession`; requires only `session.user.id` (**no category check**), otherwise 401 `{error:"Unauthorized"}`.
- **Ownership:** enforced through the filter `{_id:id, business_id: session.user.id}`; a miss returns 404 `{error:"Not found"}`.
- No body; sets `is_read:true`.
- **Success:** 200 `{data: Notification}`.
- A malformed id causes a CastError with no try/catch, so an unhandled 500. No `isblocked` check.
- **There is no GET or DELETE handler.**

#### GET `/api/clients?q=`
- **Auth:** `getServerSession` plus category business, otherwise 401 `{error:"Unauthorized"}`. Uses `session.user.id`. No `isblocked` check. No try/catch, and the regex is unescaped.
- `q` matches only name or email (**not phone**, unlike search).
- `total_spent` sums `total_price` only where `payment_status==="paid"`; `bookings_count` counts every status.
```ts
type ClientsResponse = { data: { user_id: string; name: string; email: string; phone?: string; image?: string;
  bookings_count: number; total_spent: number; last_booking_at: string; first_booking_at: string }[] };
```

#### GET `/api/clients/[id]`
- **Auth:** `getServerSession` plus category business, otherwise 401. No `isblocked` check. No try/catch.
- **Ownership gap:** `User.findById(id, "name email phone_number image")` returns **any user's** name, email, phone and image even if they never booked with this business. Only `bookings` is scoped to `{business_id, user_id}`.
- Missing user: 404 `{error:"Client not found"}`. An invalid id is an unhandled 500.
```ts
type ClientDetailResponse = { data: {
  client: { _id: string; name: string; email: string; phone_number?: string; image?: string };
  bookings: (Omit<BookingLean,"service_id"|"employee_id"|"user_id"> & { user_id: string;
    service_id: { _id: string; name: string } | null; employee_id: { _id: string; full_name: string } | null })[]; // sorted start_time desc, not lean (includes __v)
}};
```

#### POST `/api/review/reply/[id]`
- **Auth:** `getServerSession`; requires only `session.user`, otherwise 401 `{error:"Unauthorized"}`.
- **No category check, no ownership check:** any logged-in account can reply to any review. No `isblocked` check. Bearer tokens do not work.
- **Validation** (l.8-13):
  ```ts
  reply: z.string().min(1,"Reply cannot be empty").max(500,"Reply is too long (max 500 characters)")
  ```
  A failure returns 400 `{error: ZodIssue[]}`.
- Review not found: 404 `{error:"Review not found"}`. Other errors: 500 `{error: message}`.
- The reply is pushed to `replies` and saved.
```ts
type ReplyResponse = { message: "Reply posted successfully"; data: {
  _id: string; business_id: string; rating: number; comment: string;
  user: /* full User doc minus password (populate {password:0}) — includes email, phone etc. */ any;
  replies: { _id: string; text: string; created_at: string;
    user: { _id: string; name: string; business_name?: string; image?: string; category: string } }[];
  created_at: string; updated_at: string } };
```
The review `user` populate field set is not shown in full; the Review model was only partly read (`server/models/Review.model.ts:42-49`: comment and reply `text` both have maxlength 500).

#### GET `/api/business/getwithid/[id]` (read source for every Settings tab)
- **No auth at all.**
- Projection is `PUBLIC_BUSINESS_FIELDS` (`server/lib/publicUserFields.ts:19-47`), which **excludes** `verified`, `isblocked` and `emailVerified`.
- Not found: 404 `{error:"Business not found"}`. Errors: 500 `{error}`.
```ts
type GetWithIdResponse = { message: "Businesses retrieved successfully"; data: {
  _id: string; name?: string; business_name?: string; business_type?: "employee_based"|"item_based"|null;
  business_category?: string; email: string; phone_number?: string; city?: string; city_name?: string;
  location?: string; community: string[]; image?: string; venue_images: string[]; portfolio_images: string[];
  is24_7: boolean; schedule: Record<"mon"|"tue"|"wed"|"thu"|"fri"|"sat"|"sun",{open:boolean;slots:{from:string;to:string}[]}> | null;
  abn_number?: string; seo_keywords: string[]; seo_description: string; isSponsor: boolean; category: string;
  latitude?: number; longitude?: number; geo?: { type: "Point"; coordinates: [number, number] }; createdAt: string;
  review: Review[];            // queried by business._id (ObjectId)
  hours: OperatingHoursDoc | null; // legacy collection, see below
}};
```

#### PATCH `/api/business/settings` (`app/api/business/settings/route.ts`), the endpoint every Settings tab writes to
- **Auth:** `getServerSession`; requires only `session.user.id`, otherwise 401 `{message:"Unauthorized"}`.
- **No category check** (a `user` account can write business fields to its own document). Writes go to `session.user.id`. No `isblocked` check.
- **Body:** multipart FormData. Every field is optional and only fields that are present are applied:
  - `phone_number` (trimmed; an empty string is allowed and clears it)
  - `business_category` (ignored if empty)
  - `community` (JSON)
  - `image` (file; the old S3 object is deleted)
  - `is24_7` (`"true"` means true; anything else is false)
  - `schedule` (JSON; **no shape validation**)
  - `location`, `latitude`, `longitude`; `geo` is set only when both latitude and longitude are present
  - `existing_images` (JSON URL list) plus `venue_image_0..9`; the loop stops at the first missing index and individual upload failures are skipped silently
  - `existing_portfolio` plus `portfolio_image_0..19`
  - `abn_number` (trimmed, **no server format check**)
  - `business_type` (trimmed; the schema enum is enforced through `runValidators`)
  - `seo_keywords` (JSON `string[]`, at most 10; trimmed; empty entries removed)
  - `seo_description` (trimmed, at most 200 characters)
- **Errors (exact strings):**
  - 404 `{message:"User not found"}` (checked before and after the update)
  - 400 `{message:"Invalid community data"}`
  - 400 `{message:"Invalid schedule data"}`
  - 400 `{message:"Invalid venue image data"}`
  - 400 `{message:"Invalid portfolio image data"}`
  - 400 `{message:"Invalid SEO keywords data"}` (bad JSON, not an array, or a non-string item)
  - 400 `{message:"You can add up to 10 SEO keywords"}`
  - 400 `{message:"SEO description must be 200 characters or fewer"}`
  - 400 `{message:"No fields provided to update"}`
  - 500 `{message: error.message || "Internal Server Error"}`. This includes Mongoose validation errors, for example an invalid `business_type` enum value; the exact Mongoose message text is UNVERIFIED.
- **Success:**
```ts
type SettingsResponse = { message: "Settings updated successfully";
  data: UserDoc /* full User minus password, token, resetPasswordToken, resetPasswordExpire, verificationTokenExpire — includes isblocked, verified, emailVerified, provider, googleId, etc. */ };
```
- Server-side, `community` has **no limit of 3** (that limit is client-only), and image counts and sizes are not checked beyond the loop caps of 10 and 20.

#### PATCH `/api/business/profile` (no web caller works)
- Only PATCH is exported; **POST returns 405**, and that is what `CompleteProfile.tsx` sends.
- **Auth:** `getServerSession` + `session.user.id`, otherwise 401 `{message:"Unauthorized"}`. No category or `isblocked` check.
- **FormData:** `phone_number`, `business_category`, `community` (JSON), `image`. Unlike settings, it does **not** delete the old S3 image.
- **Errors:** 400 `{message:"Invalid community data"}`, 400 `{message:"No fields provided to update"}`, 404 `{message:"User not found"}`, 500 `{message}`.
- **Success:** 200 `{message:"Profile updated successfully", data: UserDoc}` (the select excludes only password, token and resetPasswordToken).

#### GET/POST `/api/business/operating-hours` (not used by any screen)
- **GET:** `getServerSession`; 401 `{error:"Unauthorized"}`. Reads the **legacy `OperatingHours` collection** (`server/models/OperatingHour.model.ts`: `{business_id:ObjectId, is24_7, schedule:[{day, isOpen, openTime:"06:00 AM", closeTime:"10:00 PM"}]}`).
  - 404 `{message:"No hours found"}`; 200 `{data: OperatingHoursDoc, message:"Hours fetched successfully"}`; 500 `{error}`.
- **POST:** **no auth at all.** It upserts with `body.business_id` taken from the client (anyone can overwrite any business's hours in this collection) and returns the raw document (no envelope); 400 `{error}`.
- The Settings UI writes `User.is24_7` / `User.schedule` instead, which is a different shape: an object keyed `mon..sun` of `{open, slots[{from,to}]}`.

#### POST `/api/business/abn` and POST `/api/business/businesstype` (not used by any screen)
- **Auth:** `getServerSession`, otherwise 401 `{error:"Unauthorized"}`.
- `findOneAndUpdate({_id: session.user.id}, {abn_number | business_type}, {upsert:true, new:true, runValidators:true})`.
- **Success:** 200 `{data: UserDoc (full, no projection), message:"ABN updated successfully" | "Business Type updated successfully"}`.
- **Errors:** 400 `{error: message}`.
- No validation, no category check, no `isblocked` check.

#### POST/PATCH `/api/profile-complete-business` (not called anywhere)
- **Auth:** `getServerSession`, otherwise 401 `{error:"Unauthorized"}`.
- **POST:** requires `business_name` and `business_service`, otherwise 400 `{error:"Missing required fields"}`. An existing profile returns 409 `{error:"Business profile already exists"}`.
  - It runs `Business.create(data)`, but **`owner` is never put into `data`** (it is only used for the lookup). Because of that, the duplicate check (`findOne({owner})`) never matches what was saved, and PATCH (`findOneAndUpdate({owner})`) will 404.
  - It then sets `User.category = "business"`.
  - Success: 201 `{success:true, id}`. Errors: 500 `{error:"Internal Server Error"}`.
- **PATCH:** `$set` of the body (minus `ownerId`) on `{owner}`. Not found: 404 `{error:"Business profile not found for this user."}`; ValidationError: 400 `{error}`; otherwise 500 `{error:"Internal Server Error"}`. Success: `{success:true, message:"Profile updated successfully", data}`.
- The model is `server/models/BusinessCompletion.model.ts`, a **separate `Business` collection** that nothing else reads.

#### Profile-adjacent routes
| Route | Auth | Body / behaviour | Responses |
|---|---|---|---|
| POST `/api/edit-profile` | **`getAuthUser`** (bearer first, then cookie; fresh DB read; **rejects isblocked/deleted**) | `{phone_number?, location?, latitude?, longitude?}`, `$set` on `authUser.id` | 401 `{error:"Unauthorized"}`; 400 `{message:"No valid fields provided"}`; 404 `{message:"User not found"}`; 400 `{message: err.message}`; 200 `{data: UserDoc (no projection; password is `select:false` in the schema), message:"Profile updated successfully"}` |
| POST `/api/upload-profile-pic` | **`getAuthUser`** | FormData `file`; deletes the old image if it is on S3 | 401 `{error:"Unauthorized"}`; 400 `{error:"No file provided"}`; 500 `{error:"Upload failed"}`; 200 `{message:"Profile picture updated successfully", success:true, data:{url}}` |
| POST `/api/delete-profile` | `getServerSession` | ignores the body; hard-deletes the User plus their Events, Deals and Reviews (bookings are kept) | 401 `{error:"Unauthorized"}`; 404 `{error:"User not found"}`; 200 = the raw deleted User doc |
| GET `/api/user/profile` | `getAuthUserDetailed` (bearer: `{error:{message:"Unauthorized",code}}`, 401, or 403 for ACCOUNT_BLOCKED) | — | 401 `{error:"Unauthorized"}`; 200 = raw User doc (no envelope; excludes password, token, reset/verification token fields) |
| PATCH `/api/user/update` | `getAuthUserDetailed` | `{name, image}`, `$set` of **both** (a missing one is set to undefined) | 401; 500 `{error:"Failed to update profile"}`; 200 = raw User doc |

`getAuthUser` (`server/lib/getAuthUser.ts:47-81`) checks the **Bearer header first** and the cookie second. Both paths do `User.findById` and reject when `deletedAt` or `isblocked` is set.

---

### 4. Validation summary (exact strings)
- **CompleteProfile** (`components/CompleteProfile.tsx:27-62`):
  - user branch: `country_code min(1)`, `phone_number min(7,"Invalid phone number")`, `user_name min(2,"User name required")`.
  - business branch: `business_name min(2,"Business name required")`, `business_category min(2)`, `service_category min(2)`, `location min(5,"Address required")`, `business_service: array(serviceSchema)`.
  - service: `name min(2,"Service name required")`, `item_description optional`, `price_category enum hr|day|monthly|unit`.
  - resource: `name min(2,"Resource name required")`, `price number min(0)`, `type min(2)`, `available_slots[{day,from,to}]`.
- **ProfilePage:** all fields optional, no messages (§2.3).
- **ProfileSettings:** `"Please select a category"`; client-side toast `"Profile photo must be under 5 MB"`; at most 3 communities (UI only).
- **Operating hours:** no zod. At most 2 slots per day (UI); 30-minute grid; no from/to ordering check on client or server.
- **BusinessType:** `"Please select a booking model"`. The server relies on the Mongoose enum `employee_based|item_based`.
- **ABN:** `"ABN must be 11 digits"` (min and max) and `"ABN must contain only numbers"`. The server does not validate it.
- **SEO:** client caps 10 and 200. Server: `"You can add up to 10 SEO keywords"`, `"SEO description must be 200 characters or fewer"`, `"Invalid SEO keywords data"`. The Mongoose schema repeats both rules (`Auth.model.ts:80-88`: validator message `"You can add up to 10 SEO keywords"`, `maxlength:200`).
- **Images:** venue at most 10 at 5MB each; portfolio at most 20 at 3MB each. Toasts: `"{name}" exceeds {N} MB and was skipped`, `Maximum {N} images allowed`. The server checks neither size nor MIME type.
- **Review reply:** `"Reply cannot be empty"`, `"Reply is too long (max 500 characters)"`.

---

### 5. Open questions resolved

#### #10: Which profile endpoints the screens actually use
- **`/dashboard/profile`** uses `POST /api/edit-profile` for `phone_number`, `location`, `latitude` and `longitude`. It also uses `POST /api/upload-profile-pic` (field `file`) for the avatar and `POST /api/delete-profile` for account deletion.
- **`/dashboard/settings`** uses only `PATCH /api/business/settings`, for every field: phone, category, community, image, `is24_7`/schedule, location/lat/lng, venue and portfolio images, ABN, `business_type`, SEO. It reads through the unauthenticated `GET /api/business/getwithid/{session.user.id}`.
- **`/api/business/profile`** is referenced only by `CompleteProfile.tsx`, with the wrong method (POST → 405).
- **`/api/user/profile` and `/api/user/update`** have **no callers** in `app/`, `components/`, `services/`, `lib/` or `server/` (grep).
- **Name editing:** no screen exposes it.
- **Recommendation for mobile:** reuse `PATCH /api/business/settings` semantics. It is currently cookie-only, so a bearer wrapper or a swap to `getAuthUser` is needed.

#### #11: Every place `isblocked` is enforced (grep of `app/`, `components/`, `server/`, `lib/`, `proxy.ts`)
1. **`components/Dashboard/DashboardLayout.tsx:530`** is the only client gate: `if (session?.user?.isblocked) router.push("/blocked")`. It applies only on `/dashboard/*`. Public pages are not gated.
   - `/blocked` renders `components/ResuableComponents/BlockedPage.tsx`: "403" / "Access Blocked" / "This content is not accessible from your current location or network. Please contact administration for details." / button "Go Front Page".
2. **`server/lib/getAuthUser.ts:62-63, 74-75`** rejects blocked accounts (reason `ACCOUNT_BLOCKED`) for every route that uses `getAuthUser`/`getAuthUserDetailed`. Per grep those are:
   - `edit-profile`, `upload-profile-pic`, `user/profile`, `user/update`
   - `review`, `review/edit/[id]`, `review/delete/[id]`
   - `favroite`, `tickets`, `event/redeem`
   - `event/ticket/hold`, `event/ticket/hold/release`, `event/ticket/purchase`
   - `mobile/v1/me`, `mobile/v1/event/ticket/price`; `mobile/v1/auth/login` and `auth/social` import it too
   - Web-cookie rejections get each route's normal 401; bearer rejections get `bearerRejectionResponse` → 403 `{error:{message:"Unauthorized",code:"ACCOUNT_BLOCKED"}}` (`getAuthUser.ts:103-112`).
3. **`server/lib/mobileTokens.ts:84, 116`** makes refresh-token rotation return `ACCOUNT_BLOCKED`; `app/api/mobile/v1/auth/refresh/route.ts:9` maps that to 403. `app/api/mobile/v1/me/route.ts:11` uses the same mapping.
4. **The flag is written** by `app/api/super-admin/business/block/[id]/route.ts:27`, a super-admin-only POST `{id, isblocked}`.
5. **The flag is carried into the session but not enforced there:**
   - `app/api/auth/[...nextauth]/route.ts:20,111,143,168,188` copy it into the JWT/session.
   - The `jwt` callback **re-reads the user from the DB on every call** (l.155-173), so `session.user.isblocked` is fresh whenever the session is read.
   - **`signIn` does not reject blocked users**; neither do mobile `auth/login`, `auth/social` and `auth/guest` (per their comments).
6. **No enforcement in `proxy.ts`.** **None of the dashboard business APIs in this report check it:** `business-dashboard`, `dashboard/search`, `notifications*`, `clients*`, `business/settings`, `business/profile`, `abn`, `businesstype`, `operating-hours`, `review/reply`, `delete-profile`. A blocked business can call all of them directly.

There are display-only references in `components/SuperAdmin/{Users/UserTable,Business/BusinessDataTable}.tsx`, and `app/api/deals/route.ts:85` excludes the field from a populate.

#### Complete-profile condition
Only `category === "none"` (`SessionWrapper.tsx:24-30`), which the enum makes unreachable. No user fields (business_type, ABN, location and so on) are checked anywhere.

---

### 6. Mobile-doc claims the code contradicts (`F:\whamobileapp\docs\mobile`)
1. **`04-api-reference.md:194-195`** says `getAuthUser` "tries the existing NextAuth session first, falling back to `Authorization: Bearer`". The code is the reverse: **Bearer first**, exclusively when present (`getAuthUser.ts:17-26, 54-66`).
2. **`04-api-reference.md:204-208`** describes the old web path as "stale JWT session". The `jwt` callback re-hydrates from the DB on every non-sign-in call (`[...nextauth]/route.ts:154-173`), so the session flag is not stale. The real gap is that routes don't check it.
3. **`04-api-reference.md:310`** lists `/api/business/profile` as GET/PATCH. It is **PATCH only**.
4. **`04-api-reference.md:311`** lists `/api/business/settings` as GET/PATCH. It is **PATCH only** (multipart). Reads come from `GET /api/business/getwithid/[id]`, which is **unauthenticated**, though line 305 marks it 🔒.
5. **`04-api-reference.md:306`** says operating-hours is "🔒 GET/POST". **POST has no auth** and takes `business_id` from the body. Neither method is used by the UI; Settings writes `User.schedule` through `/business/settings`. The OperatingHours shape at line 517 is the legacy collection, not what the dashboard edits.
6. **`04-api-reference.md:314`** says `/api/dashboard` returns `{favorite?, deals?}`. That is true only for `user`; business gets `data: Array<Event|Deal>`, super-admin gets no response, and no web screen uses it.
7. **`04-api-reference.md:315`** says the dashboard search shape is UNVERIFIED. It is now resolved: `{data:{appointments[≤5], clients[≤5]}}` (§3).
8. **`04-api-reference.md:374`** lists `/api/notifications/[id]` as GET/PATCH/DELETE. It is **PATCH only**.
9. **`04-api-reference.md:375`, `99-open-questions.md:53-54`, `05-auth-and-user.md:190`** describe `GET/PATCH /api/user/profile` and `POST /api/user/update`. The code has **GET** `/user/profile` only and **PATCH** `/user/update` only. Neither is used by the web UI; the business profile uses `/edit-profile` and `/business/settings`.
10. **`04-api-reference.md:377`** gives the upload field as `FormData{ image }`. The field is **`file`** (`upload-profile-pic/route.ts:17`; line 574 of the same doc has it right).
11. **`04-api-reference.md:574-575, 585`** say `/api/edit-profile` and `/api/upload-profile-pic` are "cookie-only". Both now use **`getAuthUser`**, so bearer tokens are accepted. Note the web rejection is a plain `{error:"Unauthorized"}` 401 with no code. `/api/review/reply/[id]`, `/api/notifications*` and `/api/delete-profile` are still cookie-only, which is correct.
12. **`04-api-reference.md:358`** says `q` is the list search param. Correct, but it matches name or email only (not phone), and `/clients/[id]` has the cross-tenant user-info leak (§3).
13. **`04-api-reference.md:370`** says reply is "(business)". The server does **not** restrict it to businesses or to the business that owns the review; any logged-in user can reply.
14. **`03-screens.md:235-239`** says Profile is a "standard profile editor (name, …)". Name is **not editable** anywhere. `/dashboard/settings` has no operating-hours endpoint; everything goes through `/business/settings`.
15. **`03-screens.md:33`** says complete-profile is a "User (post-signup gate)". In practice it is unreachable through the redirect, client-gated to non-`user` accounts by `PROTECTED_PATHS`, and its submit fails (POST to a PATCH-only route, and the business branch requires a `location` field it doesn't render).
16. **`03-screens.md:69`** says clients is "(not traced)". It is now traced (§2.7).
17. **`05-auth-and-user.md:90-93`, `99-open-questions.md:57-59` (#11)** are resolved in §5. **`99-open-questions.md:81-83` (#17)** is resolved in §1.3. **`10-navigation-map.md:34-39`** inferred nav items from `PROTECTED_PATHS`, but that constant is a **role-redirect list, not the nav**; the real nav is in `Sidebar.tsx`.
18. **`07-forms-and-validation.md:67-68`, `99-open-questions.md` #21** say no ABN validator exists. There is one: `UpdateABN.tsx:26-32` checks 11 digits and digits only (no checksum).
19. **`99-open-questions.md:12` (#12)**, the `category === "none"` point, is confirmed: the value is not in the enum and the redirect is unreachable.

**Other bugs worth carrying into the spec:**
- Duplicate "Catalog" label in the sidebar.
- Several dashboard routes have no try/catch, so they return unhandled 500s on a bad id or a bad regex.
- Overview cards drop employee names because `employee_id` is never populated, and "Last month" is hard-coded 0.
- Overview day buckets use UTC dates; "today" uses server local time.
- No debounce on clients search, against a 20 requests / 10s rate limit.
- The reply error toast never shows the server message.

---

## Area 2 — Business EVENTS: verified source report (F:\WHA, read-only)

All line numbers refer to files under `F:\WHA` unless stated otherwise. Anything I could not confirm from code is marked **UNVERIFIED**.

---

### 0. Shared plumbing (applies to every route below)

**Fetch helpers: `lib/action.ts`**
- `Get` (L24-44) calls `fetch` and then `res.json()` **without checking `res.ok`**. A 401/403/404/500 JSON body therefore resolves as a *successful* React Query result, and `data.data` is `undefined`. As a result, none of the events screens has a real error state (details per screen below).
- `Post`/`PATCH` (L54-108) throw on `!res.ok` with `new Error(await res.text())`. `error.message` is the **raw JSON string**, e.g. `{"error":"..."}`.
- If the body is `FormData`, no headers are sent; otherwise `getHeaders()` sends JSON headers plus `Authorization: Bearer <user_token cookie>` when that cookie exists (`lib/http.utilis.ts`).

**`useFetcher(baseKey, null, url)`: `lib/generic.service.tsx:7-37`**
- The queryKey is `[...baseKey]`. With `queryKey=null`, no extra query params are appended.
- React Query uses default options: `new QueryClient()` in `lib/ReactQueryContext.tsx:4`, so staleTime is 0.

**Envelope type: `services/apitypes.ts:1-23`**
```ts
interface ApiResponseType<T> { status: number; message: string|null; error: string|null; data: T; pagination?: {...}; sites?: [...] }
```
The event routes don't actually return `status`/`error` on success. They return `{ data, message }` or ad-hoc shapes.

**Auth on the events dashboard routes:** every business events route uses **`getServerSession(authOptions)`** (NextAuth cookie). None uses `getAuthUser`, so a mobile bearer token gets a 401 on all of them.
- Exceptions: `/api/event/ticket/purchase` **POST**, `/api/event/redeem` and `/api/tickets` use `getAuthUser`/`getAuthUserDetailed`. None of these is a dashboard call.
- `server/lib/getAuthUser.ts:47-81` does a fresh DB read with `isblocked`/`deletedAt` checks, but only for routes that call it.
- **No events dashboard route checks `isblocked`.**
- **No route checks `category === "business"`.** Only super-admin bypasses exist (edit, archive, single-event-for-form).
- Client-side: `components/Dashboard/DashboardLayout.tsx:530-534` redirects `isblocked` users to `/blocked`. `category === "user"` users are redirected only for `PROTECTED_PATHS` (L22-29), and that list does **not** include `/dashboard/events`.

**Event model: `server/models/Event.model.ts`**
- `dateRange.from/to` are **Strings** (`"YYYY-MM-DD"`).
- `options[]` = `{_id, name, release_date:String, close_date:String, price:Number, capacity:Number, sold(def 0), held(def 0)}`.
- `promo_codes[]` = `{_id, code, discount_percentage, limit, used(def 0), applicable_options:[String]}`.
- Other fields: `registration_capacity`, `registration_sold` (def 0), `max_tickets_per_request` (def 10), `show_remaining_tickets` (def true), `archived` (def false), timestamps.
- `geo` is set only in `pre("save")` (L86-93). Because edit uses `findByIdAndUpdate`, **edit never updates `geo`**.

**Client `EventType`:** `services/event.service.ts:29-86`. `EventOptionType` is at L9-18 and `EventPromoCodeType` at L20-27.

---

### 1. `/dashboard/events` ("My events")

- Page: `app/dashboard/events/page.tsx` re-exports `EventsBackend` from `components/Dashboard/Events/EventsPage.tsx`.

#### API
- `useGetEvent()` → **GET `/api/event`**, key `["event"]` (`event.service.ts:171-177`). No query params.
- `useArchiveEvent()` → **POST `/api/event/archive/${id}`** with body `null` (sent as JSON `"null"`), mutationKey `["archiveEvent"]` (L236-245).
  - onSuccess (EventsPage.tsx:197-207): toast `"Event unarchived"` or `"Event archived"` (chosen by the event's *previous* `archived` value), then `invalidateQueries(["event"])`.
  - onError: toast `parseErrorMessage(error, "Failed to update event")`, which parses the JSON and uses `parsed.error || parsed.message`.
- Delete is commented out (L29, 135, 166-176, 387-396). There is no delete in the UI.

#### Status split: `getEventStatus` (L42-61)
- `archived` → `"archived"`.
- `from = new Date(dateRange.from)`. If missing or invalid → `"past"`.
- `to = dateRange.to` if valid, else `from`. All three dates (today, from, to) are truncated to local midnight.
- `today < from` → **upcoming**. `today > to` → **past**. Otherwise → **live**.
- It is day-granular: `startTime`/`endTime` are ignored.

#### Tabs (L123-128)
- Upcoming, Live, Past, **Archived** (4 tabs). Default is `"upcoming"`.
- Search: case-insensitive match on `title` (L146), placeholder `"Search"`.
- Sort by `dateRange.from`: descending on the Past tab, ascending on the others (L147-152).

#### Row fields
- Avatar shows `image`, falling back to the first letter of the title or `"E"`.
- `title`.
- Location line: `location_tba ? "To be announced" : venue || location`.
- Date line from `formatEventDateTime` (L82-96): `format(from,"EEE do MMM yyyy")` plus `", h:mm aa"` from `startTime` (`HH:mm`). It shows `"Date TBA"` if there is no date or the date is invalid.
- Price and status badge are commented out (L324-332).

#### Actions
- Header: "Redemption Table" → `/dashboard/events/redemtion-table`. "Verify Event" → `/dashboard/events/verify-event`. "Add Event" → `/dashboard/events/add-event`.
- Row: **Manage** button → `/dashboard/events/redemtion-table/${_id}`.
- Kebab menu:
  - **View** → `/events/${slug}`.
  - **Edit** → `/dashboard/events/add-event?id=${_id}`.
  - **Copy URL**: copies `${origin}/events/${slug}` and toasts `"Event URL copied to clipboard"`. If there is no slug it toasts `"This event doesn't have a public link yet"`.
  - **Archive** / **Unarchive**.

#### Archive rule (client L185-195, mirrored on the server)
- When **archiving** (`!event.archived`): block if `status !== "past"` **and** `ticketsTaken > 0`. The toast is exact: `"This event can't be archived while it still has tickets taken. You can archive it once the event has ended."`
- `ticketsTaken` (L63-71): for paid events it is Σ`options[].sold`; for registration events it is `registration_sold`; for external events it is **always 0**.
- So an event with zero tickets taken (and **every external event**) can be archived at any time, including while upcoming or live.
- **Unarchive is always allowed.**
- There is no confirm dialog.

#### Loading, empty and error states
- Loading: 5 pulse skeleton rows (L276-291).
- Empty: `No {activeTab} events found.` (e.g. "No upcoming events found.") plus a button "Create your first event" linking to add-event (L402-413).
- Error: none. A 401/500 renders as the empty state (see §0).

#### GET `/api/event`: `app/api/event/route.ts:170-192`
- Auth: getServerSession. On failure: 401 `{error:"Unauthorized"}`.
- Query: `Event.find({ user: session.user.id }).sort({createdAt:-1}).select("-options.promo_code -promo_codes")`.
  - Returns **all** of the user's events, including archived ones.
  - There are no query params and no pagination.
  - `user` is not populated (it is an ObjectId).
- Success:
  ```ts
  200 { data: EventDoc[] /* no promo_codes */, message: "User events retrieved" }
  ```
- Error: 500 `{ error: error.message }`.

---

### 2. `/dashboard/events/add-event` (create and edit)

- Page: `app/dashboard/events/add-event/page.tsx` re-exports `EventForm` from `components/Dashboard/Events/EventsForm.tsx`.
- Child component: `components/Dashboard/Events/LeafLetIntegration.tsx` (MapPicker).

#### How edit mode is selected
- The **`?id=<eventId>` query param** (L245-247).
- `useGetSingleForForm(id)` → GET `/api/event/single-event-for-form/${id}`, key `["singleEventForm", id]`.
- In create mode this still fires with `id=null`, i.e. GET `/api/event/single-event-for-form/null`. `findById("null")` throws a CastError, which returns 500 and is silently ignored.
- Edit mode is effectively "`data` exists" (header L527, button L1350).
- Entry points:
  - EventsPage Edit (L362).
  - ManageEventPage "Edit event" (L936).
  - Super-admin `components/SuperAdmin/Events/EventManagementTable.tsx:203`.

#### UI copy
- Header: `"Edit event"` / `"Add new event"`. A back chevron calls `router.back()`.
- Submit button text: `"Saving Event..."` while pending, otherwise `"Update Event"` / `"Create Event"`.
- Submit is **disabled** when `isPending || !form.formState.isDirty || !hasCompleteTicketOption` (L1343-1347).
  - `hasCompleteTicketOption` is true if the price category is not paid, or if any option has name, release_date, price and capacity all set (L511-515).
  - Exact isDirty behaviour in edit mode, given values are loaded via `setValue` without `shouldDirty`: **UNVERIFIED**. Expect the button to stay disabled until the user changes a field.

#### Tabs / sections (L186-202): free navigation, no Next button
| key | label | fields (SECTION_FIELDS L204-239) |
|---|---|---|
| basic | Basic Info | title, image, category, category_name, description, event_rules, refund_policy |
| location | Date & Location | dateRange, startTime, endTime, venue, location_tba, location, latitude, longitude |
| pricing | Pricing | price_category, options, registration_capacity, ticket_link |
| promo | Promo Code | promo_codes |
| host | Host Details | email, phone_number, website_link, host_name, support_details |
| settings | Settings | max_tickets_per_request, show_remaining_tickets |

#### Red-dot logic (L538-558)
- A tab shows a red dot (`h-2 w-2 rounded-full bg-red-500`) if any of its SECTION_FIELDS is a **top-level key** in `form.formState.errors`.
- `onInvalid` (L498-505) jumps to the first section (in SECTIONS order) that contains an errored key, then toasts `"Please fix the highlighted errors before saving."`.
- Validation runs only on submit (`handleSubmit(onSubmit,onInvalid)`). There is no per-step gating.

#### Fields by tab, with exact labels and placeholders

**Basic Info**
- Title: Input, placeholder `"Event Name"`.
  - A live onChange check sets the error `"Special characters are not allowed"` when the value matches `/[^a-zA-Z0-9\s]/` (L580-596).
  - Has FormMessage.
- Event Image: `<Input type="file" accept="image/*">`, which stores the File (L607-623).
  - Has FormMessage.
  - Below it is a chip: filename (string URL → last path segment, File → `.name`). Clicking it opens the image in a new tab (`URL.createObjectURL` for a File). A `×` button sets the value to `undefined`.
- Category: ToggleGroup, single select, with values `Concert`, `Festival`, `Educational Seminar`, `Cultural Event`, `Food Event`, `Others`.
  - No FormMessage: its error shows only as the red dot.
  - If `Others` is selected, a "Category Name" Input appears (no FormMessage).
- Description: Textarea, **no FormMessage**, so the min-10 error is visible only as the red dot plus the toast.
- "Event Rule & Policy": Textarea (`event_rules`).
- "Refund": Textarea (`refund_policy`).

**Date & Location**
- "From and to Date": Popover with `Calendar mode="range" numberOfMonths={2}` (react-day-picker ^9.13.2).
  - Trigger text is `"Pick Dates"`, or `PP` for one date, or `PP - PP` for a range.
  - Has FormMessage.
- "Time From": `type="time"` (`startTime`), no FormMessage.
- "Time To": `type="time"` (`endTime`).
- "Location": toggle between `"Set Location"` and `"To Be Announced"` (`location_tba` boolean).
- Shown only when not TBA:
  - Venue: placeholder `"e.g. Grand Ballroom"`, has FormMessage.
  - "Pick Location": MapPicker with placeholder `"Search for a location..."`.
    - Search uses Nominatim `https://nominatim.openstreetmap.org/search?format=json&q=…&limit=5`, debounced 500 ms, minimum 3 characters.
    - Selecting a result sets `location=display_name` and `latitude`/`longitude` (parseFloat).
    - The Navigation button uses `navigator.geolocation` plus Nominatim `reverse`. The fallback text is `"Current Location"`, or `"Selected Location"` if the fetch fails.
    - The location error shows as a red `<p>` (L881-885).

**Pricing**
- "Price Category" toggle: `registration` = "Free With Registration", `paid` = "Paid", `external` = "External Ticket". The default is **`"paid"`** (L273).
- registration → "Capacity": number, min 0, step 1, placeholder `"Leave blank for unlimited"`.
- external → "Ticket Link": placeholder `"https://example.com/tickets"`, has FormMessage.
- paid → "Ticket Options" list.
  - "Add Option" is shown while there are fewer than 5 options.
  - The trash icon is shown only when there is more than 1 option.
  - Fields per option:
    - Name: placeholder `"e.g. Early Bird"`.
    - Release Date: `type=date`.
    - Close Date: `type=date`.
    - Price: number, min 0, step 0.01.
    - Capacity: number, min 0, step 1.
  - The array-level error shows as a `<p>` (L1067-1073).
  - The initial value is one EMPTY_OPTION (L298).

**Promo Code**
- If the category is not paid, the tab shows `"Promo codes are only available for Paid events."`
- Otherwise there is a "Promo Codes" list.
  - "Add Promo Code" is shown while there are fewer than 5. Every card has a trash icon. The list starts empty.
  - Fields per code:
    - Code: placeholder `"e.g. EARLYBIRD10"`.
    - Discount Percentage: number, 0-100, step 1.
    - Limit: number, min 0, step 1.
    - "Applies to (leave empty for all tickets)": one Checkbox per option that has a name. The checkboxes store option **names**, not ids. With no named options it shows `"Add ticket options in the Pricing tab first."`

**Host Details** (h2 "Host Details")
- Name: placeholder `"Host name"` (`host_name`).
- Email: placeholder `"e.g. hello@gmail.com"`.
- Phone Number: placeholder `"e.g. +61 234 567 890"`.
- Website Link: placeholder `"e.g. example.com"`.
- Support: Textarea (`support_details`).

**Settings**
- "Maximum tickets per booking request": number, min 1. The default is `"10"`.
- "Show remaining tickets": Switch, help text `"Display how many tickets are left to buyers."`. The default is `true`.

#### Client zod schema: verbatim, EventsForm.tsx L51-167 (zod ^4.3.6)
```ts
_id: z.string().optional(),
title: z.string().min(2, "Title is required").regex(/^[a-zA-Z0-9\s]+$/, "Special characters are not allowed"),
image: z.union([
  z.string().min(1, "Event image is required"),
  z.any().refine((file) => file instanceof File, "Image must be either a string or a file")
         .refine((file) => !(file instanceof File) || file.size <= 3*1024*1024, "Image must be less than 3MB"),
]),
venue: z.string().optional(),
dateRange: z.object({ from: z.date().optional(), to: z.date().optional() }),
email: z.email("Invalid email address").optional().or(z.literal("")),
phone_number: z.string().optional().or(z.literal("")),
website_link: z.union([z.string(), z.literal("")]).optional(),
startTime: z.string().min(1, "Start time is required"),
endTime: z.string().optional(),
category: z.string().min(1, "Category is required"),
category_name: z.string().optional(),
price_category: z.enum(["registration","paid","external"]),
ticket_link: z.string().optional(),
registration_capacity: z.string().optional().nullable(),
max_tickets_per_request: z.string().optional().nullable(),
show_remaining_tickets: z.boolean().optional(),
options: z.array(z.object({ _id?, name?, release_date?: string|null, close_date?: string|null, price?: string|null, capacity?: string|null }))
         .max(5, "You can add up to 5 options").optional(),
promo_codes: z.array(z.object({ _id?, code?, discount_percentage?: string|null, limit?: string|null, applicable_options?: string[] }))
         .max(5, "You can add up to 5 promo codes").optional(),
event_rules, refund_policy, host_name, support_details: z.string().optional(),
description: z.string().min(10, "Description must be at least 10 characters"),
location_tba: z.boolean().optional(), location: z.string().optional(),
latitude: z.number().optional(), longitude: z.number().optional(),
slug: z.string().optional().nullable(),
```

**superRefine (L126-166)**
- If not `location_tba`:
  - `location` trimmed shorter than 2 → `"Location is required"` (path `location`).
  - `venue` trimmed shorter than 2 → `"Venue is required"` (path `venue`).
- If paid and no option has name, release_date, price and capacity all set → `"Add at least one complete ticket option (name, release date, price, capacity)"` (path `options`).
- If external and `ticket_link` trimmed is shorter than 3 → `"Ticket link is required for external ticketing"`.

**Messages that come from zod defaults, not repo strings (UNVERIFIED exact text)**
- `dateRange` is not in defaultValues, so with no dates picked the object is `undefined` and zod v4 emits its default object error.
- For an empty `image` on create, the union failure message that FormMessage shows is the zod v4 default invalid-union message.
- Create-mode dates are otherwise enforced only by the server (see below).

**Cross-field rule on edit (L418-436):** if both the existing `data.dateRange.to` and the new `to` exist, and new < current:
- `setError("dateRange", "End date cannot be earlier than the event's current end date.")`
- Switch to the location tab, show the same text as a toast, and abort.

The **server message differs**: `"End date cannot be set earlier than the event's current end date."` (see §2b).

There are **no** client rules for: release_date ≤ close_date, `from` ≤ event dates, the promo discount range (only HTML `max=100`), or `startTime` < `endTime`.

#### Submit payload (L438-479): always `multipart/form-data` (FormData), for both create and edit
- Every key in `values` is appended. `""`, `null` and `undefined` are appended as `""`.
- `dateRange` → `JSON.stringify({from:"yyyy-MM-dd", to:"yyyy-MM-dd"})`.
  - **Bug:** if `to` is undefined, the code calls `value.to.split`, which would throw. With react-day-picker v9, a first click normally sets from = to, so this is rare (**UNVERIFIED** in runtime).
- `options` → JSON string of the options that have *any* of name, price, capacity, release_date or close_date set.
  - Each element is `{_id?, name, release_date, close_date, price, capacity}`, with all values as **strings**.
  - **`_id` is included for existing options** (loaded at L286-297 and L381-392).
- `promo_codes` → JSON string of the codes that have any of code, discount_percentage or limit set.
  - Each element is `{_id?, code, discount_percentage, limit, applicable_options: string[] /* option names */}`.
  - `_id` is included for existing codes.
- `show_remaining_tickets` → `"true"` / `"false"`.
- `image` → the File (new upload) or the existing URL string.
- `_id` → the event id in edit mode, `""` in create mode.
- `latitude`/`longitude` are appended as numbers converted to strings. The defaults are 0.
- `slug` is never set by the form.

**Routing (`useCreateEvent`, event.service.ts:152-169)**
- `formData.get("_id")` truthy → **PATCH `/api/event/edit/${_id}`**. Otherwise **POST `/api/event`**.
- mutationKey `["createEvent"]`.

**onSuccess**
- Toast `"Event updated successfully"` (if `_id`) or `"Event created successfully!"`.
- `invalidateQueries(["event"])`, `router.push("/dashboard/events")`, `form.reset()`.
- `["singleEventForm", id]` is **not** invalidated.

**onError:** `toast.error(error.response?.data?.message || "Failed to create event")`. With fetch-based `Post`/`PATCH`, `error.response` never exists, so **every** create or edit failure shows `"Failed to create event"`.

#### 2a. POST `/api/event` (create): `app/api/event/route.ts:9-168`
- Auth: getServerSession. On failure: 401 `{error:"Unauthorized"}`. No category or isblocked check.
- Fields read from formData: title, description, venue, city, community, category, location, location_tba (`=== "true"`), email, phone_number, website_link, dateRange, price_category, ticket_link, options, promo_codes, event_rules, refund_policy, host_name, support_details, startTime, endTime, latitude/longitude (parseFloat), registration_capacity, max_tickets_per_request, show_remaining_tickets (`!== "false"`), image.
- **`category_name` is NOT read**, so the custom "Others" name is lost on create.
- `slug = generateSlug(title)`, defined in `edit/[id]/route.ts:9-15`: lowercase, strip non-`[a-z0-9\s]`, then **remove all whitespace**. There is no uniqueness check.
- Validation: `if (!file || !title || !dateRangeRaw)` → 400 `{ error: "Missing required fields (Title, Image, or Dates)" }`.
- The image is uploaded to S3 (`uploadToS3`), and `image` is set to the upload's `Location`.
- Gating by price category:
  - `ticket_link` is kept only if external.
  - `options` and `promo_codes` are kept only if paid.
  - `registration_capacity` is kept (as a Number) only if registration and non-empty.
  - `max_tickets_per_request` defaults to 10 when empty.
- Success:
  ```ts
  201 { data: EventDoc, message: "Event created successfully" }
  ```
- Any thrown error: **400** `{ error: error.message }`.

#### 2b. PATCH `/api/event/edit/[id]`: `app/api/event/edit/[id]/route.ts:114-271`
- Auth: getServerSession. Fails with 401 `{error:"Unauthorized"}` if there is no session or no user.
- Every string value that starts with `{` or `[` is `JSON.parse`d. The result is then validated with **`eventSchema.partial().parse(rawData)`**.

**Server zod schema (L17-108) and exact strings**
```ts
title: min(2,"Title is required");
image: union[string, any.refine(File,"Image must be either a string or a file")];
venue: z.string().min(2,"Venue is required");
dateRange: {from: string, to: string};
email: z.email("Invalid email address").optional().or(literal(""));
phone_number, website_link optional;
slug: z.string();
startTime: min(1,"Start time is required");
endTime?;
category: min(1,"Category is required");
category_name?;
price_category enum;
ticket_link?;
registration_capacity: preprocess(""|"undefined"→null, coerce.number().nullable().optional());
max_tickets_per_request: preprocess(""|"undefined"→10, coerce.number().optional());
show_remaining_tickets: preprocess("true"/"false"→bool, boolean().optional());
options[]: {_id?, name?, release_date?: string, close_date?: string, price: preprocess(""→0, coerce.number()), capacity: preprocess(""→0, coerce.number())} .max(5,"You can add up to 5 options");
promo_codes[]: {_id?, code?, discount_percentage: ""→0 coerce, limit: ""→0 coerce, applicable_options?: string[]} .max(5,"You can add up to 5 promo codes");
event_rules?, refund_policy?, host_name?, support_details?;
community: min(1,"Community is required");
community_name?;
city: min(2,"City is required");
description: min(10,"Description must be at least 10 characters");
location_tba: preprocess bool;
location?;
latitude/longitude: coerce.number().optional()
```

**Edit pitfall (bug):** `.partial()` only makes keys optional; a value that is present is still validated. The web form always sends `venue`, so a TBA event with an empty venue gets 400 `{error: ZodIssue[]}` (from "Venue is required"), and the web toast shows "Failed to create event". Same for `dateRange: ""`, which fails the object check.

**Ownership and ordering**
- `Event.findById` runs, then `event.user.toString()` is evaluated **before** the null check (L146-151).
- So an unknown id causes a TypeError, which returns **500**. The 404 `{error:"Event not found"}` is effectively unreachable.
- Not owner and not super-admin → 403 `{ error: "You can only edit your own events" }`.

**End-date rule (L160-176):** a new `to` earlier than the stored `to` → 400 `{ error: "End date cannot be set earlier than the event's current end date." }`.

**Image (L178-196):** only when `image` is a non-empty File, the old S3 object is deleted (failures are ignored), the new file is uploaded, and the URL replaced. A string value keeps the existing image.

**Defaults reset:** `email, phone_number, website_link, ticket_link, category_name, community_name, endTime` default to `""`, and `options`/`promo_codes` default to `[]` when they are not sent.

**Merging by `_id` (L214-229)**
- Each option is merged as `{...opt, sold: existing?.sold || 0}`. Each promo is merged as `{...promo, used: existing?.used || 0}`. `existing` is matched by `opt._id` against the stored `_id.toString()`.
- An entry sent **without `_id`** becomes a new subdocument with sold/used 0. The old one is dropped, because the whole array is replaced with `$set`. No duplicate is created; the counter is lost instead.
- **`held` is not carried over**, so the default resets it to 0 on every edit. That is a potential hold-accounting bug.

**Category gating (L231-242)**
- `effectiveCategory = validated.price_category ?? event.price_category`.
- Non-external events get `ticket_link=""`. Non-paid events get `options=[]` and `promo_codes=[]`. Non-registration events get `registration_capacity=null`.

**Update:** the slug is regenerated if `title` is sent. Then `findByIdAndUpdate($set, {new:true, runValidators:true})`.

**Responses**
```ts
200 { message: "Event updated successfully", data: EventDoc }
400 { error: ZodIssue[] }          // ZodError
400 { error: "End date cannot be set earlier than the event's current end date." }
403 { error: "You can only edit your own events" }
500 { error: string }
```

#### 2c. GET `/api/event/single-event-for-form/[id]`: `app/api/event/single-event-for-form/[id]/route.ts`
- Auth: getServerSession. On failure: 401 `{message:"Unauthorized"}`.
- `Event.findById(id).populate("user","email business_name").lean()`. **promo_codes are included** (no projection).
- Not found → 404 `{message:"Event not found"}`.
- Not owner and not super-admin → 403 `{message:"Forbidden"}`.
- Success:
  ```ts
  200 { message: "Event fetched successfully", data: EventDoc & { user: { _id, email, business_name } } }
  ```
- Error: 500 `{error}`. An invalid ObjectId such as `"null"` also returns 500.

---

### 3. `/dashboard/events/redemtion-table` ("Event Redemption Overview")

- Page: `app/dashboard/events/redemtion-table/page.tsx` re-exports `components/Dashboard/Events/EventTableOfRedemtion.tsx`.

#### API
- `useGetEventRedeemBusiness()` → GET `/api/event/redeem/get-business`, key `["redeem-business"]` (event.service.ts:276-282).
- `useGetEventTicketPurchase("")` → GET `/api/event/ticket/purchase` with no eventId, key `["ticket-purchase-business",""]` (L284-292).

#### Aggregation (L34-76), grouped by event
- **Total Redeemed** = number of registration redemptions + Σ`purchase.uniqueKeys.length`.
- **Total Verified** = registrations with `status==="verified"` + Σ`purchase.verifiedKeys.length`.
- **Conversion** = `round(verified/redeemed*100)%`, or `"0%"`.
- The event name falls back to `"Unknown Event"`.
- **Only events with at least one registration or purchase appear.** This is not a list of all events.

#### UI
- Title: `"Event Redemption Overview"`.
- Columns: Event Name (clickable → `/dashboard/events/redemtion-table/${eventId}`), Total Redeemed (badge `"{n} Tickets"`), Total Verified, Conversion.
- Loading: a centred spinner.
- Empty: `"No redemption data found."`.
- Error: none.

#### GET `/api/event/redeem/get-business`: `app/api/event/redeem/get-business/route.ts`
- Auth: getServerSession. On failure: 401 `{message:"Unauthorized"}`.
- `EventRedemption.find({ business: session.user.id }).populate("event")`. The full Event is populated, including promo_codes.
- Success:
  ```ts
  200 { data: EventRedemption[] }
  ```
  `find` never returns null, so the `{redeemed:false}` branch is dead.
- Error: 500 `{error}`.
- Model (`server/models/EventCodeRemtion.model.ts`):
  ```ts
  { _id, event: ObjectId|Event, user: ObjectId, business: ObjectId, uniqueKey: string /* unique */, status: "pending"|"verified", verifiedAt?: Date, createdAt, updatedAt }
  ```
  - There is a unique index on `{event, user}`.
  - `redeem/route.ts:89` passes `userName`, but it is **not in the schema**, so strict mode drops it.

---

### 4. `/dashboard/events/redemtion-table/[id]` ("Manage event")

- Page: `app/dashboard/events/redemtion-table/[id]/page.tsx` re-exports `components/Dashboard/Events/ManageEventPage.tsx`.
- Embedded component: `VerifyEvents.tsx`.
- Helper: `components/Dashboard/Ticket/ticket-utils.ts`.

#### API (L188-196)
- `useGetSingleForForm(id)` → GET `/api/event/single-event-for-form/${id}`, key `["singleEventForm",id]`.
- `useGetEventVerifyUsers(id)` → GET `/api/event/verify/${id}`, key `["verify-users",id]`.
- `useGetEventTicketPurchase(id)` → GET `/api/event/ticket/purchase?eventId=${id}`, key `["ticket-purchase-business",id]`. **Yes, this feeds Orders, Overview earnings and the Sales Report.**
- `useSetTicketStatus()` → POST `/api/event/verify/manual` with `{uniqueKey, status:"verified"|"pending"}`.
- `useSendInvoice()` → POST `/api/event/ticket/purchase/${purchaseId}/send-invoice` with body `null`.

#### Loading and error
- `if (eventLoading || !event)` → `"Loading event..."` (L811-815).
- A 403/404/500 leaves `event` undefined, so the page shows **"Loading event..." forever**. There is no error state.

#### Header
- Avatar.
- Status badge, same `getEventStatus` as the list: Upcoming / Live / Past / Archived (amber).
- Title and date line.
- "Preview" link (`/events/${slug}`, new tab, shown only if there is a slug).
- Kebab menu:
  - **Copy URL**.
  - **Edit event** → `/dashboard/events/add-event?id=${id}`.
  - Submenu **Generate Sales Report** → "Download as CSV" / "Download as PDF".
  - Delete is commented out.

#### Sidebar (`NAV_SECTIONS` L161-180)
- Header: "Manage event".
- "Overview".
- Group "Orders/Refunds" → "Orders".
- Group "Manage attendees" → "Attendees", "Scanning count".
- Group "Reports" → "Analytics".
- "Verify Tickets".
- Groups are collapsible and open by default. The default tab is overview.

#### Overview
- "Share event" card shows `${origin}/events/${slug}`, or `"No public link yet"`, with a copy button.

**Paid events**
- `"Total Amount: $X"`, where X = Σ `totalAmount` over purchases.
- Tiles:
  - **Capacity** `soldTotal/capacityTotal`, or `∞` when the capacity total is 0.
  - **Tickets Sold** = Σ`options.sold`.
  - **Orders** = number of purchases.
- Breakdown rows: "Your Earnings" (Σ ticketTotal), "Service fee", "Surcharge", and a bold "Total Amount".
- Card "Earnings by Ticket Type": Σ `unitPrice*quantity` per `optionName`. Empty copy: `"No sales yet for any ticket type."`.

**External events:** "External Ticketing" with `"Tickets for this event are sold on a third-party site — WHA does not track sales or earnings for it."`

**Registration events:** "Registrations", showing `rows.length` and `"Free event — no earnings to track."`

`money(n)` = `$` + `toFixed(2)`.

#### Orders
- Search placeholder `"Search invoice or buyer"`. It matches invoiceNumber, user.name and user.email.
- Columns: Invoice, Buyer (`name || email || "N/A"`), Buyer Email, Items (`"2x VIP, 1x GA"`), Total, Status, Date (`dd MMM yyyy h:mm aa`), Actions.
- Status is "Checked In" if `p.status==="verified"`, i.e. all codes verified. Otherwise it is "Pending".
- States: loading `"Loading..."`. Empty: `"No orders yet."` or `"No orders match your search."`.

**Row actions**
- **View Invoice**: Dialog titled `"Invoice {invoiceNumber}"` showing Buyer, Date, item lines `"{optionName} × {qty}"` with amount, Service fee, Surcharge, Total.
- **Print Invoice**: `window.open` HTML (title "Invoice", buyer, invoice #, date, items, fees, total), then `print()` after 250 ms.
- **Send Invoice**: POST send-invoice. A spinner shows while sending.
  - Success toast: `"Invoice sent to buyer"`.
  - Error toast: `error.message || "Failed to send invoice"`. This is a **raw JSON string** (§0).
  - No query invalidation.
- **Download Tickets**: client-side jsPDF, pages 100×160 mm, one page per code from `getTicketCodes`.
  - Each page has the `/wha/logo.png` logo, title, date (`en-AU` locale `d MMM yyyy`), venue, a 60 mm QR (`QRCodeCanvas` of the code, level H), the holder name, `"Ticket {i} of {n} · {label}"`, and the code in courier.
  - File name: `{title-slug}-tickets-{invoiceNumber|_id}.pdf`.
  - Error toast: `"Couldn't download tickets"`.

#### Attendees
- Heading: "Attendees" with sub-line `"checked-In :{verified in filtered rows}/ {rows.length}"`.
- Search placeholder `"Search by name"` (user.name only).
- Columns: Name (`user.name || "N/A"`), Ticket Type (`ticketType || "General"`), Unique Key, Checked In (a dropdown badge), Checked In Date (`dd MMM yyyy h:mm aa` or `-`).
- Badge text: `"Checked In"` or `"Not Checked In yet"`. Menu items: `"Mark Checked In"` / `"Mark Pending"`. Picking the current status does nothing.
- Empty: `"No ticket holders yet."` or `"No attendees match your search."`.

**Confirm dialog (L1583-1615), exact copy**
- Title: **"Change ticket status?"**
- Body: `Are you sure you want to change status of <strong>{row.user?.name || "this buyer"}</strong> to <strong>{"Checked In"|"Pending"}</strong>?`
- When the target is pending, it adds: ` Their checked-in date will be removed.`
- Buttons: "Cancel" / "Confirm" (disabled while pending).

**On success**
- Toast `` `Status updated to ${"Checked In"|"Pending"}` ``.
- Invalidate `["verify-users", id]`, `["ticket-purchase-business"]` and `["redeem-business"]`.

**On error:** toast `error.message || "Failed to update status"` (raw JSON string).

**What reverting to pending does on the server** (`verify/manual`)
- Registration: `status="pending"` and `verifiedAt=undefined`.
- Paid ticket: the code is removed from `verifiedKeys` and its own `verifiedTimestamps` entry is removed. The purchase `status` is recomputed: `verified` only if every key is verified, otherwise `pending`.
- `verifiedAt` (purchase-level) is not cleared when reverting.

#### Scanning count
- Tiles: "Total Tickets" (`rows.length`), "Checked In", "Not Checked In Yet".
- Table "By ticket type" with columns Ticket Type, Total, Checked In, Remaining. Empty: `"No tickets yet."`.

#### Verify Tickets
- Header "Verify Tickets" with `"Only tickets purchased or registered for this event will be accepted."`
- Renders `<VerifyEventPage eventId={id} hideHeader />` (see §5).

#### Analytics
- Paid events: one row per `event.options` with Ticket Type, Price, Capacity (`?? "∞"`), Sold, Remaining (`capacity - sold`, or `∞`), Revenue (from purchases, by name). Empty: `"No ticket types configured."`.
- External events: `"External ticketing events do not have in-app analytics."`
- Registration events: `"Total registrations: {rows.length}"`.

#### Sales Report (L398-594): client-side only
- Revenue excludes fees.
- `ticketTypeSales` is built per optionName from purchases: quantity, revenue = Σ unitPrice*qty, and price.
  - Price is the current option list price, or revenue/qty when the option no longer exists.
  - promoUses and discount are counted only for orders that have a `promoCode` **and** `unitPrice < current list price`. Then `discount += (base-unitPrice)*qty` and `promoUses += qty`.
- Promo buyer rows: buyer (`name||email||"N/A"`), `promoCode.toUpperCase()`, ticket type, quantity, unit price.
- File name: `sales-report-{title with non-alnum→"-", lowercased}.csv|.pdf`.

**CSV** (every cell quoted, `"` escaped as `""`, `\n` line endings)
```
"Sales Report","<title>"
"Generated","dd MMM yyyy h:mm aa"
(blank)
"Total Earnings (excl. service fee & surcharge)","$X"
(blank)
"Earnings by Ticket Type"
"Ticket Type","Price Per Ticket","Tickets Sold","Promo Uses","Discount Given","Earnings"
...rows...
"Total","",<qty>,<promoUses>,"$disc","$ticketTotal"
(blank)
"Buyers Who Used a Promo Code"
"Buyer","Promo Code","Ticket Type","Quantity","Price"
...rows... or "—","—","—",0,"$0.00"
```

**PDF** (jsPDF + autotable)
- Title "Sales Report", the event title, and "Generated …".
- A navy banner with "TOTAL EARNINGS", `$X`, and "Excludes service fee & surcharge".
- A ticket-type table with the same columns plus a bold "Total" footer.
- The heading "Buyers Who Used a Promo Code" and its table. With no promo use, the table row is `["—","—","No promo codes used","",""]`.

#### GET `/api/event/verify/[id]`: `app/api/event/verify/[id]/route.ts`
- Auth: getServerSession. On failure: 401 `{message:"Unauthorized"}`.
- **No ownership check**: any logged-in user can list the attendees of any event id.
- Response:
  ```ts
  200 {
    message: "Event attendees fetched successfully",
    data: Array<{
      _id: string;            // redemption _id, or `${purchaseId}-${code}` for paid
      user: { _id: string; name: string } | null;
      uniqueKey: string;
      ticketType: string;     // "General" for registrations, item.optionName for paid
      status: "verified" | "pending";
      verifiedAt: string | null; // per-code timestamp → purchase.verifiedAt fallback → null
    }>
  }
  ```
  Registration rows come first, then paid rows.
- Error: 500 `{error}`.

#### GET `/api/event/ticket/purchase`: `app/api/event/ticket/purchase/route.ts:194-217`
- Auth: getServerSession. On failure: 401 `{message:"Unauthorized"}`.
- Query: `?eventId=` is optional. The filter is `{business: session.user.id, event?: eventId}`.
- Populates `event` (full document) and `user` (`name email`). Sorted by `createdAt` descending.
- A super-admin viewing someone else's event gets an empty list, because the filter is by business.
- Response:
  ```ts
  200 { data: Array<{
    _id; event: EventDoc; user: { _id; name; email }; business: ObjectId;
    items: { optionId; optionName; quantity; unitPrice; uniqueKeys: string[] }[];
    uniqueKeys: string[]; verifiedKeys: string[];
    verifiedTimestamps: { key: string; verifiedAt: Date }[];
    promoCode?: string; invoiceNumber: string;
    ticketTotal: number; serviceFee: number; surcharge: number; totalAmount: number;
    paymentIntentId: string; status: "pending"|"verified"; verifiedAt?: Date; createdAt; updatedAt;
  }> }
  ```
  The model is `server/models/EventTicketPurchase.model.ts`. Note that `paymentIntentId` is included in the response.
- Error: 500 `{error}`.
- POST on the same path is the consumer purchase finalize. It uses `getAuthUser` and is not part of the dashboard.

#### POST `/api/event/ticket/purchase/[purchaseId]/send-invoice`
File: `app/api/event/ticket/purchase/[purchaseId]/send-invoice/route.ts`
- Auth: getServerSession. On failure: 401 `{message:"Unauthorized"}`.
- Not found → 404 `{ error: "Order not found" }`.
- `purchase.business` is not the session user → 403 `{ message: "Unauthorized for this business." }`.
- No buyer email → 400 `{ error: "This order has no buyer email on file" }`.
- Sends `sendInvoiceEmail` with subject `` `Invoice ${invoiceNumber} for ${eventName}` `` (`lib/mail.ts:527`).
- Success: 200 `{ success: true, message: "Invoice sent" }`.
- Error: 500 `{error}`.

#### POST `/api/event/verify/manual`: `app/api/event/verify/manual/route.ts`
- Auth: getServerSession. On failure: 401 `{message:"Unauthorized"}`.
- Body: `{ uniqueKey: string, status: "verified"|"pending" }`. Missing or invalid → 400 `{ message: "Invalid request" }`.
- Matching is **case-sensitive / exact** (`findOne({uniqueKey})` and `{uniqueKeys: uniqueKey}`), unlike the POST verify route.
- Registration path:
  - Business mismatch → 403 `{message:"Unauthorized for this business."}`.
  - Otherwise sets the status and `verifiedAt` (`new Date()` or `undefined`), then returns `{ success: true, status }`.
- Paid path:
  - Not found → 404 `{ message: "Ticket code not found." }`.
  - Business mismatch → 403.
  - Otherwise backfills legacy `verifiedTimestamps`, then on verify adds the key and a timestamp (setting `purchase.verifiedAt`), or on pending removes the key and its timestamp.
  - Recomputes `status` and returns 200 `{ success: true, status: purchase.status }`. Note this is the **purchase** status, not the code's status.
- Error: 500 `{error}`.

---

### 5. `/dashboard/events/verify-event` (ticket verification)

- Page: `app/dashboard/events/verify-event/page.tsx` re-exports `components/Dashboard/Events/VerifyEvents.tsx`.
- Props: `eventId?` and `hideHeader?`. On the standalone route, `eventId = params.get("id") || ""`.
- The dashboard links to this route **without** `?id`, so the event is `""` and there is **no wrong-event check**.

#### UI
- Header (unless hidden): "Verify Event" / "Scan QR or enter the unique code".
- Result banner: green or red with the message text.
- The "Open QR Scanner" tile mounts `@yudiel/react-qr-scanner` `<Scanner scanDelay={2000} allowMultiple={false}>`. Each scan calls verify with `result[0].rawValue`, which is **not** uppercased.
- "Cancel Scan" closes the scanner.
- While pending there is an overlay: `"Verifying Code..."`.
- Divider: "Or manual entry".
- Input: placeholder `"ENTER UNIQUE CODE"`. It **uppercases as you type**.
- Button: "Verify Code". An empty code toasts `"Please enter or scan a code"`.

#### Verify call
- `useVerifyEvent()` → POST `/api/event/verify` with body `{ uniqueKey, event: eventId }`, mutationKey `["verify-event"]`.
- On success: banner and toast `"Ticket verified successfully!"`, the code is cleared, and the hook invalidates `["verify-users"]` (all events), `["ticket-purchase-business"]` and `["redeem-business"]`.
- On error: banner and toast `parseErrorMessage(error, "Verification failed")`, which uses `parsed.message || parsed.error`.

#### POST `/api/event/verify`: `app/api/event/verify/route.ts`
- Auth: getServerSession. On failure: 401 `{message:"Unauthorized"}`.

**Matching:** **case-insensitive and trimmed**: regex `^<escaped>$` with flag `i` (L28-29).
- It checks `EventRedemption` (registration) first, then `EventTicketPurchase.uniqueKeys`.
- Key formats:
  - Registration: `WHA-EVT-XXXXXXXX` (`redeem/route.ts:84`).
  - Paid: `WHA-<TITLE-WITH-DASHES-UPPERCASED>-XXXXXXXX` (`server/lib/eventTicketFinalize.ts:86-89, 194-198`).

**Order of checks and exact responses**

| Case | Status | Body |
|---|---|---|
| missing / non-string `uniqueKey` | 404 | `{ message: "Invalid ticket code." }` |
| registration found, `business` ≠ session user | 403 | `{ message: "Unauthorized for this business." }` |
| registration, `event` given and ≠ ticket's event | 400 | `{ message: "This ticket is not valid for this event." }` |
| registration already verified | 400 | `{ message: "Ticket already used." }` |
| registration valid | 200 | `{ success: true, message: "Ticket verified successfully!", data: { attendee: redemption.userName /* always undefined — not in schema */, verifiedAt } }` |
| no registration and no purchase match | 404 | `{ message: "Invalid ticket code." }` |
| purchase, business mismatch | 403 | `{ message: "Unauthorized for this business." }` |
| purchase, wrong event | 400 | `{ message: "This ticket is not valid for this event." }` |
| purchase, code already in `verifiedKeys` | 400 | `{ message: "Ticket already used." }` |
| purchase valid | 200 | `{ success: true, message: "Ticket verified successfully!", data: { attendee: user.name, ticketType: item.optionName, verifiedAt } }` |
| exception | 500 | `{ error: string }` |

- Ownership is checked **before** the wrong-event check. A ticket from another business returns 403, not "not valid for this event".
- On a valid paid ticket, the key is resolved to its stored casing, pushed onto `verifiedKeys`, given a `verifiedTimestamps` entry (with a legacy backfill), and the purchase `status` becomes `"verified"` once every key is verified.
- There is no check that the event is live or today. Past or upcoming tickets verify fine.

---

### 6. Other event routes

#### POST `/api/event/archive/[id]`: `app/api/event/archive/[id]/route.ts`
- Auth: getServerSession. On failure: 401 `{ message: "Unauthorized" }`.
- Not found → 404 `{ error: "Event not found" }`.
- Not owner and not super-admin → 403 `{ error: "You can only archive your own events" }`.
- The same `getEventStatus` / `getTicketsTakenCount` logic as the client (L11-41) runs in the **server's timezone** (UTC vs local is **UNVERIFIED**). When archiving, `status !== "past" && ticketsTaken > 0` → 400 `{ error: "This event can't be archived while it still has tickets taken. You can archive it once the event has ended." }`.
- It is a **toggle** (`archived = !archived`, then save). The pre-save hook also refreshes `geo`.
- Success:
  ```ts
  200 { message: "Event archived" | "Event unarchived", data: EventDoc }
  ```
- Error: 500 `{error}`.
- Archived events are **not filtered anywhere else**: not in public `getallevent`, `single-event`, or purchase/redeem. I grepped `archived` across the repo; the only hits are the archive route, the two dashboard components, the model, the service type and the docs.

#### POST `/api/event/delete/[id]`: `app/api/event/delete/[id]/route.ts`
- The whole body is commented out. It **always** returns 500 `{ message: "cannot delete" }`, with no auth check.
- The client hook is commented out (`event.service.ts:225-234`).
- **Delete is not supported.**

#### GET `/api/event/single-event/[id]` (public): `app/api/event/single-event/[id]/route.ts`
- **No auth.** The `id` is the **slug** (`findOne({slug})`). It first calls `releaseExpiredHolds`.
- Selects `-options.promo_code -promo_codes` and populates `user` with `"email business_name city location image"`.
- Not found → 404 `{ message: "Event not found" }`.
- Success:
  ```ts
  200 { message: "Event fetched successfully", data: EventDoc & { reviews: Review[] } }
  ```
- Error: 500 `{error}`.
- Not used by the dashboard.

#### GET `/api/event/getallevent` (public): `app/api/event/getallevent/route.ts`
- **No auth.**
- Params: `category, search, city, community, from, lat, lng, radius, swLat, swLng, neLat, neLng`. **`to` is ignored.**
- Filter: `dateRange.from >= (from || today)`. With coordinates it runs a distance pipeline; otherwise it sorts by `dateRange.from` ascending. The limit is 200.
- **promo_codes are excluded** (`$unset` at L134, `select` at L140 and L148).
- Archived events are **not** excluded.
- Success:
  ```ts
  200 { data: Event[], message: "Events retrieved successfully" }
  ```
- Error: 500.
- Not used by the dashboard.

#### GET `/api/tickets`: `app/api/tickets/route.ts`
- This is a consumer "my tickets" route, not used by the events dashboard.
- Uses `getAuthUserDetailed` (bearer is OK, includes `isblocked`/deleted checks). A rejected bearer gets `{message:{message:"Unauthorized",code}}` with 401/403; a web caller without auth gets 401 `{message:"Unauthorized"}`.
- Returns `{ message: "Tickets fetched successfully", data: [...dealRedemptions, ...eventRedemptions, ...eventPurchases] }`, with `deal`/`event` populated.
- **Side effect:** it deletes orphaned records whose deal or event is null.

#### Not called by the dashboard
- `/api/event/redeem` (POST/GET, consumer, `getAuthUserDetailed`).
- `/api/event/ticket/hold` and `/hold/release`.
- `useGetEventRedeem` (key `["redeem"]`).
- `services/redeemandverify.service.ts` is **deals-only** (`/api/deals/redeem*`). It is **not** used by events.

---

### 7. React Query keys and invalidation summary

| Hook | Key / mutationKey | Endpoint | Invalidates on success |
|---|---|---|---|
| useGetEvent | `["event"]` | GET /api/event | — |
| useGetSingleForForm | `["singleEventForm", id]` | GET /api/event/single-event-for-form/:id | — |
| useGetEventRedeemBusiness | `["redeem-business"]` | GET /api/event/redeem/get-business | — |
| useGetEventTicketPurchase | `["ticket-purchase-business", eventId\|""]` | GET /api/event/ticket/purchase[?eventId=] | — |
| useGetEventVerifyUsers | `["verify-users", id]` | GET /api/event/verify/:id | — |
| useCreateEvent | `["createEvent"]` | POST /api/event or PATCH /api/event/edit/:id | `["event"]` |
| useArchiveEvent | `["archiveEvent"]` | POST /api/event/archive/:id | `["event"]` (not the singleEventForm key) |
| useVerifyEvent | `["verify-event"]` | POST /api/event/verify | `["verify-users"]`, `["ticket-purchase-business"]`, `["redeem-business"]` |
| useSetTicketStatus | `["set-ticket-status"]` | POST /api/event/verify/manual | `["verify-users", id]`, `["ticket-purchase-business"]`, `["redeem-business"]` |
| useSendInvoice | `["send-invoice"]` | POST …/send-invoice | none |

---

### 8. Where the docs in `F:\whamobileapp\docs\mobile` disagree with the code

1. **Archive rule is wrong**
   - Docs: `06-features-and-business-logic.md:80-83`, `03-screens.md:225-228` and `04-api-reference.md:255` say an event "can only be archived once it has ended".
   - Code (`archive/[id]/route.ts:66-78`, `EventsPage.tsx:185-195`): archiving is blocked **only** when the event is not past **and** tickets taken > 0.
   - So zero-sale events and all external events can be archived any time. Unarchive is always allowed, and archive is a toggle.
   - "Ended" means calendar day > `dateRange.to`, not the end time.
2. **Tab count is wrong.** `03-screens.md:49,224` say "Upcoming/Live/Past tabs". There is also an **Archived** tab (`EventsPage.tsx:123-128`).
3. **The event form does not gate steps.** `07-forms-and-validation.md:55-58` says the event form validates "a named subset of fields per step before allowing Next".
   - The event form has no Next button. Tabs navigate freely.
   - Validation happens only on submit (full schema), and `onInvalid` jumps to the first errored tab.
   - The red dot only reflects top-level error keys.
   - Description, category and startTime have no inline FormMessage.
4. **Confirm-dialog copy is incomplete.** `09-content-and-copy.md:68` gives only the sentence.
   - The actual dialog has the title "Change ticket status?", the status labels "Checked In"/"Pending", the fallback name "this buyer", the extra sentence " Their checked-in date will be removed." for pending, and Cancel/Confirm buttons.
   - It also omits the success toast `Status updated to …`.
5. **"Missing `_id` creates duplicates" is not accurate.** `04-api-reference.md:254` says a missing option/promo `_id` "will silently create duplicates".
   - In fact the whole array is replaced via `$set`, so an entry without `_id` becomes a new subdocument with `sold`/`used` set to 0 and the old counter is lost. No duplicate is created.
   - Also missing from the doc (and from 06:86): **`held` is not preserved on edit**.
6. **Case-insensitivity applies to scan only.** `04-api-reference.md:266` says verify uses case-insensitive matching and that "legacy mixed-case codes are backfilled on read".
   - Only POST `/api/event/verify` is case-insensitive. `/verify/manual` is exact-match.
   - "Backfill" refers to `verifiedTimestamps`, not codes.
   - The same row says verification is scoped to the owning business; that is true for POST verify and manual, but **GET `/verify/[id]` has no ownership check**.
7. **The getallevent promo-code leak is outdated.** `04-api-reference.md:476` lists getallevent as leaking `promo_codes`. The current code excludes them (`getallevent/route.ts:134,140,148`).
8. **The redemption table is not an event picker.** `03-screens.md:52` calls `/dashboard/events/redemtion-table` a "list of events to pick from".
   - It is an aggregated "Event Redemption Overview" (redeemed, verified, conversion).
   - It only lists events that have at least one registration or purchase.
9. **The verify page also has manual entry.** `03-screens.md:53` calls `/verify-event` "scanner-based". It also has uppercase manual entry. When reached from the dashboard there is no `?id`, so there is no wrong-event check.
10. **Error-toast detail missing from the docs.** `04-api-reference.md:201-203` is correct that the business routes are not bearer-enabled: every dashboard events route uses `getServerSession`, so a mobile bearer gets 401. Not documented anywhere: these routes don't check `isblocked`/category, and the web create/edit error toast is always "Failed to create event".
11. **Wrong request body for redeem.** `04-api-reference.md:263` gives the body as `{eventId,userId,business}`. The server reads only `eventId` (`redeem/route.ts:27`). This route is outside the dashboard scope.
12. **`99-open-questions.md` #17** (business sidebar not enumerated): `ManageEventPage NAV_SECTIONS` is fully enumerated in §4 above.

### 9. Bugs and quirks a mobile spec should not copy

- `Get` never surfaces HTTP errors. Error pages render as empty, or as "Loading event..." forever.
- Every create/edit error toasts "Failed to create event", because it reads the nonexistent `error.response`.
- Send-invoice and status-change errors toast a raw JSON string.
- Create ignores `category_name`.
- Edit 400s on an empty venue when the location is TBA.
- Edit returns 500 instead of 404 for an unknown id.
- Edit resets `options[].held`, and edit doesn't refresh `geo`.
- The form fires `/single-event-for-form/null` in create mode.
- The slug strips all spaces and has no uniqueness check.
- The verify response's `attendee` is always undefined for registrations.
- `/api/event/verify/[id]` is readable by any logged-in user.
- Archived events still appear publicly and can still be purchased. I checked the listing and detail routes for an archived filter and found none. The purchase-path finalize logic was not inspected for an archived check (**UNVERIFIED**).
- `/dashboard/events` is not in the client `PROTECTED_PATHS` list, and the server has no business-category check.

---

## Area 3 — Business DEALS: verified facts from the web source (F:\WHA)

Everything below comes from reading the source. Line numbers point to the current working tree. Anything I could not prove from code is marked **UNVERIFIED**. Paths are relative to `F:\WHA` unless they are written as absolute.

**Biggest problems for the mobile spec:**
1. **Code verification cannot succeed.** `/api/deals/verify` looks up a field called `uniqueKey`. The Redemption schema only has `uniqueKeys` (an array). Every code made by the current redeem routes comes back 404 "Invalid code. No record found."
2. **The main page's Verify button always fails.** It opens verify-deal without a deal id, and the server then rejects any code it finds with 403.
3. **The Edit form sends PATCH twice.** It calls `mutate` two times in a row.
4. **The redemptions table's "Unique Key" column is empty.** It reads `item.uniqueKey`, which doesn't exist.
5. **Error toasts are mostly wrong.** Forms always show the fallback text. The verify page shows the raw JSON body.
6. **Server checks are weak.** No deals route checks `isblocked` or the business category. Any logged-in user can read any deal's redemptions, including customer names and emails.
7. **Mobile tokens won't work.** All deals routes are cookie-only (`getServerSession`), so a bearer token gets 401.

---

### 0. Shared plumbing (applies to every route below)

- **HTTP helpers** (`lib/action.ts`):
  - `Get` (24-44) never throws on a non-2xx status. It returns the JSON body. So a 401 or 500 body becomes `data` in React Query, not an error.
  - `Post` (54-79) and `PATCH` (81-106) throw `new Error(await res.text())` on a non-2xx status. The error message is the **raw response body text**, for example `{"error":"Unauthorized"}`.
  - These are plain `Error` objects, not Axios errors. So `error.response?.data?.error` is **always undefined**, and every form falls back to its generic toast.
  - FormData bodies are sent with no headers, so the browser sets the multipart boundary (lines 59-65 and 86-92).
- **React Query** (`lib/ReactQueryContext.tsx:4`): `new QueryClient()` with default settings (staleTime 0, refetch on mount and on window focus).
- **`useFetcher`** (`lib/generic.service.tsx:8-37`): the query key is `[...baseKey]`. Every deals hook passes `queryKey: null`, so no `page`/`per_page` params are added.
- **Rate limit** (`proxy.ts:29-80`): every `/api/*` call is limited to 20 requests per 10 s, keyed by user id when a valid mobile bearer token is present, otherwise by IP. Over the limit it returns 429 `{ success:false, error:"Too many requests. Please slow down." }`.
- **Auth**: every deals route uses `getServerSession(authOptions)` (NextAuth cookie). **None of them use `getAuthUser`.** A mobile bearer token gets 401.
  - `session.user.id` comes from `token.mongodbId` (`app/api/auth/[...nextauth]/route.ts:180`).
  - The session also carries `category` and `isblocked` (182, 188), but **no deals route checks either one**.
- **Client-side guard only** (`components/Dashboard/DashboardLayout.tsx:22-29, 529-535`):
  - If `session.user.isblocked`, it redirects to `/blocked`.
  - If `category === "user"` and the path starts with `/dashboard/deals`, it redirects to `/unauthorized`.
  - There is no equivalent check on the server.
- **Navigation entries:**
  - `components/Dashboard/MobileDashboard.tsx:68-72`: "Deals" with the `BadgeDollarSign` icon.
  - `components/ResuableComponents/Sidebar.tsx:51`: "Deals" with the `Tag` icon.

#### Models
`server/models/DealSchema.model.ts` (lines 39-82 of the cat output; this is the whole file):
```ts
interface IDeal {
  title: string;               // required
  valid_till: Date;            // required
  deals_for: string;           // optional, never set by any create/edit code
  description: string;         // required
  user: ObjectId;              // ref "User" (the owning business)
  terms_for_the_deal: string;  // required
  deal_code: string;           // optional, never set by any create/edit code
  max_redemptions: number;     // required
  current_redemptions: number; // default 0 (counts issued codes/keys)
  category: string;            // required
  city: string;                // required
  image: string;               // optional in schema (S3 URL)
  price: number;               // optional
  discount_percentage: number; // optional
} // timestamps: createdAt, updatedAt
```
`server/models/CouponCodeRedemtion.model.ts` (lines 1-38):
```ts
interface IRedemption {
  deal: ObjectId;          // ref "Deal", required
  user: ObjectId;          // ref "User", required (the customer)
  business: ObjectId;      // ref "User", required (= deal.user)
  uniqueKeys: string[];    // required, length > 0  ("At least one unique key is required")
  status: "pending" | "verified"; // default "pending"
  verifiedAt?: Date;
  paymentIntentId?: string; // indexed
} // timestamps
```
There is **no `uniqueKey` (singular) field and no `userName` field.** The installed Mongoose is 9.6.1 (`node_modules/mongoose/package.json`), where `strictQuery` defaults to `false` (`node_modules/mongoose/lib/schema.js:608`). So a filter on `uniqueKey` is sent to MongoDB as-is and only matches documents that physically have that field. Whether any old documents have it is **UNVERIFIED** (I did not inspect the DB).

Code formats:
- `/redeem`: `WHA-DEAL-${8 uppercase hex}` (`app/api/deals/redeem/route.ts:53-55`).
- `/redeem/multiple`: `WHA-DEAL-XXXXXXXX-{i}of{n}` (`app/api/deals/redeem/multiple/route.ts:170-174`).

Versions: zod 4.4.3, mongoose 9.6.1, next 16.1.6, next-auth ^4.24.13, @tanstack/react-query ^5.90.20, @hookform/resolvers ^5.2.2, @yudiel/react-qr-scanner ^2.5.1.

---

### 1. Services and React Query

`services/deal.service.ts`:

| Hook | Lines | Key | Method + URL | Body |
|---|---|---|---|---|
| `useCreateDeals` | 28-42 | mutationKey `["createDeal"]` | If `FormData.get("_id")` is truthy: **PATCH** `/api/deals/edit/${_id}`. Otherwise **POST** `/api/deals` | `FormData` (multipart) |
| `useGetDeals` | 44-50 | `["deals"]` | GET `/api/deals` | none |
| `useGetDealsRedemption(id)` | 52-58 | `["deals-redemption", id]` | GET `/api/deals/redeem/single/${id}` | none |
| `useGetAllDeals` | 60-72 | `["all-deals", category, search, from, to, city]` | GET `/api/deals/get-all?category=&search=&from=&to=&city=` (public, not used by the dashboard) | none |
| `useGetSingleDeal(id)` | 74-80 | `["singleDeal", id]` | GET `/api/deals/single-deal/${id}` | none |
| `useVerifySingleDeal` | 82-91 | mutationKey `["verify-deal"]` | POST `/api/deals/verify` | JSON `{ uniqueKey, deal }` |
| `useDeleteDeal` | 92-101 | mutationKey `["deleteDeal"]` | **POST** (not DELETE) `/api/deals/delete/${id}` | JSON `{ id }` (the server ignores the body) |

`DealsGetValues` (deal.service.ts:9-26) is the client type:
```ts
type DealsGetValues = { _id: string; title: string; current_redemptions: number; max_redemptions: number;
  discount_percentage: number; price: number; valid_till: Date; deals_for: string; category?: string;
  city?: string; image?: string; description: string; user: UserBusinessType; terms_for_the_deal: string;
  deal_code: string; verifiedRedemptions: number; };
```

`services/redeemandverify.service.ts` is **not used by any dashboard screen**. It is used only by the public `components/Deal/SingleDealPage.tsx:22-24, 66-70`:
- `useRedeemCode` (29-38): POST `/api/deals/redeem`
- `useRedeemMultipleCode` (40-49): POST `/api/deals/redeem/multiple`
- `useGetRedeem` (51-57): key `["redeem"]`, GET `/api/deals/redeem`
- Its `RedeemCodeFormResponseType` (`{success, uniqueKey, paymentIntentId?}`, lines 23-27) **does not match** the real response `{ success, codes }`.

**Invalidations (the complete list for deals):**
- Only `DealCard.tsx:30` → `invalidateQueries({ queryKey: ["deals"] })`, after a delete succeeds.
- Create and edit do **not** invalidate anything. They navigate to `/dashboard/deals`, and the stale `["deals"]` query refetches on mount because staleTime is 0.
- Verify invalidates **nothing**, not `["deals-redemption", id]` and not `["deals"]`.
- `["singleDeal", id]` is never invalidated.

---

### 2. Route `/dashboard/deals` (list)

- **Page:** `app/dashboard/deals/page.tsx:1-3` re-exports `components/Dashboard/Deals/DealPage.tsx`, which renders `DealsTable` from `components/Dashboard/Deals/DealCard.tsx`.
- **API:** `useGetDeals()` → GET `/api/deals`.
- **Header copy** (DealPage.tsx:30-35):
  - h1 **"Deals dashboard"**
  - subtitle **"View and manage the deals offered by your business."**
- **Mobile header** (`md:hidden`, 13-26): a back chevron (`router.back()`) and an **"Add"** link (PlusCircle icon) to `/dashboard/deals/new`. **There is no Verify button on mobile widths.**
- **Desktop** (`hidden md:flex`, 38-49):
  - **"Verify Deal"** (ShieldCheck icon) links to `/dashboard/deals/verify-deal`, with **no `?id=`**. See section 6 for why this always fails.
  - **"Add"** links to `/dashboard/deals/new`.
- **Loading** (54-62): three skeleton boxes (`h-[400px] animate-pulse bg-slate-100 rounded-3xl`).
- **Empty** (71-75): the table header still renders, then the text **"No deals found. Click Create Deal to get started."** That copy is stale: the button is labelled "Add". The message only appears when `data.data.length === 0`.
- **Error:** there is no error state. On 401/500, `Get` returns `{error:...}`, `data.data` is undefined, the table body is empty, and the empty message does **not** show.
- **Table columns** (DealCard.tsx:43-49):

  | Column | Content |
  |---|---|
  | Title | Link to `/dashboard/deals/redeemtion/${_id}` with an ExternalLink icon (58-65) |
  | Verified Redemptions | `deal.verifiedRedemptions` |
  | Current Redemptions | `deal.current_redemptions` |
  | Max Redemptions | `deal.max_redemptions` |
  | Expiry Date | `new Date(valid_till).toLocaleDateString()` |
  | Status | Badge **"Expired"** (variant `destructive`) if `new Date(valid_till) < new Date()`, otherwise **"Active"** (variant `outline`) (54-55, 72-74) |
  | Action | Edit icon → `router.push('/dashboard/deals/edit?id=${deal._id}')` (78-83), then the delete dialog |

- **Delete** (`components/ui/DynamicDeleteButton.tsx:22-58`):
  - Trigger: a red `Trash2` icon.
  - Title **"Are you absolutely sure?"**
  - Body **"This action cannot be undone. Are you sure you want to delete { {title} }?"** The literal braces come from the JSX at 41-43.
  - Buttons **"Cancel"** / **"Delete"**.
  - `isPending` is not passed, so there is no loading state.
  - Success toast **"Deal deleted successfully"** and invalidate `["deals"]`.
  - Error toast `error.response?.data?.message || "Failed to delete deal"`, which in practice is always **"Failed to delete deal"** (DealCard.tsx:24-37).
- **Counter meanings:**
  - `verifiedRedemptions` = the number of Redemption **documents** with `status:"verified"` (`app/api/deals/route.ts:92-95`).
  - `current_redemptions` = the number of **codes/keys** issued. It goes up by `quantity` for paid multi-buys (`redeem/multiple/route.ts:190`).
  - Because of that, the two counts are not directly comparable.

---

### 3. Route `/dashboard/deals/new` (DealForm)

- **Page:** `app/dashboard/deals/new/page.tsx:1-3` → `components/Dashboard/Deals/DealForm.tsx`.
- **Heading:** back chevron, then **"Create New Deal"** (128).

#### Zod schema: `dealSchema` (DealForm.tsx:35-62), exported and reused by the Edit form

```ts
export const dealSchema = z.object({
  _id: z.string().optional(),
  title: z.string().min(2, "Title is too short"),
  valid_till: z.date().min(1, "Date must be in the future"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  terms_for_the_deal: z.string().min(1, "Terms are required"),
  max_redemptions: z.number().min(1, "Max redemptions is required"),
  category: z.string().min(1, "Category is required"),
  city: z.string().min(1, "City is required"),
  price: z.number().optional(),
  discount_percentage: z.number()
    .gte(0, { message: "Discount must be greater than 0" })
    .lt(80, { message: "Discount must be less than 80" })
    .optional(),
  image: z.union([z.string(), z.any()])
    .refine(v => typeof v === "string" ? true : v?.size <= 3000000, `Max image size is 3MB.`)
    .refine(v => typeof v === "string" ? true : ["image/jpeg","image/png","image/webp"].includes(v?.type),
            "Only .jpg, .png and .webp formats are supported."),
});
```

**How these rules actually behave** (my reading of the code plus zod 4 semantics):
- **`valid_till`:**
  - `.min(1, …)` means "on or after 1970-01-01T00:00:00.001Z", so it is **not** a real future-date check.
  - The only real guard is the UI calendar, which disables days before today at local midnight (DealForm.tsx:212-214).
  - There is no default value. If the user never picks a date, zod 4's default message shows: **"Invalid input: expected date, received undefined"** (format confirmed in `node_modules/zod/v4/locales/en.js:52-57`).
- **`max_redemptions`:**
  - No default value. If the field is never touched: **"Invalid input: expected number, received undefined"**.
  - An emptied input gives `Number("") = 0`, which shows **"Max redemptions is required"**.
  - There is no maximum and no integer rule.
- **`discount_percentage`:**
  - Allowed range is 0 to under 80, so 80 is rejected. Decimals are allowed.
  - The message "Discount must be greater than 0" is misleading: 0 passes.
- **`price`:**
  - Optional, with no minimum, so negatives pass on the client.
  - The label is **"Deal Price (optional for online payment only)"**. Default is 0.
  - **There is no cross-field rule** between price and discount, between free and paid, or between dates.
  - Free vs paid is decided only at redemption time on the public page: `price > 0` means the Stripe flow (`components/Deal/SingleDealPage.tsx:124`). The public price shown is `price - price*discount/100`.
- **`image`:**
  - Optional in the type, but `undefined` or `null` fails the first refine. So a missing image shows **"Max image size is 3MB."**, the first issue reported for that path. The second refine's issue may also be produced; react-hook-form shows the first one.
  - The file input has `accept="image/*"` (272). After choosing a file, a 160×160 preview appears with a red X that sets the value to `null` (281-303).
- **`category` and `city` errors are never displayed.** Their FormItems have **no `<FormMessage/>`** (224-259 and 312-343). Submitting without them silently fails validation.
- **`title`, `description`, `terms_for_the_deal`:** no maximum lengths.

#### Fields: label, control, placeholder (in render order)

1. **"Deal Title"**: Input, placeholder **"Summer Flash Sale"**.
2. **"Deal Price (optional for online payment only)"**: number input, **"Enter Price in AUD"**, value set with `Number(e.target.value)`.
3. **"Discount Percentage"**: number input, **"Enter Discount Percentage"**.
4. **"Valid Until"**: popover calendar button. Shows **"Pick a date"**, or the chosen date formatted with date-fns `"PPP"`.
5. **"City"**: single-select ToggleGroup. Options are exactly `"Sydney"`, `"Canberra"`, `"others"` (lowercase "others"; other cities are commented out, 236-247). It cannot be deselected (`val && onChange(val)`).
6. **"Deal Image"**: file input or preview.
7. **"Category"**: ToggleGroup with options `"Groceries"`, `"Shopping"`, `"Restaurant"`, `"Fashion"`, `"Events"`, `"Others"` (324-331).
8. **"MAX Redemption"**: number input, **"How Many People can redeem it?"**.
9. **"Description"**: Textarea, **"Describe the deal details..."**.
10. **"Terms & Conditions"**: Textarea, **"Usage limits, specific conditions..."**.
11. **Submit button:** **"Create Deal"**, or **"Submitting..."** while pending (disabled).

Defaults (68-79): `title:"", description:"", terms_for_the_deal:"", category:"", city:"", price:0, discount_percentage:0`.

#### Submit payload (82-115): multipart `FormData` → POST `/api/deals`

| field | value |
|---|---|
| `title` | string |
| `valid_till` | `Date.toISOString()` |
| `description` | string |
| `terms_for_the_deal` | string |
| `category` | string |
| `max_redemptions` | `number.toString()` |
| `city` | string |
| `discount_percentage` | `toString()`, or `"0"` |
| `price` | only if not null/undefined (always present, since the default is 0) |
| `image` | the `File`, appended if truthy |

- **Success:** `form.reset()`, toast **"Deal created successfully"**, then `router.push("/dashboard/deals")`.
- **Error:** toast `error.response?.data?.error || "Failed to create deal"`, which is always **"Failed to create deal"** (see section 0).

---

### 4. Route `/dashboard/deals/edit` (EditDealForm)

- **Page:** `app/dashboard/deals/edit/page.tsx:1-3` → `components/Dashboard/Deals/EditDealsForm.tsx`. The file is "EditDealsForm"; the component is `EditDealForm`.
- **How the deal id is passed:** as a **query string `?id=<dealId>`**. It is read with `useSearchParams().get("id")` (38-40) and comes from `DealCard.tsx:81`.
- **Data load:** `useGetSingleDeal(dealId!)` → GET `/api/deals/single-deal/${id}`, key `["singleDeal", id]`.
- **Loading:** `<p>` **"Loading deal data..."** (122-123).
- **No error or not-found state.** If the deal is missing (404 `{message:"deal not found"}`) or the id is absent, `data.data` is undefined and the form keeps its defaults: `max_redemptions: 0`, `valid_till: new Date()` (45-53).
  - **If there is no `?id`**, `_id` is appended as `""`. `useCreateDeals` treats that as falsy and **POSTs to `/api/deals`**, which creates a new deal, provided an image is attached.
- **Prefill** (56-73): `form.reset({_id, title, description, terms_for_the_deal, valid_till: new Date(deal.valid_till), category, max_redemptions, city, image: deal.image (URL string), discount_percentage, price})`.
- **Schema:** the same `dealSchema` imported from DealForm (31, 44). Every rule and message from section 3 applies.
  - Because the calendar disables past days, an **already-expired deal cannot be given another past date**, but the existing past `valid_till` still passes zod.
- **Copy bugs, verbatim:** the heading is **"Create New Deal"** (138) and the button is **"Create Deal"** / **"Submitting..."** (409-411). All field labels and placeholders are identical to DealForm.

#### Payload (77-120): multipart FormData → **PATCH `/api/deals/edit/${_id}`**

- Same fields as create, plus **`_id`** (first field).
- `image` is appended **only when `typeof values.image === "object"`**, meaning a new File. An unchanged URL string is not sent.
- **Bug: `mutate` is called twice** (99-109 and 111-119), so **two PATCH requests are sent per submit**.
- Per TanStack Query v5's documented behaviour, per-call callbacks fire only for the latest `mutate` call. So the user most likely sees **"Deal updated successfully"** on success, or **"Failed to update deal"** on error, then `router.push("/dashboard/deals")`. This depends on library behaviour and is **UNVERIFIED** in a running app.
- The first call's copy ("Deal created successfully" / "Failed to create deal") would show only if that behaviour differs.
- With a new image, both PATCHes upload to S3 and delete the old image. The race leaves orphaned objects.
- `console.log("form errors", …)` is left in at line 125.

---

### 5. Route `/dashboard/deals/redeemtion/[id]` (RedemtionTable; the "redeemtion" spelling is the real path)

- **Page:** `app/dashboard/deals/redeemtion/[id]/page.tsx:1-3` → `components/Dashboard/Deals/RedemtionTable.tsx`.
- **The id is a path param:** `useParams().id` (19-20). Query: `useGetDealsRedemption(id)` → GET `/api/deals/redeem/single/${id}`, key `["deals-redemption", id]`.
- **Loading:** **"Loading redemptions..."** (37).
- **No data:** **"No data found."** Shown only if `data` is falsy (38).
- **Empty array:** a table with headers and no rows. There is no empty message.
- **Error:** a 401 or 500 returns a JSON object with no `data`, so **`data.data.map` throws** and the page crashes (59).
- **Button:** **"Verify Deal"** (ShieldCheck) → `/dashboard/deals/verify-deal?id=${params.id}` (42-46). This is the only path that passes the deal id to verify.
- **Columns** (51-55): **"Unique Key"**, **"User"**, **"Deal Title"**, **"Status"**, **"Redeemed At"**.
  - **Unique Key** renders `item.uniqueKey`. That field doesn't exist (the schema has `uniqueKeys[]`), so the **column is blank** for current documents.
  - **User** shows `item.user?.name` with `item.user?.email` underneath.
  - **Deal Title** shows `item.deal?.title`.
  - **Status** is a capitalised Badge with `item.status`. The color map (24-35) covers `pending` (yellow), `confirmed` (green) and `cancelled` (red). The real `verified` value falls through to gray. "confirmed" and "cancelled" never occur.
  - **Redeemed At** is `new Date(item.createdAt).toLocaleDateString()`. That is the **claim** date, not `verifiedAt`.
- One row per Redemption document. A paid multi-buy is one row with several keys.
- `console.log("Redemption Data:", data)` is left in (22).

---

### 6. Route `/dashboard/deals/verify-deal` (VerifyDealPage)

- **Page:** `app/dashboard/deals/verify-deal/page.tsx:1-3` → **`components/Deal/VerifyDeal.tsx`**. Note it lives outside `Dashboard/Deals`.
- **Deal id:** `?id=` query (`useSearchParams`, 14, 21). It is sent as `deal: params.get("id") || ""`.
- **Copy:**
  - Title **"Verify Customer Deal"**, subtitle **"Scan QR or enter the unique code"**.
  - Scanner tile **"Open QR Scanner"** (Camera icon). While scanning there is a **"Cancel Scan"** link.
  - Divider **"Or manual entry"**.
  - Input placeholder **"ENTER UNIQUE CODE"**.
  - Button **"Verify Code"** (ClipboardCheck icon, or a spinner while pending).
  - Pending overlay: **"Verifying Code..."**.
- **Scanner:** `@yudiel/react-qr-scanner` `<Scanner onScan={r => handleVerify(r[0].rawValue)} scanDelay={2000} allowMultiple={false}>`. Scanner errors are only logged to the console (44-51).
- **Case handling:**
  - Manual input is **uppercased as you type** (`e.target.value.toUpperCase()`, 82).
  - Scanned values are sent **as-is**.
  - Neither path trims whitespace.
  - The server does an exact, **case-sensitive** Mongo equality match.
- **Empty code:** toast **"Please enter or scan a code"** with no request (18).
- **Request:** POST `/api/deals/verify`, JSON `{ uniqueKey: string, deal: string }`.
- **Success:** toast **"Deal verified successfully!"**. This is client-side copy; the server message is the same string.
- **Error:** toast `error.message || "Verification failed"`. Because `Post` throws `Error(rawBodyText)`, the toast shows the **raw JSON**, for example `{"message":"Invalid code. No record found."}`.
- **No query invalidation** after verifying.
- **Entry from the main Deals page passes no `?id`.** The server compares `redemption.deal.toString() !== ""`, so any code it finds there gets 403 **"Unauthorized: This code does not belong to this deal."**

---

### 7. API endpoints

#### POST `/api/deals`: create (`app/api/deals/route.ts:10-71`)

- **Auth:** `getServerSession`. If missing: **401 `{ error: "Unauthorized" }`**.
- **No isblocked or category check.** Any logged-in account, including `category:"user"`, can create a deal.
- **Input:** `req.formData()` with fields `title, valid_till, description, terms_for_the_deal, category, max_redemptions, city, image (File), price, discount_percentage`.
- **400 `{ error: "Missing required fields or image" }`** if any of these is falsy: `title, valid_till, description, terms_for_the_deal, city, category, file, price, discount_percentage`.
  - The **image is required** here.
  - The string `"0"` counts as present, so price 0 is fine.
  - `max_redemptions` is **not** in this check. If it is missing, the Mongoose required-field error becomes a 500.
- **No server validation** of ranges, future dates, or file size and type.
- **Image upload:** `uploadToS3(buffer, file.name, file.type)`. The S3 key is `profile_${Date.now()}.${ext}` (`server/lib/function.ts:13-33`). The stored value is `image = uploadResult.Location`.
- Sets `user = session.user.id`. `max_redemptions` goes through `parseInt`.
- **201:** the **raw Deal document** (not wrapped in `{message, data}`):
  ```ts
  type CreateDealResponse = { _id: string; title: string; valid_till: string; category: string;
    discount_percentage: number; price: number; user: string; description: string;
    terms_for_the_deal: string; max_redemptions: number; current_redemptions: 0; city: string;
    image: string; createdAt: string; updatedAt: string; __v: number };
  ```
- **500 `{ error: error.message }`** for anything else, including Mongoose cast/validation and S3 failures.

#### GET `/api/deals`: the business's own deals (route.ts:73-108)

- **Auth:** `getServerSession`; **401 `{ error: "Unauthorized" }`**. No isblocked or category check.
- **No query params are read.**
- Query: `Deal.find({ user: session.user.id })`, populate `user` with `"-password -emailVerified -isblocked -updatedAt -verified -_id"` (a blacklist), sort `createdAt` descending, `.lean()`.
- Adds `verifiedRedemptions = Redemption.countDocuments({deal, status:"verified"})` to each deal.
- **200:**
  ```ts
  type GetMyDealsResponse = { message: ""; data: Array<IDealLean & {
    _id: string; createdAt: string; updatedAt: string; __v: number;
    user: Omit<UserDoc, "password"|"emailVerified"|"isblocked"|"updatedAt"|"verified"|"_id">;
    verifiedRedemptions: number }> };
  ```
  There is no pagination.
- **500 `{ error }`**.

#### PATCH `/api/deals/edit/[id]` (`app/api/deals/edit/[id]/route.ts:26-120`)

- **Auth:** `getServerSession`; **401 `{ error: "Unauthorized" }`**. No isblocked or category check.
- **Ownership:**
  - **404 `{ error: "Deal not found" }`**.
  - **403 `{ error: "You can only edit your own deals" }`** if `deal.user !== session.user.id`.
- **Parsing:**
  - FormData is read into `rawData`. String values starting with `{` or `[` are JSON-parsed. The string `"undefined"` becomes `undefined`.
  - Then `dealSchema.partial().parse(rawData)` (13-24, server-side schema):
  ```ts
  z.object({ title: z.string().min(2,"Title is too short"), valid_till: z.coerce.date(),
    description: z.string().min(10,"Description must be at least 10 characters"),
    terms_for_the_deal: z.string().min(1,"Terms are required"), category: z.string().optional(),
    city: z.string().optional(), max_redemptions: z.coerce.number().optional(),
    price: z.coerce.number().optional(), discount_percentage: z.coerce.number().optional(),
    image: z.any().optional() })   // .partial() → every field optional; unknown keys (_id) stripped
  ```
  - Zod failure: **400 `{ error: ZodIssue[] }`**. The value is an array of issue objects, not a string.
  - The server has **no** discount cap below 80 and **no** future-date check.
- **Image:**
  - If `image` is a non-empty `File`: `deleteFromS3(old)` (failures are swallowed), then upload the new file.
  - If `image` is a non-empty string: it is stored verbatim as the URL.
  - Otherwise the existing image is kept.
- Update: `findByIdAndUpdate($set, {new:true, runValidators:true})`.
- **200:** `{ message: "Deal updated successfully", data: DealDoc }`.
- **500:** `{ error: error.message }`.

#### POST `/api/deals/delete/[id]` (`app/api/deals/delete/[id]/route.ts:10-41`). Method is POST.

- **Auth:** `getServerSession`; **401 `{ error: "Unauthorized" }`**. No isblocked or category check.
- **404 `{ error: "Review not found" }`**. This is copy-paste text, but it is the exact string.
- **403 `{ error: "You are not authorized to delete this deal" }`**.
- **200 `{ message: "Review deleted successfully" }`**. Also copy-paste text.
- The request body is ignored.
- It does **not** delete the deal's Redemptions or its S3 image.
- **500 `{ error }`**.

#### GET `/api/deals/single-deal/[id]` (`app/api/deals/single-deal/[id]/route.ts:8-25`)

- **No auth** (public).
- `Deal.findById(id).populate("user", PUBLIC_ORGANIZER_FIELDS)`. The fields are `"_id name email business_name city location image category"` (`server/lib/publicUserFields.ts:55-56`).
- **200:** `{ message: "deal fetched successfully", data: Deal & { user: { _id, name, email, business_name, city, location, image, category } } }`.
- **404:** `{ message: "deal not found" }`. Note the key is `message`, not `error`.
- **500:** `{ error }`. A malformed ObjectId causes a CastError, which returns 500.

#### GET `/api/deals/get-all` (`app/api/deals/get-all/route.ts:9-81`). Public; not used by the dashboard.

- **No auth.**
- **Params:** `category, search, from, to, city`. Trailing `?` characters are stripped and values are trimmed.
  - `search`: case-insensitive regex on `title`.
  - `city`: case-insensitive exact match (anchored regex).
  - `from`/`to`: filter on `valid_till` (from 00:00 to 23:59:59.999).
  - `category`: exact match, unless it is `"all"`.
- Populates `PUBLIC_ORGANIZER_FIELDS`, sorted `createdAt` descending.
- **200:** `{ message: "", data: Deal[] }`.
- **500:** `{ error }`.

#### POST `/api/deals/verify` (`app/api/deals/verify/route.ts:8-78`)

- **Auth:** `getServerSession`; **401 `{ message: "Unauthorized" }`**. Note the key is `message` here. No isblocked or category check.
- **Body:** `{ uniqueKey, deal }`.
- **Responses, in order:**

| Status | Body (exact) | Condition |
|---|---|---|
| 400 | `{ message: "Code is required, deal is required" }` | **Both** `uniqueKey` and `deal` are missing (`&&`, line 19) |
| 404 | `{ message: "Invalid code. No record found." }` | `Redemption.findOne({ uniqueKey })` is null. **This is always the result for codes from the current redeem routes**, because the field is `uniqueKeys` |
| 403 | `{ message: "Unauthorized: This code belongs to another business." }` | `redemption.business !== session.user.id` |
| 403 | `{ message: "Unauthorized: This code does not belong to this deal." }` | `redemption.deal.toString() !== deal` |
| 400 | `{ message: "This code has already been verified." }` | `status === "verified"` |
| 200 | `{ success: true, message: "Deal verified successfully!", data: { customerName: redemption.userName /* not in schema → undefined, so omitted from the JSON */, verifiedAt: Date } }` | Sets `status="verified"` and `verifiedAt=now` on the **whole Redemption document** (every key in a multi-buy at once) |
| 500 | `{ error: error.message }` | |

- There is **no expiry check** (`valid_till`) on verify.
- `Deal.findByIdAndUpdate(redemption.deal)` (62) is a no-op: no update document is passed.
- Case sensitivity: exact equality, so the match is case-sensitive.

#### `/api/deals/redeem` (`app/api/deals/redeem/route.ts`). The dashboard uses **neither** method; both are customer-side.

**POST** (10-90), the free claim:
- **Auth:** `getServerSession`; **401 `{ message: "Unauthorized" }`**.
- **Reads only `dealId`** from the body. The user comes from the session.
- **Errors, in order:**
  - 404 `{error:"Deal not found"}`
  - 400 `{error:"This deal has expired"}`
  - 400 `{error:"Deal limit reached"}`
  - 400 `{error:"You already have a code for this", codes: string[]}` (one claim per user per deal)
  - 400 `{error:"Deal just sold out"}` (lost an atomic-increment race; note the Redemption is already created at that point)
  - 500 `{error}`
- Creates one key, increments `current_redemptions` by 1, and emails the codes (`sendEventMultipleTicketEmail`).
- **200:** `{ success: true, codes: string[] }`.
- **No `price > 0` check.** A paid deal could be claimed for free through this endpoint. That is what the code does; whether the UI allows it is **UNVERIFIED** beyond `SingleDealPage.tsx:124` branching on price.

**GET** (92-113):
- **Auth:** session; **401 `{ message: "Unauthorized" }`**.
- Returns `{ data: Redemption[] }` for `user = session.user.id` (the customer's own redemptions).

#### GET `/api/deals/redeem/single/[id]` (`app/api/deals/redeem/single/[id]/route.ts:8-35`). Used by the dashboard.

- **Auth:** session; **401 `{ message: "Unauthorized" }`**.
- **No ownership check:** any logged-in user can list any deal's redemptions, including customer name and email.
- Query: `Redemption.find({ deal: id }).populate("user","name email").populate("deal","title description")`.
- The `{ redeemed: false }` branch is unreachable, because `find` returns an array.
- **200:**
  ```ts
  type DealRedemptionsResponse = { data: Array<{ _id: string; deal: { _id: string; title: string; description: string };
    user: { _id: string; name: string; email: string }; business: string; uniqueKeys: string[];
    status: "pending" | "verified"; verifiedAt?: string; paymentIntentId?: string;
    createdAt: string; updatedAt: string; __v: number }> };
  ```
- **500 `{ error }`**.

#### POST `/api/deals/redeem/multiple` (`app/api/deals/redeem/multiple/route.ts:90-215`). Paid deals, customer-side.

- **Auth:** session; **401 `{ message: "Unauthorized" }`**.
- **Body read:** `{ dealId, quantity, paymentIntentId }`. The user comes from the session.
- **Errors, in order:**
  - 400 "Payment not verified" (PaymentIntent status is not `succeeded`)
  - 400 "Payment does not match this deal" (`metadata.dealId`)
  - **409** `{error:"This payment has already been used", codes}` (replay check)
  - 400 "Quantity mismatch - payment verification failed"
  - 400 "Deal not found"
  - 400 "Payment amount mismatch"
  - 400 "Not enough tickets left"
  - 400 "Tickets sold out during payment"
  - 500
- The expected amount is `round((unit*qty + unit*qty*0.025)*100)` cents, where `unit = price*(100-discount)/100`. That is a **2.5% fee**.
- Creates one Redemption with N keys of the form `-iofN`, status `"pending"`.
- **200:** `{ success: true, codes: string[] }`.
- **There is no expiry check here** (unlike `/redeem`).
- The PaymentIntent is created by a server action. The 04 doc names it `app/actions/stripe.tsx`; I did not open it, so its contents are **UNVERIFIED**.

---

### 8. Mobile docs (F:\whamobileapp\docs\mobile) compared with the code

Git history shows the deals routes were changed after the docs were written: commits `43e09ea` ("stop leaking password hashes/tokens and add missing auth on mutation routes") and `f20d955` ("deals/redeem takes user from session only, add PaymentIntent replay protection").

| Doc claim | Code reality |
|---|---|
| `04-api-reference.md:290`: redeem body `{dealId, userId, business, paymentIntentId?, quantity?}`, response `{success, uniqueKey, paymentIntentId?}` | The server reads only `dealId` (redeem/route.ts:13). The response is `{success:true, codes:string[]}` (83-86). Paid purchases go through `/redeem/multiple`. |
| `04:291` and `99-open-questions.md` Q13/Q14: unclear how multiple differs from quantity | **Answerable now.** `/redeem` is a free single claim with one per user. `/redeem/multiple` is the paid Stripe path: it checks the PaymentIntent, quantity, amount with a 2.5% fee, and replays (409). |
| `04:472`: get-all and single-deal populate the full user including the password hash | **Outdated.** Both now use `PUBLIC_ORGANIZER_FIELDS` (get-all:73, single-deal:14). |
| `04:477` and `04:657`: `GET /api/deals/redeem` is unauthenticated and returns everyone's redemptions | **Outdated.** It now requires a session and filters by the session user (redeem/route.ts:96-103). |
| `04:655-658`: redeem routes take `userId` from the body, and multiple allows PaymentIntent replay | **Outdated.** Both use the session id. `multiple` has metadata and replay checks (115-132). |
| `04:659`: verify queries a non-existent `uniqueKey` field | **Still true** (verify/route.ts:26). |
| `04:293`: "Get redemptions for one deal (business)" | There is **no business ownership check**; any session works. |
| `04:286`: GET /api/deals has no notes | It adds `verifiedRedemptions` and takes no params. |
| `04:287`: create/update via FormData | Correct. Missing details: the image is **required on create**, and edit is PATCH with ZodIssue[] errors. |
| `04:289`: delete is POST | Correct. Missing detail: the success and 404 copy say "Review…". |
| `04:101-106`: Deal interface with `deals_for: string` and `deal_code: string` as required | Neither is ever set by create or edit; both are optional in the schema. On GET /api/deals the populated `user` has `_id` excluded. |
| `06-features-and-business-logic.md:124-129`: redemption "generates a `uniqueKey`"; paid flow UNVERIFIED | It generates `uniqueKeys[]`. Paid means `price > 0` (SingleDealPage.tsx:124) and goes through Stripe and `/redeem/multiple`. |
| `03-screens.md:172-174`: `deal_code` or `uniqueKey` is "likely shown as QR" | Speculative. `deal_code` is unused. The verify scanner reads raw QR text. How codes are rendered on the customer's ticket is **UNVERIFIED** (not traced). |
| `03-screens.md:55`: lists the routes and components | Correct, except that `VerifyDealPage` lives in `components/Deal/VerifyDeal.tsx`, and edit takes `?id=` while redemption takes the path `[id]`. |
| `07-forms-and-validation.md` | **No deal form documented.** Section 3 above fills that gap. |
| `04:15` and `04:586`: deals routes are cookie-only | Correct, and it applies to **all** deals routes, including the business ones (GET/POST `/api/deals`, edit, delete, verify, redeem/single). The mobile business dashboard cannot use any of them with a bearer token today. |

### 9. UNVERIFIED items
- Whether any old Redemption documents have a singular `uniqueKey` field. If they do, verify and the Unique Key column would work for those documents only.
- The exact toasts after the duplicate PATCH (based on documented TanStack v5 behaviour, not observed).
- How the customer-facing QR or code is rendered (not traced). The `app/actions/stripe.tsx` PaymentIntent server action was not opened.
- Whether Next 16 requires a Suspense boundary around `useSearchParams` in the edit and verify pages (build-time behaviour, not checked).

---

## Area 4 — Services, Inventory, Employees, Categories (source-verified report)

The repo is `F:\WHA` (Next 16.1.6, next-auth 4.24, mongoose 9.6.1 installed, zod 4.4.3 installed, TanStack Query 5.90, RHF 7.71; see `F:\WHA\package.json:20,44-46,56,63`). Every path below is relative to `F:\WHA` unless it is absolute. Anything not read directly is marked **UNVERIFIED** or **DERIVED** (my inference from the code, not checked at runtime).

---

### 0. Cross-cutting facts (they apply to every endpoint below)

**Auth.** Every route in scope uses `getServerSession(authOptions)`, which reads only the NextAuth **cookie**. None of them use `getAuthUser`. The list of `getAuthUser` users is in `server/lib/getAuthUser.ts` and doesn't include `app/api/services|employees|categories`. A mobile `Authorization: Bearer` token therefore gets **401 `{ error: "Unauthorized" }`** on every protected route here. `getAuthUserDetailed` checks Bearer first (`server/lib/getAuthUser.ts:47-85`), but these routes don't call it.

**`business_id`** is always `session.user.id`, the User `_id` string.

**`isblocked`** is checked by **none** of these routes. The only enforcement is client-side: `DashboardLayout.tsx:530` redirects to `/blocked` when `session.user.isblocked`. The JWT callback re-reads `isblocked` from the DB on token refresh (`app/api/auth/[...nextauth]/route.ts:155-174`), but no route reads it.

**Category/role checks.**
- No route in scope checks `session.user.category === "business"`. Any logged-in account, including a `"user"` account, can create services, employees and categories under its own id.
- The only role logic is the super-admin bypass on `DELETE /api/services/single/[id]` (`route.ts:201,211`).
- On the client, `/dashboard/services` and `/dashboard/employees` are **not** in `PROTECTED_PATHS`. `/dashboard/inventory` is (`components/Dashboard/DashboardLayout.tsx:22-29,531-533`).

**Response envelope.** These routes do **not** return `ApiResponseType` (`{status,message,error,data}`, `services/apitypes.ts:1-20`). They return:
```ts
type Ok<T>   = { success: true; data: T };                // + message on some deletes
type Fail    = { success: false; error: string };
type Unauth  = { error: "Unauthorized" };                 // 401 — note: NO `success` key
```

**Client fetch helpers** (`lib/action.ts`):
- `Get` never checks `res.ok` and returns the JSON body as-is (`:24-44`). An auth failure therefore resolves to `{error:"Unauthorized"}`, `data.data` is undefined, and the UI shows **empty states, not errors**.
- `Post`/`PATCH` throw `new Error(rawBodyText)` on non-2xx (`:67-70,94-97`). `error.message` is the raw JSON string.
- `Delete` never checks `res.ok` (`:114-135`).
- For a `FormData` body, `Post` sends **no headers at all**, so no Authorization (`:59-65`).

**`useFetcher`** (`lib/generic.service.tsx:8-37`): all hooks here pass `queryKey: null`, so **no** `page`/`per_page` is appended. `parseQueryParam` only iterates the `queryKey` array (`lib/hook.query-parse.ts:54-68`). This contradicts docs `04-api-reference.md:419-426`.

**React Query config.** `new QueryClient()` uses library defaults (`lib/ReactQueryContext.tsx:4`): staleTime 0 and 3 retries. The defaults themselves come from the library, not repo code.

**Rate limit.** `proxy.ts:14-19,62-71` allows 20 requests per 10 s per IP (or per user when a valid mobile Bearer is present). Over the limit it returns 429 `{ success:false, error:"Too many requests. Please slow down." }`.

**business_type (`employee_based | item_based`, `server/models/Auth.model.ts:69-73`).** Nothing in Services, Employee, Inventory or Categories branches on it. A grep for `business_type` finds no hits under `components/Dashboard/{Services,Employee,Inventory}` or in these API routes. It is set in Settings (`components/Dashboard/Settings/BusinessType.tsx:103-108`) and only shown as a badge on the public page ("Item Booking"/"Service Booking", `components/Business/SingleBusinessPage/SingleBusinessPage.tsx:1362-1378`). The per-service field that matters is `Service.service_type` (`employee_based | resource_based | group_session`, `server/models/Service.model.ts:50-54`).

**Navigation.**
- Sidebar "Catalog" goes to `/dashboard/services`. A second "Catalog" (Cog icon) goes to `/dashboard/resources`.
- "Team" has two items: "Team members" → `/dashboard/employees` and "Scheduled shifts" → `/dashboard/employees/schedule-shift`.
- The "Inventory" nav section is **commented out**, so `/dashboard/inventory` isn't linked anywhere (`components/ResuableComponents/Sidebar.tsx:53-88`).

---

### 1. Open question #2: `/api/inventory` (RESOLVED)

1. **It doesn't exist.**
   - There is no `app/api/inventory` directory: `find` reports "No such file or directory".
   - A repo-wide grep for "inventory" finds `/api/inventory` only in `services/inventory.service.ts:15,27,37,50` and in a commented-out block (`components/Dashboard/Inventory/Service.tsx:135-136`).
   - `proxy.ts` and `next.config.ts` contain no rewrites.
2. **What `/dashboard/inventory` calls.** `app/dashboard/inventory/page.tsx:1-3` renders `components/Dashboard/Inventory/Service.tsx` (`CategorizedServices`), which calls:
   - `GET /api/inventory` via `useGetActivity` (key `"category"`, i.e. `["category"]`; `inventory.service.ts:11-17`).
   - `POST /api/inventory/{categoryId}` via `useCreateService` (`:41-54`).
   - `CreateCategoryDialog.tsx` calls `POST /api/inventory` via `useCreateCategory` (`inventory.service.ts:18-31`; note this is a *different* `useCreateCategory` from `category.service.ts`).
   - `useGetServicesByCategory` (`GET /api/inventory/{id}`) is unused.
3. **Runtime result (DERIVED).**
   - The GET hits Next's 404 HTML. `res.json()` throws, React Query retries 3 times with the `Loader2` spinner showing (`Service.tsx:154-159`), and then the screen shows the empty state "No categories added yet. Start by creating a category." (`:179-184`).
   - Create-category gets a 404, `Post` throws, and the toast reads "Failed to create category" (`CreateCategoryDialog.tsx:76-80`).
   - Add-service toast: `error.message`, which would be the 404 page's HTML (`Service.tsx:129-131`).
4. **"Inventory" and "Services" are different concepts, and Inventory is a dead legacy prototype.**
   - Its data model is free-text `assigned_to`, `price` plus `pricing_category: "hour"|"day"|"month"`, and `day_from`/`day_to`/`time_from`/`time_to` (`Service.tsx:64-75`).
   - Its Mongoose model is fully commented out (`server/models/Service.schema.ts:1-32`).
   - The live catalog is `/dashboard/services`, backed by `Service.model.ts` plus `Category.model.ts`.
   - "Inventory" survives only as a label: service_type `resource_based` is shown as **"Resources (Inventory)"**, "eg: Kayak, Tennis court" (`ServiceForm.tsx:79-85`). Resource capacity is scheduled at `/dashboard/resources` (`/api/resources/*`, out of scope).
   - Business-level `item_based` maps to nothing in these screens.
   - **Mobile recommendation:** don't build `/dashboard/inventory`.

---

### 2. Route: `/dashboard/services` (Service menu)

**Files.** `app/dashboard/services/page.tsx:1-3` renders `components/Dashboard/Services/ServicesTable.tsx` (default export at `:426`).

**Queries.**
- `GET /api/services`: key `["services"]` (`services/services.service.ts:6-12`).
- `GET /api/categories`: key `["categories"]` (`services/category.service.ts:15-21`).

**Layout and copy.**
- Header: "Service menu" with "View and manage the services offered by your business. Learn more" (`:546-554`).
- Search placeholder: "Search service name". It filters on `name` **or** the `category` string (`:454-468,574`).
- Categories:
  - Desktop sidebar: "Categories", "All categories" (count = all services), one row per category with a count, and "+ Add category" (`:642-709`).
  - Mobile chip row: "All", one chip per category with a count, and "+ New" (`:580-637`).
- Grouping (`:470-494`):
  - Services whose `category_id` is missing or points to a deleted category go into an **"Uncategorised"** group shown first (color `#94a3b8`).
  - Groups with 0 services are hidden, unless that category is selected.
- Row (`:756-805`):
  - Left color bar uses the category color hex.
  - **`name`**.
  - Duration plus buffer: `fmtDuration(base_duration)`, then `· +{fmtDuration(buffer_time)} buffer` when `buffer_time > 0`. Format is "X min", "X hr", or "X hr, Y min" (`:38-44`).
  - Price: `"Free"`, `"Custom"`, or **`NPR ${Number(base_price).toFixed(0)}`** (`:781-785`).
  - `is_active` Switch: `checked={svc.is_active ?? true}`.
  - 3-dot menu: Edit / Delete.

**Category colors.** Stored as **labels**, not hex (`CATEGORY_COLORS`, `Form/schema.ts:41-51`): Blue #3b82f6, Teal #14b8a6, Purple #8b5cf6, Pink #ec4899, Green #22c55e, Orange #f97316, Red #ef4444, Yellow #eab308, Indigo #6366f1. An unknown label falls back to #14b8a6 (`ServicesTable.tsx:46-48`).

**Actions.**
- **Add** dropdown: "Single service" → `/dashboard/services/add`, or "Category" → Add category dialog (`:325-379`).
- **Toggle active:** `POST /api/services/single/{id}` with body `{ is_active: boolean }` (`services.service.ts:35-48`).
  - Success when `res.success`: toast "Service activated" or "Service deactivated", then invalidate `["services"]`.
  - Otherwise toast `res.error ?? "Failed to update service"`; on throw, "Failed to update service" (`ServicesTable.tsx:522-537`).
- **Delete service:**
  - Confirm modal "Delete service?" / "This action cannot be undone." with buttons Cancel / Delete (`:820-849`).
  - Calls `DELETE /api/services/single/{id}`.
  - Toasts: "Service deleted" (then invalidate `["services"]`), or `res.error ?? "Failed to delete"`, or "Failed to delete service" (`:496-510`).
- **Delete category** (group "Actions" dropdown):
  - Only offered when the group's service count is 0. Otherwise the menu shows "Remove all services first" (`:303-316`).
  - The count is computed after search filtering (`:747`), so a search can make a non-empty category deletable (DERIVED edge case).
  - Confirm modal "Delete category?" / "This will permanently delete the category. This action cannot be undone." (`:851-884`).
  - Calls `DELETE /api/categories/{id}`, which invalidates `["categories"]` on success (`category.service.ts:45-51`).
  - Toasts: "Category deleted", or `res.error ?? "Failed to delete category"`.
- **Add category dialog** (`:62-195`): see §10 for the schema.
  - Fields: "Category name" (placeholder "e.g. Hair Services"), "Appointment color" select (default Blue), "Description" with a 0/255 counter.
  - Buttons: Cancel / "Add" ("Adding…" while pending).
  - Toasts: "Category added", or `res?.error ?? "Failed to create category"`.

**States.**
- Loading: `ServicesTableSkeleton` (2 groups × 3 rows) plus sidebar skeletons (`:383-422,646-651`).
- Empty: `No services matching "{search}"` or "No services yet.", with an "Add service" button (`:716-728`).
- No error state: errors render as empty (see §0).

**Assign employees to service.** There is **no UI here**. Assignment happens inside the service form ("Team members" section) or the employee form ("Services" tab). `components/Dashboard/Employee/Form/AssignEmployee.tsx` (which uses `/api/services/assign-employee`) is **imported nowhere** (grep confirms), so it's dead code.

---

### 3. Routes: `/dashboard/services/add` and `/dashboard/services/edit/[id]`

**Files.**
- `app/dashboard/services/add/page.tsx:1-3` renders the named `ServiceForm` (`components/Dashboard/Services/Form/ServiceForm.tsx:297`).
- `app/dashboard/services/edit/[id]/page.tsx:1-23` calls `useGetSingleService(id)` (key `["singleservice", id]`, `GET /api/services/single/{id}`).
  - While loading it shows a spinner (`loading loading-spinner`).
  - It then renders `<ServiceForm initialData={data?.data} />`.
  - **There's no error or not-found handling.** On 403/404, `initialData` is undefined, the "New service" form renders, and saving **creates a new service** (DERIVED from `:20`).

**Form queries.** `["categories"]` and `["employees"]` (`GET /api/employees`) (`ServiceForm.tsx:301-305`).

**Top bar.**
- "Close" → `/dashboard/services`.
- "Save" with a spinner while pending. It's a **single save button for the whole form** (`:568-583`).
- Title: "New service" or "Edit service" (`:587-589`).

**Section nav** (`:456-483`). Error sections show a red dot (`:427-449`). Order:
- "Basic details"
- "Service type" (sub-label shows the chosen type)
- Then by type:
  - `employee_based`: "Team members" (badge = count)
  - `resource_based`: "Availability"
  - `group_session`: "Schedule"
- "Settings"

**Sections and fields.**
- **Basic details** (`:645-888`):
  - "Service name \*" with a 0/255 counter; placeholder "Add a service name, e.g. Men's Haircut".
  - "Menu category \*" custom dropdown:
    - Empty list text: "No categories yet".
    - Footer: "+ Add category", which opens an inline Add-category dialog (name + color only, no description) (`:177-293`).
    - Helper: "The category displayed to clients online".
  - "Description (Optional)" with a 0/1000 counter; placeholder "Add a short description"; `maxLength` 1000. **The zod schema has no max.**
  - "Pricing and duration":
    - "Price type \*": Fixed / From / Free / Custom.
    - "Price": **only shown when Fixed or From**, with a **"$"** prefix, `parseFloat || 0`.
    - "Duration \*": `DURATION_OPTIONS` 5…480 min (`schema.ts:3-24`).
  - When no type is chosen yet: "Select a booking type in the sidebar to continue".
- **Service type** (`:891-971`): "What does the customer book?" with three cards:
  - Team Member (Appointment), "eg: Barber shop, Massage"
  - Resources (Inventory), "eg: Kayak, Tennis court"
  - Group Session (Class), "eg: Zumba, Yoga, Education"
  - Selecting a card jumps to the matching section.
- **Team members** (`employee_based`, `:974-1050`): "Choose which team members perform this service".
  - "All team members" toggle, then a checkbox per employee (avatar or initials, `full_name`).
  - Empty: "No team members found."
- **Availability** (`resource_based`, `:1053-1277`):
  - Radio "Always available" ("Can be booked during opening hours") vs "Custom hours" ("Set specific hours for each day").
  - Custom shows "Weekly schedule": 7 rows with a Switch and start/end selects using 30-minute `TIME_OPTIONS` labelled "h:mm AM/PM" with values "HH:MM" (`schema.ts:65-77`). Closed days show "Closed".
  - "Quantity" → "Quantity available" (`max_concurrent_bookings`, `parseInt || 1`), helper "eg: 10 kayaks, 4 tennis courts".
- **Schedule** (`group_session`, `:1280-1480`): "Class schedule".
  - Per-day Switch. Off days show "Off". Empty day: "No time slots yet. Add one below."
  - Each slot: start select, "to", end select, "Cap:" number input, remove (X).
  - "+ Add Available Time" adds slot `{09:00, 10:00, capacity 10}`.
  - "Waitlist" → "Enable waitlist" switch.
- **Settings** (`:1483-1696`):
  - "Booking rules" (`BUFFER_OPTIONS`, `NOTICE_OPTIONS`, `ADVANCE_OPTIONS` are at `schema.ts:79-106`):
    - Buffer time: No buffer, 5, 10, 15, 30, 45, 60 min.
    - Minimum notice period: No minimum, or 1/2/4/8/24/48 hours.
    - Advance booking limit: 7/14/21/30/60/90 days.
  - "Cancellation policy": anytime / 2h / 5h / 10h / 24h / non_cancellable, labelled "Can cancel anytime", "2 hours before", … "Non-cancellable" (`schema.ts:108-115`).
  - "Cancellation refund": Refundable / Non-refundable, hidden when `non_cancellable`.

**Fields never rendered** (defaults only, round-tripped on edit): `require_employee_selection`, `allow_multiple_bookings`, `max_bookings_per_slot`, `is_one_time_booking`, `is_active` (grep shows them only at `ServiceForm.tsx:335-380`).

**No image upload** in the service form (only `next/image` for employee avatars).

**Submit** (`:546-563`):
- Payload is `{ ...ServiceFormValues (zod-parsed), category: <selected category name> ?? "" }`, sent to `POST /api/services`, or to `POST /api/services/single/{_id}` when `_id` is present (`services.service.ts:24-33`).
- `_id` stays in the edit body.
- When `res.success`: toast "Service created" or "Service updated", invalidate `["services"]`, then `router.push("/dashboard/services")`. Otherwise toast `res.error ?? "Failed to save service"`.
- On throw: `toast.error(err?.message ?? "Failed to save service")`. For a 400 duplicate this shows the **raw JSON string** (DERIVED from `lib/action.ts:67-70`).
- `["singleservice", id]` is **not invalidated**. Re-opening edit within the cache window seeds the form with stale cached data, because `useForm` defaultValues are read once (DERIVED).

**Edit defaults** (`:324-366`):
- `assigned_employees` is mapped from populated objects to `_id`s.
- `availability_type` is forced to `"specific"` when `service_type === "group_session"`.
- Empty schedules fall back to `defaultSchedule()` (Mon–Fri available 09:00–17:00) or `defaultGroupSchedule()` (all off, no slots) (`schema.ts:117-132`).

**DERIVED bug: new group sessions.** `availability_type` defaults to `"always"` and is never set when picking `group_session` (`ServiceForm.tsx:908-916,381`). `available-slots` only uses `group_schedule` when `availability_type === "specific"` (`app/api/bookings/available-slots/route.ts:385-424`). Otherwise it uses business hours plus `max_bookings_per_slot` (`:425-430`). So a newly created group session ignores its class schedule until it is edited and saved again.

---

### 4. Route: `/dashboard/inventory`

See §1.

**Copy.**
- Header "Service Management" / "Organize your offerings by category", button "Add Category".
- Per category: "Add Service" button and table columns Service Name / Assigned To / Price / Availability / Actions.
  - Empty row: "No services registered in this category."
  - Price cell: `${price} / {pricing_category}`.
- Service dialog: "Add New Service" or "Update Service", submit "Add Service to Category" or "Update Service Information".
- Toasts: "Service added" or "Service updated", or `error.message || "Submission failed"`.
- Category dialog: "Create New Category", "Category Name" (placeholder "e.g. Home Cleaning"), button "Create Category" / "Creating..."; toasts "Category created successfully" or "Failed to create category".

**Schemas.**
- Service schema `Service.tsx:64-75`: `service_name min(2,"Required")`, `assigned_to min(2,"Required")`, `price number min(0)`, `pricing_category enum hour|day|month`, plus day/time strings.
- Category schema `CreateCategoryDialog.tsx:28-30`: `name min(2,"Category name is too short")`.

All non-functional (no backend).

---

### 5. Route: `/dashboard/employees` (Team members)

**Files.** `app/dashboard/employees/page.tsx` renders `components/Dashboard/Employee/EmployeeTable.tsx` (`EmployeeTable`, `:630`).

**Query.** `GET /api/employees`, key `["employees"]` (`employee.service.ts:6-12`).

**Header.** "Team members" with a total-count badge. "Options" (desktop only) exports **Excel (.csv)** (`team-members.csv`) or **PDF** (`team-members.pdf`, title "Team Members"). Both include columns Name, Email, Phone, Job Title, Status (Active/Archived) (`:305-397`). The "Add" button links to `/dashboard/employees/add`.

**Search.** Placeholder "Search team members"; matches `full_name`, `email`, `phone_number` (`:644-654`).

**Filters panel** ("All filters", `:464-626`):
- Locations: static "No locations configured."
- Type: Bookable / Non-bookable. **Not applied to the list**; it only feeds the badge count.
- Status: "All team members" / **"Active" (default)** / "Archived". Active means `is_active !== false`; Archived means `is_active === false` (`:655-658`).
- `is_active` is the "Allow calendar bookings" checkbox in the form.

**Sort** (desktop): 11 options (`:41-53`), but only these are implemented:
- Name A-Z / Z-A.
- "Started at" oldest/newest, which actually sorts by **`created_at`**.
- "Custom order" is API order (`created_at` desc).
- The rest do nothing (`:659-672`).

**Rows.**
- Desktop: checkbox (selection does nothing), avatar (`employee_photo`, or initials on `calendar_color`), `full_name`, `job_title`, `email`, `phone_number`, and an "Actions" dropdown (`:815-852`).
- Mobile: avatar, name, email, and a ⋮ button that opens a bottom sheet (`:880-906`).

**Actions.**
- Desktop menu: Edit → `/dashboard/employees/edit/{id}`; "View calendar", "View scheduled shifts", "Add time off" (all **no-ops**); Delete.
- Delete AlertDialog: "Are you sure to delete this employee?" / "This action cannot be undone. Are you sure you want to delete", buttons Cancel / Delete. It calls `DELETE /api/employees/{id}`.
  - The success toast "Employee deleted successfully" fires **even when the server returns 404/401**, because `Delete` never throws and `onSuccess` doesn't check `success`. It then invalidates `["employees"]`.
  - Error toast: `error?.message || "Failed to delete employees"` (`:212-225,237-257`).
- **Mobile bottom sheet:** only "Edit" works. "Delete" just closes the sheet (`:154-166`), so **delete isn't possible on the mobile web layout**.

**States.**
- Loading: 5 skeleton rows.
- Empty desktop: `No team members matching "{search}"` or "No team members found."
- Empty mobile: `No results for "{search}"` or "No team members found." (`:808-813,875-878`).

---

### 6. Routes: `/dashboard/employees/add` and `/dashboard/employees/edit/[id]`

**Files.**
- `add/page.tsx` renders `EmployeeForm` (`components/Dashboard/Employee/Form/EmployeeForm.tsx:372`).
- `edit/[id]/page.tsx:7-31` calls `useGetSingleEmployee(id)` (key `["employee", id]`, `GET /api/employees/{id}`).
  - Loading: spinner plus "Loading team member…".
  - Not found when `!data?.data`: "Team member not found."
- Form query: `["services"]`.

**Top bar.** "Add team member" or "Edit team member". Buttons: "Close" (`router.back()`) and "Add" or "Save" with a spinner (`:600-620`).

**Tabs.**
- Desktop sidebar: Personal → Profile, Addresses, Emergency contacts; Workspace → Services (count = selected, or total when none), Settings.
- Mobile pills: also show **Locations**.
- On leaving the Profile tab, `form.trigger(PROFILE_FIELDS)` runs (`:500-529`). Profile shows a red dot when `full_name`, `email`, `birth_year`, `employment_start_year` or `employment_end_year` has an error.
  - The red-dot check omits `phone_number` (`:516-522`).

**Profile tab** (`:699-1053`):
- **Avatar upload:** pencil button opens a hidden `<input type=file accept="image/*">`, which calls `setValue("employee_photo", File)` and previews via `URL.createObjectURL`. No client-side size or type limit beyond `accept`.
- "Full Name \*".
- "Email \*".
- "Phone number \*" with a static **"+61"** prefix (not sent). Placeholder "4xx xxx xxx".
- "Additional phone number" (also "+61").
- "Birth year": number, placeholder "e.g. 1995".
- "Calendar color": 17 swatches (`:40-58`), default `#4DD0E1`.
- "Job title", helper "Visible to clients online".
- "Work details":
  - "Start date" and "End date": `DatePickerField` with placeholder "Day and month" (`DatePickerField.tsx:45-115`).
  - "Start year" / "End year": numbers.
- "Employment type": "Select an option", Full-time, Part-time, Casual, Contractor.
- "Team member ID", helper "An identifier used for external systems like payroll".
- "Notes" (`bio`): 0/1000 counter, `maxLength` 1000, placeholder "Add a private note only viewable in the team member list".
- `last_name`, `country` and `birthday` exist in the schema and API but have **no inputs**.

**Addresses tab:** list with "Remove" and a "+ Add an address" dialog ("Address name", "Address"). Add is disabled until the name is non-empty (`:159-243`).

**Emergency contacts tab:** "Add emergency contact" dialog with "Full name \*" (placeholder "e.g. Jane Doe"), "Relationship" (placeholder "e.g. Spouse, Parent, Sibling"), "Phone number" (placeholder "e.g. +61 4xx xxx xxx") (`:247-350`).

**Services tab:** "Choose the services this team member provides".
- Search box "Search services".
- "All services" toggle, then services grouped by the `category` **string** ("Other" when empty) with group checkboxes.
- Each service shows duration and **"NPR {base_price}"**.
- Empty: "No services found." (`:1156-1249`).

**Locations tab:** "No locations configured yet." **Settings tab:** "Appointment settings", checkbox "Allow calendar bookings", which drives `is_active` (`:1269-1298`).

**Submit payload** (`multipart/form-data`, `:534-593`):
```
_id?                       (edit only; server ignores it)
full_name
email                      (only if truthy)
phone_number, additional_phone_number, bio, job_title, employment_type, employee_id  (always, "" when empty)
birth_year                 (if set)
employment_start_date      "DD/MM"  (only if a date was picked)
employment_start_year      (if set)
employment_end_date        "DD/MM"  (only if picked)
employment_end_year        (if set)
calendar_color             e.g. "#4DD0E1"
is_active                  "true" | "false"
addresses                  JSON [{name,address}]
emergency_contacts         JSON [{name,relation,phone}]
availability_schedule      JSON (zod-parsed form value)
service_overrides          JSON [{service_id}]
employee_photo             File (only if a new file was picked)
```
- URL: `POST /api/employees`, or `POST /api/employees/{_id}` when `_id` is present (`employee.service.ts:24-35`).
- Success: no toast; just `router.push("/dashboard/employees")`.
- No query invalidation. The `["employee", id]` cache gets stale (DERIVED).
- Error handling:
  - `JSON.parse(err.message)`. If `error.error` includes `"duplicate key error"`, toast "An employee already exists with this email"; otherwise toast `err.message` (raw JSON) || "Failed to save employee".
  - A non-JSON error message makes `JSON.parse` throw inside `onError` (DERIVED).
  - **The Employee model has no unique index on email** (`Employee.model.ts:9`), so the duplicate branch is probably unreachable. Whether a legacy DB index exists is UNVERIFIED.
- Clearing a date on edit just omits the field, so the server keeps the old value (`has()` logic, `app/api/employees/[id]/route.ts:88-95`).

**DERIVED data-loss bugs in `availability_schedule`:**
- **Create:** the default is `{day_of_week, is_working:true, shift_start:"09:00", shift_end:"17:00"}` for all 7 days (`EmployeeForm.tsx:487-492`). The model only has `shifts:[{start,end}]` (`Employee.model.ts:71-93`), so strict mode drops `shift_*`. New employees end up "working" every day with **zero shifts**.
- **Edit:** zod's `availabilitySchema` (`schema.ts:13-24`) has no `shifts` key. z.object strips unknown keys, so the submitted schedule has no `shifts`, and **every save from the employee form wipes all weekly shifts** set in Scheduled shifts. Recommend the mobile app never sends `availability_schedule` from the profile form.

---

### 7. Route: `/dashboard/employees/schedule-shift` (Scheduled shifts)

**Files.** `app/dashboard/employees/schedule-shift/page.tsx` renders `components/Dashboard/Employee/ScheduleShift.tsx` (default, `:1522`).

**Queries.**
- `["employees"]`: all employees, **including inactive**.
- `GET /api/employees/shift-overrides?week_start=YYYY-MM-DD&week_end=YYYY-MM-DD`: key `["shiftOverrides", ws, we]` (`employee.service.ts:100-107`; `ScheduleShift.tsx:1543-1557`).
- `GET /api/employees/time-off?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`: key `["weekTimeOffs", ws, we]`.
- `week_end` is the Sunday date. On the server, `new Date("YYYY-MM-DD")` is UTC midnight, so time-off starting later on Sunday isn't fetched (DERIVED edge case).

**There is no loading state.** "No team members found." shows while loading (`:1828-1831`).

**Effective day computation** (`getEffectiveDayData`, `:222-302`):
1. If a shift override exists for `(employee_id, date)`, use it: working = `!is_day_off && shifts.length>0`.
2. Otherwise use the weekly `availability_schedule[day]`, gated by `repeating_schedule_config`. A date before `start_date` or after `end_date` (when `ends_type === "On a specific date"`) shows "Not working". Dates are parsed from the "Mon D, YYYY" format.
   - `schedule_type` (Every week / Every 2 weeks / Custom) and `end_occurrences` are **stored but not applied**.
3. The first overlapping time-off **clips** the shifts (`clipShiftsForTimeOff`) and shows an amber "Time off {HH:MM} – {HH:MM}" plus the type.
4. Days outside the employment start/end range (DD/MM plus year) and past days are locked or non-interactive.

**UI.**
- Header "Scheduled shifts". "Options" button does nothing.
- "Add" dropdown: "Time off"; "New team member" (→ `/employees/add`); "Business closed period" (no-op).
- Week navigation: "This week" plus ‹ "Mon D – Mon D, YYYY" ›.
- Desktop: grid of employees × 7 days with per-column and per-employee totals ("X hr Y min").
- Mobile: day tabs, then a list of employee cards.
- Footer info: "The team roster shows your availability for bookings and is not linked to your business standard opening hours. To set your standard opening hours, click here." (→ `/dashboard/settings`).

**Per-employee menu:** "Assign repeating shift", "View team member" (→ `/dashboard/employees`), "Edit team member", "Delete all shifts".

**Per-cell menu** (desktop context menu or mobile sheet): "Edit this day", "Set repeating shifts", "Add time off", "Delete this shift".

**Actions and payloads.**

| Action | Request | On success | Error handling |
|---|---|---|---|
| Edit this day (dialog `{FirstName}'s shift {Ddd, Mon D}`, "Add shift", "Total: …", Save; trash icon = save `[]`) | `POST /api/employees/shift-overrides` `{ employee_id, date:"YYYY-MM-DD", shifts:[{start,end}], is_day_off: shifts.length===0 }` (`:1559-1574`) | invalidate `["shiftOverrides"]`, close | **none** (silent) |
| Delete this shift | same POST with `{ shifts: [], is_day_off: true }` (`:1629-1642`). It does **not** call DELETE. | invalidate `["shiftOverrides"]` | none |
| Set repeating shifts (full-screen panel "Set {First}'s repeating shifts") | `PATCH /api/employees/{id}/schedule` `{ availability_schedule:[{day_of_week:"monday"…, is_working, shifts: enabled? slots : []}] ×7, repeating_schedule_config:{schedule_type, start_date:"Mon D, YYYY", ends_type, end_date?, end_occurrences?} }` (`:1201-1210,1576-1598`; `employee.service.ts:45-61`) | invalidate `["employees"]`, close | none |
| Delete all shifts (confirm "Delete all shifts": "This will clear the entire weekly repeating schedule for {name}. Any day-specific overrides will remain. This action cannot be undone.", button "Delete shifts") | same PATCH, all days `{is_working:false, shifts:[]}`, **no config** | invalidate `["employees"]` | none |
| Add time off (dialog "Add time off") | **one** `POST /api/employees/time-off` **per date**, run sequentially: `{ employee_id, type, start_time: ISO, end_time: ISO, description, approved }` (`:1061-1072,1600-1606`) | invalidate `["weekTimeOffs"]`, close | none. A throw rejects `handleSaveTimeOff`, so the dialog stays open with no toast. |

**Weekly editor rules** (client-only, no zod; `:1176-1199` and `EditDayDialog :738-764`):
- 30-minute options from "00:00" to "23:30". Max end is 23:30.
- Start options must be ≥ the previous slot's end and < this slot's end. End options must be > start.
- Changing a start so that end ≤ start bumps end to the next option. Changing an end so that end ≤ start pulls start back. If the next slot now overlaps, its start moves to this end.
- Add slot: `{start: last.end, end: +1h}`. You can't remove the last remaining slot.
- Defaults: 09:00–17:00 for days that don't have shifts.
- Schedule types: "Every week", "Every 2 weeks", "Custom". Ends: "Never", "On a specific date" (end-date options exclude the start date), "After occurrences" (1–999).
- Start/end date options: next 365 days.

**Time-off dialog** (`:879-1086`):
- Team member select; Type: "Annual leave", "Sick leave", "Personal leave", "Unpaid leave", "Other".
- "Date" options are the next 60 days only. "+ Add another date" adds "Additional date N" rows.
- "Start time" / "End time" use the same 48 options with **no start<end validation** client-side. The server returns 400 when start ≥ end.
- Description: 0/100 chars, truncated. "Approved" checkbox.
- "Time off total: {X} [× N days]". Note: "Online bookings cannot be placed during time off."
- `combineDatetime` uses `new Date("Mon D, YYYY")`, a non-ISO parse. That may not parse identically on Hermes (RN). **Mobile should build ISO dates directly.**

**Unused hooks and endpoints** (grep confirms no callers):
- `useDeleteTimeOff` (`DELETE /time-off/[id]`)
- `useGetEmployeeTimeOff`
- `useDeleteShiftOverride` (`DELETE /shift-overrides/[id]`)
- `useUpdateCategory` (PATCH category), so **the web has no category edit UI**
- `useGetUserService`
- `useAssignEmployees`

**The web has no way to delete time-off.**

---

### 8. Validation schemas (exact text)

**Service form**, `components/Dashboard/Services/Form/schema.ts:134-219`:
```ts
availabilityDaySchema = { day_of_week: string, is_available: boolean, start_time: string, end_time: string }
groupSlotSchema       = { start_time: string, end_time: string, capacity: number.min(1, "Capacity must be at least 1") }
groupDaySchema        = { day_of_week: string, is_active: boolean, slots: groupSlotSchema[] }
serviceSchema = z.object({
  _id?: string,
  name: z.string().min(2, "Service name must be at least 2 characters").max(255),
  description?: string,
  category_id: z.string().min(1, "Menu category is required"),
  price_type: z.enum(["Fixed","From","Free","Custom"]),
  base_price: z.number().min(0),
  base_duration: z.number().min(5, "Select a duration"),
  buffer_time: z.number().min(0),
  service_type: z.string(),
  require_employee_selection: boolean, assigned_employees: string[], allow_multiple_bookings: boolean,
  max_bookings_per_slot: z.number().min(1), is_one_time_booking: boolean,
  availability_type: z.enum(["always","specific"]), availability_schedule: availabilityDaySchema[],
  max_concurrent_bookings: z.number().min(1),
  group_schedule: groupDaySchema[], waitlist_enabled: boolean,
  min_notice_hours: z.number().min(0), advance_booking_days: z.number().min(1),
  cancellation_policy: z.string(), is_refundable: boolean, is_active: boolean,
})
.refine(service_type ∈ {employee_based,resource_based,group_session}, "Please select a booking type", path ["service_type"])
.refine(service_type!=="employee_based" || assigned_employees.length>=1, "At least one team member is required", path ["assigned_employees"])
.refine(service_type!=="group_session" || group_schedule.some(d=>d.is_active && d.slots.length>0), "Add at least one time slot to an active day", path ["group_schedule"])
```
- Rules without a custom message use zod v4 default text; I didn't copy those strings.
- **No** start<end check on availability or group slots, **no** overlap check, and **no** max on description.
- Form `mode: "onTouched"` (`ServiceForm.tsx:323`).

**Category** (Services page dialog), `ServicesTable.tsx:62-66`:
```ts
{ name: z.string().min(1,"Name is required").max(100),
  color: z.string().min(1),
  description: z.string().max(255).optional() }
```
- The service-form inline dialog has the same rules without `description` (`ServiceForm.tsx:191-196`).
- Payloads: `{name,color,description}` (`ServicesTable.tsx:91`) or `{name,color}` (`ServiceForm.tsx:205`).

**Employee**, `components/Dashboard/Employee/Form/schema.ts:1-84`:
```ts
availabilitySchema = { day_of_week: enum monday..sunday, is_working: boolean,
  shift_start?: regex /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ "Must be in HH:MM format",
  shift_end?:   same regex/message }
serviceOverrideSchema = { service_id: min(1,"Service ID is required"), custom_price?: number.min(0), custom_duration?: number.min(1) }
addressSchema = { name: min(1,"Address name is required"), address?: string }
emergencyContactSchema = { name: min(1,"Contact name is required"), relation?: string, phone?: string }
employeeSchema = {
  _id?, full_name: z.string().min(2, "Full name must be at least 2 characters."),
  last_name?, email: z.string().email({ message: "Invalid email address." }),
  phone_number: z.string().min(1, "Phone number is required."),
  additional_phone_number?, country?, birthday?,
  birth_year?: z.number().int().min(1900).max(<current year>),
  job_title?, employment_type?: enum "full-time"|"part-time"|"casual"|"contractor"|"",
  employment_start_date?, employment_start_year?: int, employment_end_date?, employment_end_year?: int,
  employee_id?, calendar_color?, bio?, addresses?: addressSchema[], emergency_contacts?: emergencyContactSchema[],
  service_overrides: serviceOverrideSchema[], availability_schedule: availabilitySchema[],
  employee_photo: z.any(), is_active: boolean }
```
- **No cross-field rules:** no start year ≤ end year, and no start date before end date.
- `mode: "onTouched"`.
- Addresses and contacts are kept in separate `useState`, not in RHF, and are validated only by disabled buttons.

**Weekly schedule, single-day edit, time-off:** no zod on the client. The rules are the `TIME_OPTIONS` filtering described in §7.

**Server-side zod:**
- Time-off (`app/api/employees/time-off/route.ts:11-20`): `employee_id min(1)`, `type?`, `start_time/end_time z.string().datetime()` (ISO UTC "Z"), `repeat?`, `description?`, `approved?`, `reason?`. Plus the `start>=end` check.
- Shift override (`app/api/employees/shift-overrides/route.ts:10-17`): `employee_id min(1)`, `date regex /^\d{4}-\d{2}-\d{2}$/`, `is_day_off?`, `shifts?: [{start,end}]`. **No time-range check.**

---

### 9. API: Services

```ts
interface ServiceDoc {            // server/models/Service.model.ts:31-92
  _id: string; business_id: string; name: string; description?: string;
  category: string;               // category NAME string (default "")
  category_id: string | null;
  price_type: "Fixed"|"From"|"Free"|"Custom";
  base_price: number; base_duration: number; buffer_time: number;
  service_type: "employee_based"|"resource_based"|"group_session";
  require_employee_selection: boolean;
  assigned_employees: string[] | EmployeeDoc[];   // populated where noted
  allow_multiple_bookings: boolean; max_bookings_per_slot: number; is_one_time_booking: boolean;
  availability_type: "always"|"specific";
  availability_schedule: { day_of_week: string; is_available: boolean; start_time: string; end_time: string }[]; // _id:false
  max_concurrent_bookings: number;
  group_schedule: { day_of_week: string; is_active: boolean; slots: { start_time: string; end_time: string; capacity: number }[] }[]; // _id:false
  waitlist_enabled: boolean; min_notice_hours: number; advance_booking_days: number;
  cancellation_policy: "anytime"|"2h"|"5h"|"10h"|"24h"|"non_cancellable";
  is_refundable: boolean; is_active: boolean; metadata?: Record<string,string>;
  created_at: string; updated_at: string; __v: number;
}
// unique index {business_id, name} (:95) → E11000 on duplicate names
```

#### `POST /api/services` (`app/api/services/route.ts:8-109`)
- **Auth:** session (401 `{error:"Unauthorized"}`). No category, ownership-of-employee or isblocked checks.
- **Body:** JSON with all form fields. `name` is trimmed. Server defaults: `service_type ?? "employee_based"`, `price_type ?? "Fixed"`, `is_active` defaults to true, `advance_booking_days ?? 30`, `cancellation_policy ?? "anytime"`, and so on (`:49-79`).
- **Side effect:** `Employee.updateMany({_id:{$in:assigned_employees}}, {$push:{service_overrides:{service_id}}})`. This doesn't check that the employees belong to the business (`:81-86`).
- **201:** `{success:true, data: ServiceDoc}` with `assigned_employees` as ids.
- **400:** `{success:false, error:"A service with this name already exists for your business."}`.
- **500:** `{success:false, error: e.message}`. Mongoose validation errors (e.g. missing `base_price`) land here.

#### `GET /api/services` (`:111-134`)
- Session required. Ignores all query params. Returns `Service.find({business_id}).populate("assigned_employees").lean()`, unsorted.
- **200:** `{success:true, data: (ServiceDoc & {assigned_employees: EmployeeDoc[]})[]}`. Errors: 401, 500.

#### `GET /api/services/single/[id]` (`app/api/services/single/[id]/route.ts:9-51`)
- Session required. 400 `{success:false,error:"Invalid Service ID"}`.
- `findById(id).populate("assigned_employees")`. **The ownership check runs before the not-found check** (`:30-42`): a non-existent id returns **403 `{success:false,error:"Unauthorized"}`**, so the 404 "Service not found" branch is unreachable.
- **200:** `{success:true, data: ServiceDoc (populated)}`.

#### `POST /api/services/single/[id]`: edit and is_active toggle (`:53-186`)
- Session required; 400 for an invalid id.
- Ownership: `findOne({_id, business_id})`. Not owned or missing returns **404 `{success:false,error:"Service not found"}`**.
- When `assigned_employees` is provided, it diffs old and new and runs `$addToSet`/`$pull` on `Employee.service_overrides` (`:114-135`).
- Then `$set` of every destructured field. Undefined keys are dropped by Mongoose (documented ≥v6 behavior, **UNVERIFIED at runtime**), which is what makes the `{is_active}` partial toggle work. Uses `runValidators:false`, so enum values aren't validated on update.
- **200:** `{success:true, data: ServiceDoc (populated)}`. **400:** duplicate-name message. **500.**

#### `DELETE /api/services/single/[id]` (`:188-236`)
- Session required. **Super-admin can delete any service**; everyone else only their own.
- 400 for an invalid id; 404 "Service not found".
- Pulls `service_overrides` from the assigned employees.
- **200:** `{success:true, message:"Service deleted successfully"}`.

#### `GET /api/services/user` (`app/api/services/user/route.ts:8-116`)
- Session required, but **not business-scoped**: it aggregates **every service of every business**.
- It geolocates the caller's IP via `http://ip-api.com/json/{ip}`, falling back to Kathmandu 27.7172, 85.324, and sorts by Euclidean lat/lng distance.
- **200:**
  ```ts
  { success: true; user_coords: {lat:number; lng:number};
    data: { _id; distance; name; description; category; base_price; base_duration;
            assigned_employees: EmployeeDoc[]; is_active; business_name; business_city }[] }
  ```
- **Unused by any component.**

#### `POST /api/services/assign-employee` (`app/api/services/assign-employee/route.ts:8-65`)
- Session required (401). Body `{serviceId, employeeId}`.
- 400 `{error:"serviceId and employeeId are required"}`.
- Service lookup is scoped to the business: 404 `{error:"Service not found"}`.
- 500 `{error:"Internal Server Error", details}`.
- **200 (implicit):** `{success:true, message:"Employee assigned to service successfully", data:{service: ServiceDoc, employee: EmployeeDoc|null}}`.
- The client sends `employeeId: string[]` (`services.service.ts:65-78`), but the server treats it as a single value in `$addToSet` and `findOneAndUpdate` updates at most **one** employee. Exact Mongoose casting of an array here is **UNVERIFIED**.
- **The only caller (`AssignEmployee.tsx`) is unused.**

---

### 10. API: Categories

```ts
interface CategoryDoc { _id: string; business_id: string; name: string;
  color: string /* label e.g. "Blue" */; description: string; created_at: string; updated_at: string; __v: number }
// unique {business_id, name} (Category.model.ts:13)
```

| Endpoint | File:lines | Behavior |
|---|---|---|
| `GET /api/categories` | `app/api/categories/route.ts:7-28` | Session required. `find({business_id}).lean()`, unsorted. 200 `{success,data:CategoryDoc[]}`; 401; 500 |
| `POST /api/categories` | `:30-70` | Body `{name, color?, description?}`. 400 `{success:false,error:"Category name is required"}` when `!name?.trim()`. Defaults: color "Blue", description "". 201 `{success,data}`. 400 `"A category with this name already exists."`. 500 |
| `GET /api/categories/[id]` | `app/api/categories/[id]/route.ts:8-29` | Session required. 400 `{success:false,error:"Invalid ID"}`. Owner-scoped. 404 `"Not found"`. 200 `{success,data}` |
| `PATCH /api/categories/[id]` | `:31-62` | `$set {name,color,description}`. **No validation** (an empty name is accepted). 404 "Not found"; 400 duplicate; 200 `{success,data}`. No web caller |
| `DELETE /api/categories/[id]` | `:64-88` | Owner-scoped. 404 "Not found". 200 `{success:true,message:"Category deleted"}`. **No server-side check for remaining services and no cascade.** Orphaned services then show under "Uncategorised" |

There is no separate "public taxonomy" categories route. `/api/categories` is this single business-scoped handler, which contradicts docs `04-api-reference.md:379`.

---

### 11. API: Employees, schedule, time-off, shift overrides

```ts
interface EmployeeDoc {   // server/models/Employee.model.ts:3-102
  _id: string; business_id: string; full_name: string; last_name?: string; email?: string /*lowercased, NOT unique*/;
  phone_number?: string; additional_phone_number?: string; country?: string;
  birthday?: string; birth_year?: number; bio?: string; job_title?: string;
  employment_type: "full-time"|"part-time"|"casual"|"contractor"|"";
  employment_start_date?: string /*"DD/MM"*/; employment_start_year?: number;
  employment_end_date?: string; employment_end_year?: number; employee_id?: string;
  calendar_color: string /*default "#4DD0E1"*/;
  addresses: { _id: string; name: string; address?: string }[];
  emergency_contacts: { _id: string; name: string; relation?: string; phone?: string }[];
  service_overrides: { _id: string; service_id: string; custom_price?: number; custom_duration?: number }[];
  repeating_schedule_config: { schedule_type: string /*"Every week"*/; start_date?: string /*"Mon D, YYYY"*/;
    ends_type: string /*"Never"*/; end_date?: string; end_occurrences?: number };
  availability_schedule: { _id: string; day_of_week: "monday"|…|"sunday"; is_working: boolean;
    shifts: { _id: string; start: string; end: string }[] }[];
  employee_photo?: string /*S3 URL*/; is_active: boolean;
  created_at: string; updated_at: string; __v: number;
}
interface TimeOffDoc { _id; employee_id: string; type: string /*"Annual leave"*/; start_time: string; end_time: string;
  repeat: boolean; description?: string; approved: boolean; reason?: string; created_at; updated_at; __v }
interface ShiftOverrideDoc { _id; employee_id: string; date: string /*YYYY-MM-DD*/; is_day_off: boolean;
  shifts: { _id: string; start: string; end: string }[]; created_at; updated_at; __v }  // unique {employee_id,date}
```

#### `POST /api/employees` (`app/api/employees/route.ts:9-128`)
- Session required. Body is **multipart FormData** (fields listed in §6).
- Empty strings become `undefined` via `getString`. `is_active` is true only for the string `"true"`. Array fields are `JSON.parse`d; malformed JSON gives a 500.
- **Photo:** if `employee_photo.size>0`, it's uploaded via `uploadToS3` with key `profile_{Date.now()}.{ext}` (`server/lib/function.ts:13-38`). No size or type validation on the server.
- Links services with `Service.updateMany($addToSet assigned_employees)`. **No check that the services belong to the business.**
- **201:** `{success:true,data:EmployeeDoc}`. **500:** `{success:false,error:e.message}`. There is no 400 path; Mongoose validation errors (e.g. missing `full_name`) are 500s.

#### `GET /api/employees` (`:130-152`)
- Session required; `find({business_id}).sort({created_at:-1})`, not paginated.
- 200 `{success,data:EmployeeDoc[]}`.

#### `GET /api/employees/[id]` (`app/api/employees/[id]/route.ts:13-40`)
- **No auth at all.** Any caller can read any employee by id, including PII, addresses and emergency contacts.
- 400 `{success:false,error:"Invalid Employee ID"}`; 404 `"Employee not found"`; 200 `{success,data}`.

#### `POST /api/employees/[id]`: edit (`:42-168`)
- Session required; owner-scoped (404 `"Employee not found"`). FormData partial update: only keys present (`formData.has`) are written.
- `service_overrides` is diffed and syncs `Service.assigned_employees`.
- Photo is replaced only when a File is sent. `employee.save()` runs schema validation, e.g. the `employment_type` enum.
- 200 `{success,data:EmployeeDoc}`; 500.

#### `DELETE /api/employees/[id]` (`:170-221`)
- Owner-scoped; 400, 404 as above.
- Pulls the employee from services and deletes their **time-off**. **Shift overrides are not deleted** and are left orphaned.
- 200 `{success:true,message:"Employee deleted successfully"}`.

#### `PATCH /api/employees/[id]/schedule` (`app/api/employees/[id]/schedule/route.ts:10-61`)
- Session required. Body `{availability_schedule: array, repeating_schedule_config?}`.
- 400 `"Invalid Employee ID"`; 400 `{success:false,error:"availability_schedule must be an array"}`.
- `findOneAndUpdate({_id,business_id},{$set})`. 404 `"Employee not found"`.
- 200 `{success,data:EmployeeDoc}`. Shift times aren't validated.

#### `GET /api/employees/time-off` (`app/api/employees/time-off/route.ts:22-64`)
- **No auth and no business scoping.** Query:
  - `employee_id` (400 `"Invalid employee_id format"` when invalid).
  - `start_date`+`end_date` matches records that overlap the range (`start_time <= end AND end_time >= start`).
  - `start_date` alone: `start_time >= start_date`. `end_date` alone: `end_time <= end_date`.
- Sorted by `start_time` ascending. 200 `{success,data:TimeOffDoc[]}`.
- The web's weekly call returns **all businesses' time-off** for the week.

#### `POST /api/employees/time-off` (`:66-133`)
- Session required. 422 `{success:false,error:"Validation error",details:"path: msg; …"}` from zod.
- 400 `{success:false,error:"start_time must be before end_time"}`.
- Employee must belong to the business, else 404 `"Employee not found"`.
- 201 `{success,data:TimeOffDoc}`. **No overlap check** against existing time-off or bookings.

#### `DELETE /api/employees/time-off/[id]` (`app/api/employees/time-off/[id]/route.ts:11-65`)
- Session required. 400 `"Invalid time-off ID"`. 404 `"Time-off record not found"` both when missing and when not owned.
- 200 `{success:true,message:"Time-off deleted"}`.

#### `GET /api/employees/shift-overrides` (`app/api/employees/shift-overrides/route.ts:19-47`)
- **No auth and no business scoping.** Query `employee_id` (400 `"Invalid employee_id"`), `week_start`, `week_end` (string compare on `date`).
- 200 `{success,data:ShiftOverrideDoc[]}`.

#### `POST /api/employees/shift-overrides`: upsert (`:49-97`)
- Session required; 422 from zod. Owner check: 404 `"Employee not found"`.
- `findOneAndUpdate({employee_id,date},{is_day_off: ?? false, shifts: ?? []},{upsert,new})`.
- 200 `{success,data:ShiftOverrideDoc}`.

#### `DELETE /api/employees/shift-overrides/[id]` (`app/api/employees/shift-overrides/[id]/route.ts:10-44`)
- Session required. **No ObjectId validation**, so a malformed id hits a CastError and returns 500 (DERIVED).
- A missing record returns **200 `{success:true}`**. Not owned: 404 `{success:false,error:"Not found"}`.
- Success: 200 `{success:true}` with no `data`.

---

### 12. React Query keys and invalidations (summary)

| Key | Hook / file | Invalidated by |
|---|---|---|
| `["services"]` | `useGetServices` | service create/edit (`ServiceForm.tsx:554`), toggle and delete (`ServicesTable.tsx:503,531`) |
| `["singleservice", id]` | `useGetSingleService` | never |
| `["categories"]` | `useGetCategories` | `useCreateCategory`, `useUpdateCategory`, `useDeleteCategory` `onSuccess` (`category.service.ts:28,41,49`) |
| `["employees"]` | `useGetEmployees` | employee delete (`EmployeeTable.tsx:218`); schedule save and delete-all (`ScheduleShift.tsx:1593,1622`). **Not** by employee create/edit |
| `["employee", id]` | `useGetSingleEmployee` | never |
| `["shiftOverrides", ws, we]` | `useGetShiftOverrides` | `["shiftOverrides"]` prefix (`ScheduleShift.tsx:1569,1639`) |
| `["weekTimeOffs", ws, we]` | `useGetWeekTimeOffs` | `["weekTimeOffs"]` (`:1604`) |
| `["employeeTimeOff", id]`, `["userservice"]`, `["services", catId]` | unused hooks | n/a |
| `["category"]` | inventory `useGetActivity` (dead) | inventory dialogs |

---

### 13. Contradictions with `F:\whamobileapp\docs\mobile`

1. **`04-api-reference.md:478`** says `assign-employee` and `DELETE /api/services/single/[id]` have no auth. Both now call `getServerSession`; this was fixed in commit `43e09ea` ("add missing auth on mutation routes").
2. **`04:323`** "List services `GET /api/services?business_id=` — public for browse": the GET ignores query params and requires a session; it returns only the caller's services. (`04:520` already says it isn't public.)
3. **`04:324`** "Single service … auth —": it requires a session plus ownership (401/403).
4. **`04:325`** "My services (business) `/api/services/user`": it returns all businesses' services sorted by IP-geo distance, and nothing uses it.
5. **`04:328`** lists `employeeId: string[]` as if it works. The server handles a single id, and the UI is dead code.
6. **`04:349-354`**: all marked 🔒, but `GET /api/employees/[id]`, `GET /time-off` and `GET /shift-overrides` have **no auth** and no business scoping. The cookie-only list (`04:588`) omits `/api/employees/*`, which is also cookie-only.
7. **`04:357,379`** "public taxonomy" `/api/categories`: there's only one session-scoped handler. `04:359` and `99-open-questions.md:18-22` (inventory) are resolved: the route doesn't exist and the screen is dead.
8. **`04:419-426`** says `useFetcher` appends `page`/`per_page` by default. Not for these hooks (`queryKey: null`).
9. **`04:522`** says "base_price (AUD)". The UI shows **"NPR"** in the list and employee services tab (`ServicesTable.tsx:785`, `EmployeeForm.tsx:1234`) but **"$"** in the service form (`ServiceForm.tsx:834`). The currency is inconsistent in code.
10. **`03-screens.md:57`** asks whether inventory and services are distinct concepts. They are, and inventory is a dead prototype (§1).
11. **`03-screens.md:167`** says services are listed when business_type is employee_based or item_based. No dashboard screen in scope branches on `business_type`.
12. **`06-features-and-business-logic.md:105-107`** says `group_session` capacity comes from `allow_multiple_bookings` + `max_bookings_per_slot`. The service form never sets those fields; group capacity is per-slot `group_schedule[].slots[].capacity`, used only when `availability_type === "specific"` (`available-slots/route.ts:385-424`). See the new-group-session bug in §3.
13. **`07-forms-and-validation.md`** has no Service, Employee, Category or schedule schemas (§8 supplies them). Its claim that "All forms use react-hook-form + zod" doesn't hold for the schedule, time-off and edit-day dialogs, which use plain `useState` with no zod.
14. **`99-open-questions.md:57-59` (#11, `isblocked`)**, for this area: no API enforcement; only the client redirect at `DashboardLayout.tsx:530`.
15. **`99:102-105` (#23)**: response shapes are now traced (§9–11).

---

### 14. Things I couldn't verify

- Mongoose stripping `undefined` from `$set` (the toggle relies on it).
- Exact Mongoose casting of an array `employeeId` in `assign-employee`.
- Whether a legacy unique email index exists in the DB.
- Zod v4 default error strings for rules without a custom message.
- Hermes parsing of `new Date("Mon D, YYYY")`.
- Server body-size limits for photo uploads.

---


## Area 5 — Bookings, Calendar, Reservations, Resources (business dashboard)

Everything below was read from source in `F:\WHA`; file:line references are included. Items I could not confirm are marked **UNVERIFIED**. I did not edit any files.

Framework versions (`F:\WHA\package.json`): next 16.1.6, next-auth ^4.24.13, @tanstack/react-query ^5.90.20, zod ^4.3.6 (installed 4.4.3).

---

### 0. Findings that matter most for the spec

1. **None of these API routes support mobile bearer auth.** Every route in `app/api/bookings/*`, `app/api/calendar/*` and `app/api/resources/*` uses `getServerSession(authOptions)` only. There is no `getAuthUser`, no `isblocked` check and no `category` check, except `bookings/user*`, which requires `category === "user"`. A grep for `getAuthUser|isblocked|category` in those folders finds only `bookings/user/route.ts:14` and `bookings/user/[id]/route.ts:19`.
2. **The calendar only ever shows 10 bookings.** `GET /api/calendar/bookings` paginates with `limit` defaulting to 10 (max 50) (`app/api/calendar/bookings/route.ts:42-44`). `useGetCalendarBookings` sends no `page`/`limit` (`services/calendar.service.ts:14`). So the day or week grid gets at most 10 bookings, newest `start_time` first (`route.ts:90`).
3. **The Bookings list never refreshes after a status change.** The query key is `["getbookings"]` (`services/booking.service.ts:203`), but the component invalidates `["businessbookings"]` (`components/Dashboard/Bookings/BookingsListBusiness.tsx:167`).
4. **Each screen allows different status transitions.** The server state machine is in `app/api/bookings/status/route.ts:8-17`. The Calendar, Reservations, Today and Bookings-list screens each hard-code their own list of options (§5).
5. **`PATCH /api/bookings/[id]` bypasses the state machine.** It accepts any of 7 statuses (not `arrived`) with no transition check (`[id]/route.ts:9-11,61-66`). Reschedule uses it and does no availability or conflict check.
6. **`GET /api/bookings/verify` has no auth.** It is reachable by anyone who has a Stripe `session_id`. In the live flow it can never return `verified:true` (§6.5).
7. **Paid bookings are stored as `payment_status: "pending"`.** The consumer flow takes Stripe payment through a server action (`app/actions/bookingstripe.tsx:9-49`, called from `BookingCheckout.tsx:114`). But `POST /api/bookings` ignores `payment_status` and `payment_transaction_id` from the body and always stores `status:"confirmed", payment_status:"pending"` (`app/api/bookings/route.ts:288-289`). The business therefore sees "pending" payment on bookings that were paid.
8. **Resource overrides are display-only.** `ResourceOverride` is never read by `available-slots`, `lock` or `bookings` POST (grep: only used in `app/api/resources/overrides/route.ts` and `Resources.tsx`). "Closed" or quantity overrides do not affect real availability.
9. **Notifications are created only for appointments and reviews.** The model `type` enum is `["appointment","review"]` (`server/models/Notification.model.ts:6`). There is no `Notification.create` for ticket sales, deal redemptions or orders (§8).
10. **The "business_type" setting (`employee_based`/`item_based`) is not used anywhere in these screens or routes.** All behavioural differences come from the per-service `Service.service_type`: `"employee_based" | "resource_based" | "group_session"` (`server/models/Service.model.ts:50-54`). A grep for `business_type|item_based` finds hits only in auth, signup, settings, `SingleBusinessPage` and the models.

---

### 1. Shared building blocks

#### HTTP helpers (`lib/action.ts`)
- `Get` (lines 24-44): returns `res.json()` and **never throws on non-2xx**. A 401 or 500 is handed to React Query as successful `data`.
- `Post` / `PATCH` (54-106): on `!res.ok` they `throw new Error(<raw response text>)`. There is no `error.response`, so any `error.response?.data?.message` lookup is always `undefined`.
- `useFetcher(baseKey, queryKey, url, enabled, defaultParams={page:"1",per_page:"10"})` (`lib/generic.service.tsx:8-37`). With `queryKey = null` no query params are appended (`lib/hook.query-parse.ts:54-78`). The key is `[...baseKey]`.
- QueryClient uses defaults (`lib/ReactQueryContext.tsx:4`): staleTime 0, so queries refetch on mount.

#### Rate limit
`proxy.ts:14-19,62-71` allows 20 requests per 10 s per IP, or per `user:<sub>` when a valid mobile bearer token is present. When exceeded it returns 429 `{ success:false, error:"Too many requests. Please slow down." }`.

#### Dashboard guard (client-only)
`components/Dashboard/DashboardLayout.tsx:529-535`:
- If `session.user.isblocked`, redirect to `/blocked`.
- If `category === "user"` and the path starts with one of `PROTECTED_PATHS`, redirect to `/unauthorized`. `PROTECTED_PATHS` is `/dashboard/bookings`, `/dashboard/deals`, `/dashboard/inventory`, `/dashboard/settings`, `/dashboard/complete-profile`, `/dashboard/clients` (lines 22-29).
- Calendar, reservations, todayreservations and resources are **not** in that list.

After a business logs in it lands on `/dashboard/calendar` (`components/Auth/LoginPage.tsx:101,238`). Sidebar entries (`components/ResuableComponents/Sidebar.tsx:36-72`):
- "Calendar" group: "Calendar", "Manage Reservations", "Todays Reservations".
- A second "Catalog" item that points to `/dashboard/resources`.

#### Models

`server/models/Booking.model.ts:3-89`:
```ts
interface BookingDoc {
  _id: ObjectId;
  business_id: string;               // String, not ObjectId
  user_id: ObjectId;                 // ref User, required
  service_id: ObjectId;              // ref Service, required
  employee_id: ObjectId | null;      // ref Employee
  idempotency_key: string | null;
  inventory_quantity: number | null;
  start_time: Date; end_time: Date; duration: number; // minutes, all required
  total_price: number;               // required, min 0
  currency: string;                  // default "AUD"
  payment_status: "unpaid"|"pending"|"paid"|"refunded"|"failed"; // default "unpaid"
  payment_transaction_id?: string;
  stripe_session_id: string | null; payment_intent_id: string | null;
  status: "pending"|"confirmed"|"rescheduled"|"arrived"|"completed"|"cancelled"|"no_show"|"refunded"; // default "pending"
  notes?: string;
  metadata?: Map<string,string>;
  is_reminder_sent: boolean;         // default false
  created_at: Date; updated_at: Date;
}
```

`server/models/Service.model.ts:3-92`, the fields relevant here:
- `service_type` (default `employee_based`).
- `availability_type: "always"|"specific"` (default `always`).
- `availability_schedule: {day_of_week:string; is_available:boolean=true; start_time:string="09:00"; end_time:string="17:00"}[]`.
- `max_concurrent_bookings` (default 1, min 1).
- `group_schedule: {day_of_week; is_active=false; slots:{start_time; end_time; capacity=1 (min 1)}[]}[]`.
- `allow_multiple_bookings`, `max_bookings_per_slot`, `is_one_time_booking`, `buffer_time`, `assigned_employees`.

`server/models/ResourceOverride.model.ts:3-19`:
```ts
{ business_id: string; service_id: ObjectId; date: string /* "YYYY-MM-DD" */;
  is_closed: boolean /* default false */; quantity_override: number | null;
  created_at; updated_at }
```
Unique index on `{service_id, date}` (line 18). Note it is **not** keyed by business.

Employee (`server/models/Employee.model.ts`):
- `calendar_color` default `"#4DD0E1"` (33), `job_title` (20).
- `service_overrides[{service_id, custom_price, custom_duration}]` (53-57).
- `availability_schedule[{day_of_week: lowercase enum "monday".."sunday", is_working, shifts[{start,end}]}]` (71-89).

---

### 2. Services layer (React Query)

| Hook | File:line | Key | Request |
|---|---|---|---|
| `useGetBusinessBookings` | `services/booking.service.ts:201-206` | `["getbookings"]` | `GET /api/bookings` |
| `useUpdateBookingStatus` | `booking.service.ts:168-188` | mutationKey `["updateBookingStatus"]` | `PATCH /api/bookings/status`, body `{bookingId,newStatus,notes}` |
| `useGetAvailableSlots` | `booking.service.ts:129-155` | `["availableslots",serviceId,date,employeeId,timezone,businessId,duration_minutes]` | `GET /api/bookings/available-slots?service_id=&date=[&business_id=]&duration_minutes=${duration_minutes}[&employee_id=]&timezone=${encodeURIComponent(tz)}`. Note: `duration_minutes` is **always** appended, as the literal `"undefined"` when not given (line 148). Not used by the dashboard Calendar. |
| `useCreateBookingLock` | `booking.service.ts:157-166` | `["createBookingLock"]` | `POST /api/bookings/lock` |
| `useCreateBooking` | `booking.service.ts:190-199` | `["createBooking"]` | `POST /api/bookings` |
| `useGetCalendarBookings(start,end)` | `services/calendar.service.ts:5-18` | `["calendarBookings", start??"", end??"", timezone]`, `staleTime 30_000`, `enabled: !!startDate` | `GET /api/calendar/bookings?start_date=${start}&end_date=${end ?? start}&timezone=${encodeURIComponent(Intl…timeZone)}`. No page, limit or statuses. |
| `useGetResourceOverrides(ws,we)` | `services/resources.service.ts:6-16` | `["resourceOverrides", ws??"", we??""]`, enabled when both are set | `GET /api/resources/overrides?week_start=&week_end=` |
| `useUpsertResourceOverride` | `resources.service.ts:18-36` | `["upsertResourceOverride"]` | `POST /api/resources/overrides`, body `{service_id,date,is_closed,quantity_override?}` |
| `useUpdateResourceSchedule` | `resources.service.ts:38-57` | `["updateResourceSchedule"]` | `PATCH /api/resources/${id}/schedule`, body = everything except `id` |
| `useDeleteResourceOverride` | `resources.service.ts:59-71` | `["deleteResourceOverride"]` | `DELETE /api/resources/overrides?service_id=&date=`. **Not used anywhere.** |
| `useGetServices` (Calendar & Resources use this one) | `services/services.service.ts:6-12` | `["services"]` | `GET /api/services` (no params) |
| `useGetSingleService(id)` | `services/services.service.ts:50-56` | `["singleservice", id]` | `GET /api/services/single/${id}` |
| `useGetEmployees` | `services/employee.service.ts:6-12` | `["employees"]` | `GET /api/employees` |

`booking.service.ts:119-127` also exports a different `useGetServices(businessId?)` with key `["getservices", businessId]`. The dashboard screens do not use it.

Client TypeScript types in `booking.service.ts`:
- `BookingType` (42-66) omits `inventory_quantity`, `stripe_session_id`, `payment_intent_id` and `is_reminder_sent`.
- `BookingLockResponse = {success; lock_id; total_price}` (82-86). This **does not match** the server (§6.7).
- `BookingPayload` (88-102) lacks `service_id` and `items`, which the server requires/reads.

**Invalidations in scope:**
- `BookingsListBusiness.tsx:167` invalidates `["businessbookings"]`. This is the wrong key (see §0.3).
- `Resources.tsx:591-593,607` invalidates `["resourceOverrides"]`. This one is correct.
- Nothing else calls `invalidateQueries`. Calendar, Reservations and Today use manual `refetch()` or local `fetch` state.

---

### 3. Route: `/dashboard/bookings`

- Page: `app/dashboard/bookings/page.tsx:1-8` (client). Calls `useGetBusinessBookings()` and passes `data?.data ?? []` to `BookingsTable`.
- Component: `components/Dashboard/Bookings/BookingsListBusiness.tsx` (497 lines).

**Loading, empty and error states.** There are no separate loading or error states. While loading, and also on 401/500 (because `Get` never throws), the table shows one row with the text **"No business configuration bookings located."** (line 225).

**Table columns** (207-216): Service, Employee, Date & Time, Duration, Price, Payment, Status, Actions.
- Service: `service_id?.name || "Deleted Service"`.
- Employee: avatar plus `employee_id?.full_name ?? "Unassigned"`; avatar fallback is the first 2 characters or "N/A".
- Date & Time: `toLocaleDateString("en-US",{year:numeric,month:short,day:numeric})` with the time `hh:mm AM/PM` underneath.
- Duration: `"{duration} mins"`.
- Price: `"{currency} {total_price}"`, e.g. "AUD 50".
- Payment: pill with the raw `payment_status`; green only when `paid`, amber otherwise.
- Status: dropdown pill showing the raw status (capitalised by CSS).
- Actions: an eye icon (sr-only "View Details").

**Status dropdown** (300-337) always offers all six options: Pending, Confirmed, Completed, Cancelled, No Show, Refunded. It ignores the current status and offers no "Arrived" or "Rescheduled".
- Handler (157-183) sends `{bookingId, newStatus, notes:"Status updated from dashboard table viewport."}`. The server **appends that note to `booking.notes`** (`status/route.ts:61-63`).
- Success: toast `` `Booking status changed to ${newStatus}` ``.
- Error: toast `"Failed to alter state machine entry"`. The real server message is never shown (see §1 on `PATCH`).
- `statusStyles` (142-155) has no entries for `rescheduled` or `arrived`, so those fall back to the pending (amber) style.
- While any update is in flight, every status button in the table is disabled and shows a spinner (`isUpdating` is shared).

**Detail dialog** (359-493):
- Title "Booking Specifications", description `ID: {_id}`.
- Category pill `service_id?.category || "N/A"`, service name or "Deleted Configuration", description.
- "Total Price" shown as `{currency} {total_price}`.
- "Lifecycle Status".
- "Appointment Date"; "Allocation Window" as start - end, with "({duration} minutes)".
- "Assignment Profile": employee name or "Unassigned", email or "No email profile".
- `Client ID: <last 6 chars of user_id>` or "N/A". `user_id` is not populated by `GET /api/bookings`.

**Deep link:** `?bookingId=<id>` auto-opens the dialog when that id is in the list (125-137). Notification clicks and global search navigate here (`DashboardLayout.tsx:203,383`).

---

### 4. Route: `/dashboard/bookings/success`

- Page: `app/dashboard/bookings/success/page.tsx:1-9`.
- Component: `components/Business/SingleBusinessPage/Bookings/Success.tsx`. This is consumer-facing even though it lives under `/dashboard`.

How it works:
- Reads `?session_id`.
- Polls `axios.get('/api/bookings/verify?session_id=…')` with key `["booking-verification", sessionId]` every 1500 ms until `verified` (lines 11-21).
- Loading / not-verified copy: **"Securing your confirmation records..."** (30).
- Verified copy: **"Booking Confirmed!"** and **"Your spot is officially secured at Maa Kali Hardware."** (44-48). The business name is hard-coded.

Who reaches it: non-`user` sessions after a consumer booking, via `router.push('/dashboard/bookings/success?session_id=${paymentIntentId}')` (`components/Business/SingleBusinessPage/Bookings/Bookings.tsx:394-398`). It receives a **PaymentIntent id**, not a Checkout Session id. `stripe_session_id` is only written by the `checkout.session.completed` webhook (`app/api/webhooks/stripe/route.ts:36,62-75`). So in the live flow this page **spins forever**.
- With no `session_id`, the query is disabled and the page shows the spinner forever.

---

### 5. Booking statuses: server rules and what each screen allows

#### Server: `PATCH /api/bookings/status` (`app/api/bookings/status/route.ts:8-17`)

| From | Allowed to |
|---|---|
| pending | confirmed, rescheduled, cancelled |
| confirmed | arrived, completed, rescheduled, no_show, cancelled |
| rescheduled | confirmed, arrived, cancelled |
| arrived | completed, no_show, cancelled |
| completed | refunded |
| cancelled / no_show / refunded | (none) |

Other server behaviour on this route:
- Same status: returns 200 `{success:true, data}` with no change (45-47).
- Moving to `refunded` also sets `payment_status = "refunded"` (65-67).
- Moving to `cancelled` or `rescheduled` calls `notifyBookingChange(..., "business")`. That sends emails only; no Notification is created because the actor is the business (71-73, `lib/booking-notifications.ts:43`).
- There is no time-based rule on the server (for example "arrived only today").

#### Server: `PATCH /api/bookings/[id]`
`VALID_STATUSES` = pending, confirmed, rescheduled, completed, cancelled, no_show, refunded (`[id]/route.ts:9-11`). No transition check, and **`arrived` is rejected** with `Invalid status: arrived`.

#### UI options per screen

| Current | Calendar panel (`Calendar.tsx:450-474`, date-aware) | Reservations (`Reservation.tsx:73-80`) | Today (`TodayReservations.tsx:67-75`) | Bookings list |
|---|---|---|---|---|
| pending | confirmed, rescheduled, cancelled | confirmed, rescheduled, cancelled | confirmed, cancelled | always all six |
| confirmed | today: arrived, completed, rescheduled, cancelled. Past: no_show, cancelled. Future: rescheduled, cancelled | rescheduled, no_show, cancelled | arrived, completed, cancelled | " |
| rescheduled | confirmed, cancelled | confirmed, cancelled | confirmed, cancelled | " |
| arrived | today: completed, cancelled. Past: completed, no_show, cancelled. Future: none | (no meta; shows **"Pending"** badge, no actions) | completed, cancelled | " |
| completed / cancelled / no_show / refunded | none | none | none | " |

Notes on the table:
- In Calendar and Reservations, choosing "rescheduled" opens a reschedule form. That form uses `PATCH /api/bookings/[id]`, not `/status` (§6.2).
- Reservations can never mark a booking `completed` or `arrived`.

#### Status labels and badge colours

| Screen | Labels | Colours |
|---|---|---|
| Calendar (`Calendar.tsx:415-448`) | Pending, Confirmed, Rescheduled, Arrived, Completed, Cancelled, No Show, Refunded | amber, blue, purple, teal, emerald, red, gray, orange |
| Reservations (`Reservation.tsx:37-71`) | no `arrived` or `refunded`; those show as **"Pending"** | — |
| Today (`TodayReservations.tsx:36-65`) | no `refunded`; it shows as **"Pending"** | — |

Payment pill: Reservations and Today `PAYMENT_META` covers paid, unpaid, pending and refunded (no `failed`). The Calendar pill is green only for `paid`.

#### Server error strings (`/status`)

| Status | Body |
|---|---|
| 401 | `{ error:"Unauthorized" }` |
| 400 | `{ error:"Missing required fields: bookingId and newStatus" }` |
| 404 | `{ error:"Booking not found" }` (scoped by `business_id`) |
| 400 | `` { error:`Invalid status transition from '${currentStatus}' to '${newStatus}'.` } `` |
| 500 | `{ error:"Internal Server Error", details }` |
| 200 | `{ success:true, message:`Booking status updated to ${newStatus}`, data: Booking }` |

`data` is the unpopulated saved document.

---

### 6. API routes

#### 6.1 `/api/bookings` (`app/api/bookings/route.ts`)
Auth: `getServerSession`. No category or isblocked check.

**GET** (389-427). There are no params and no pagination.
```ts
// 200
{ success: true; data: Array<BookingDoc & { service_id: ServiceDoc|null; employee_id: EmployeeDoc|null }> }
// populate("service_id") full doc, populate("employee_id") full doc; user_id NOT populated; sort start_time desc; .lean()
// 401
{ success:false; code:"UNAUTHORIZED"; message:"You must be logged in" }
// 500
{ success:false; code:"FETCH_FAILED"; message: error.message || "Unable to fetch bookings" }
```
Query is `Booking.find({business_id: session.user.id})`. Any logged-in user gets their own-id-scoped result, which is empty for consumers.

**POST** (32-388). This is the consumer booking flow, documented for completeness.

Body fields read: `lock_id`, `service_id`, `start_time`, `employee_id?`, `items?[{service_id,quantity,multiplier}]`, `idempotency_key?`. There is no zod validation (`validated_data = body`, line 51).

Behaviour:
- If `idempotency_key` matches an existing booking, returns 200 with that booking (59-71).
- Inside a transaction:
  - The lock must match `{_id, user_id, service_id, start_time (ms zeroed), expires_at > now}`.
  - Price and duration are re-derived from the Service (plus employee overrides when employee_based).
  - Concurrency is checked (169-273).
  - The booking is created with `status:"confirmed", payment_status:"pending"` (288-289).
  - The lock is deleted. `is_one_time_booking` services are deactivated once capacity is reached (300-317).
  - A `Notification.create` is written (345-356).
- Confirmation emails are sent after the transaction.
- 201 response: `{ success:true, message:"Booking confirmed", data: BookingDoc }`.
- `payment_status` and `payment_transaction_id` from the body are ignored.

Thrown messages: `"LOCK_INVALID: Lock not found or expired"`, `"SERVICE_NOT_FOUND"`, `"SERVICE_UNAVAILABLE"`, `"EMPLOYEE_INVALID"`, `"SLOT_TAKEN: This slot is fully booked"`, `"SLOT_TAKEN: Employee is fully booked"`, `` `OUT_OF_STOCK: Only ${remaining_stock} item(s) left for this slot.` ``.
- `toClientError` maps any `Error` to `code:"BOOKING_FAILED"` (26-28).
- The 409 check is `code?.includes("OUT_OF_STOCK")` (380-383). Because the code is always `BOOKING_FAILED`, **409 is never returned; these errors are always 400** with `{ success:false, code:"BOOKING_FAILED", message }`.
- An invalid JSON body returns 422.

Branching gotcha: concurrency branches key on `service_type==="employee_based"` plus `allow_multiple_bookings`. A `group_session` service has `employee_id = null` and **falls into the inventory branch** (208-273), which uses `max_concurrent_bookings`. `group_schedule` slot capacity is not used there.

#### 6.2 `PATCH /api/bookings/[id]` (`app/api/bookings/[id]/route.ts`)
Auth: `getServerSession`. Ownership is checked with `String(booking.business_id) !== session.user.id` → 403. There is **no GET handler**.

Body (all optional):
- `employee_id`: string or null. Only existence is checked, not ownership (38-46).
- `start_time`: ISO string; `end_time` is recomputed from `duration ?? booking.duration` (49-58).
- `duration`.
- `status`: one of `VALID_STATUSES`, with no transition check.

The update is written with `updateOne` (69-82).

```ts
// 200
{ success: true; data: BookingDoc & {
  service_id: { _id; name; service_type; base_price; base_duration } | null;
  employee_id: { _id; full_name; calendar_color; employee_photo; job_title } | null;
  user_id: { _id; name; email } | null } }
```

Errors:
- 401 `{success:false,error:"Unauthorized"}`
- 404 `"Booking not found"`
- 403 `"Forbidden"`
- 404 `"Employee not found"`
- 422 `"Invalid start_time"`
- 422 `` `Invalid status: ${status}` ``
- 500 `err.message || "Internal server error"`

Side effects: `status==="cancelled"` triggers `notifyBookingChange(id,"cancelled","business")`. Otherwise, if `start_time` was sent, it triggers `"rescheduled"` (90-94). These send emails only.

**No availability, overlap, shift or past-date check on reschedule or reassign.**

#### 6.3 `GET /api/bookings/today` (`today/route.ts`)
- Auth: `getServerSession`.
- Query: `date=YYYY-MM-DD` (optional). The day window is **UTC**: `${date}T00:00:00.000Z`–`T23:59:59.999Z` (21-28). There is no timezone param.
- 200: `{ success:true, data: Booking[] }`, sorted `start_time` ascending, with `service_id` (full), `employee_id` (full) and `user_id` (`name email`) populated. No pagination.
- 401 `{success:false,error:"Unauthorized"}`; 500 `{success:false,error: err.message||"Failed to fetch"}`.
- The client sends the UTC date (`TodayReservations.tsx:110-116`). For AU timezones, "today" is therefore the UTC day.

#### 6.4 `GET /api/calendar/bookings` (`app/api/calendar/bookings/route.ts`)
Auth: `getServerSession` → 401 `{error:"Unauthorized"}`.

Query parameters:

| Param | Meaning |
|---|---|
| `start_date`, `end_date` | `YYYY-MM-DD`. Converted from local midnight to 23:59:59 in `timezone` (8-27, 52-56). If `start_date` is absent, there is no date filter. |
| `timezone` | IANA name, default `"UTC"`. |
| `status_filter` | Include only this exact status; `"all"` is ignored. |
| `statuses` | Legacy comma-separated **exclude** list. Absent → excludes `cancelled,no_show,refunded`. Present but empty → shows all (68-82). |
| `page` | Default 1. |
| `limit` | Default **10**, clamped to 1..50. |

```ts
// 200
{ success: true;
  data: Array<BookingDoc & {
    service_id: { _id; name; service_type; category; max_concurrent_bookings; base_price } | null;
    employee_id: { _id; full_name; email; calendar_color; employee_photo; job_title } | null;
    user_id: { _id; name; email; image } | null }>;   // sort start_time DESC
  total: number; page: number; totalPages: number; limit: number;
  status_counts: Record<string, number> & { all: number } } // counts ignore status filters, respect date range
// 500
{ success:false; error: error.message }
```

#### 6.5 `GET /api/bookings/verify` (`verify/route.ts`): no auth, confirmed
- There is no session check anywhere in the file (lines 1-53).
- Query: `session_id`. Missing → 400 `{ error:"Missing required query parameter: session_id" }`.
- It looks up `Booking.findOne({stripe_session_id})`.
- Not found → 200 `{ verified:false, message:"Booking records are currently being processed. Still waiting for payment authorization webhook..." }`.
- Found → 200:
  ```ts
  { verified:true; booking:{ id; start_time; end_time; status; payment_status;
      service_name: string /* service_id.name || "Service Appointment" */;
      employee_name: string /* employee_id.name || "Any Professional" */ } }
  ```
  - `populate("employee_id","name")`: Employee has `full_name`, not `name`, so this is always "Any Professional".
  - `populate("service_id","name price duration")`: `price`/`duration` are not Service fields.
- 500 `{ error:"Internal server validation pipeline crash." }`.

**What it leaks:** to anyone holding a Stripe Checkout session id, it returns booking `_id`, times, status, payment_status and service name. There is no ownership check. Session ids are high-entropy, so the practical risk is low but real.

**In practice it never verifies.** The only writer of `stripe_session_id` is `webhooks/stripe/route.ts:62-75`. That `Booking.create` omits the schema-required `duration` and `total_price` (`Booking.model.ts:40,43`). From reading the code it should fail validation and return 500 `{error:"Booking execution failed"}`. This has not been run, so treat it as **UNVERIFIED at runtime**.

This is **not** a business "verify booking" feature. No QR or check-in verification route exists for bookings.

#### 6.6 `GET /api/bookings/available-slots` (`available-slots/route.ts`)
No auth.

Query, validated by zod (17-24): `date` (regex, message `"date must be YYYY-MM-DD"`), `service_id`, `employee_id?`, `timezone` (default "UTC"), `business_id?`, `duration_minutes?` (string).

Errors:
- 422 `{success:false, code:"VALIDATION_ERROR", message:"<path>: <msg>; …"}`.
- 400 `{code:"INVALID_PARAMS"}`.
- 400 `{code:"PAST_DATE", message:"Cannot query slots for past dates"}`. The date is compared with "today" in `timezone`.
- 404 `{code:"SERVICE_NOT_FOUND"}`.
- 400 `{code:"SERVICE_UNAVAILABLE"}`.
- 500 `{code:"INTERNAL_ERROR", message:"Unable to fetch slots"}`.

200 response: `{ success:true, count, available_slots: string[] /* UTC ISO */, slot_remaining?: Record<iso, number> }`. `slot_remaining` is only returned for `resource_based`. The step is 10 minutes.

Pipelines:

| Service type | Hours used | Capacity rule |
|---|---|---|
| `resource_based` (241-363) | `availability_type==="specific"` → that day's `availability_schedule`; otherwise business `OperatingHours` (default 09:00–17:00 if none) | Peak concurrent `inventory_quantity` vs `max_concurrent_bookings` |
| `group_session` (369-467) | specific → `group_schedule` slots; always → business hours grid | specific: slot `capacity`; always: `max_bookings_per_slot` |
| employee_based (473-617) | Employee shifts | Time-off, buffers and collisions checked |

ResourceOverride is **not** considered.

#### 6.7 `POST /api/bookings/lock` (`lock/route.ts`)
- Auth: `getServerSession` → 401 `{success:false,code:"UNAUTHORIZED",message:"You must be logged in"}`.
- Body, validated by zod (15-31):
  - `service_id` (min 1).
  - `employee_id?: string|null` (`"any"` is allowed).
  - `start_time`: parseable date, message `"Invalid date format provided"`.
  - `timezone` (default UTC).
  - `items?[{service_id, quantity:int>0=1, multiplier:int>0=1}]`.
  - `business_id` and `inventory_quantity` from the client type are **ignored**.
- 201 response: `{ success:true, lock_id: string, employee_id: string|null }`. There is **no `total_price`**.
- The lock expires in 5 minutes (285, 353, 488).

Errors (502-518) all have the shape `{success:false, code:<msg>, message}`:

| Code | Status | Message |
|---|---|---|
| SLOT_TAKEN | 409 | "Requested quantity/time units are no longer available" |
| SERVICE_NOT_FOUND | 404 | "Service not found" |
| SERVICE_UNAVAILABLE | 400 | "Service is currently not active" |
| anything else, including EMPLOYEE_INVALID | 500 | "Unable to secure holding space, please re-request slots" |

Validation failures return 422 `VALIDATION_ERROR`. A bad body returns 400 `{code:"INVALID_BODY", message:"Invalid request body"}`.

#### 6.8 `POST /api/calendar/appointments` (`app/api/calendar/appointments/route.ts`)
This is how a business creates an appointment from the calendar.
- Auth: `getServerSession` → 401 `{success:false,error:"Unauthorized"}`.
- zod schema (11-19):
  ```ts
  z.object({
    service_id: z.string().min(1),
    employee_id: z.string().nullable().optional(),
    start_time: z.string().datetime(),
    duration: z.number().int().min(1),
    customer_name: z.string().optional(),
    notes: z.string().optional(),
    total_price: z.number().min(0).optional(),
  })
  ```
  - On failure: 422 `{success:false, error: issues.map(i=>i.message).join("; ")}`. These are zod 4 default messages with no custom text; exact wording **UNVERIFIED**.
  - Non-zod failure: 400 `"Invalid body"`.
- 404 `"Service not found"`; 404 `"Employee not found"`. Both are existence checks only, **not ownership checks**.
- The booking is created with:
  - `business_id = session.user.id`
  - **`user_id = the business's own id`** (66)
  - `end = start + duration`
  - `total_price = body.total_price ?? service.base_price ?? 0`
  - `currency:"AUD"`, `payment_status:"unpaid"`, `status:"confirmed"`
  - `notes = ["Client: <customer_name>", notes].filter(Boolean).join(" — ")`
- 201 response: `{ success:true, data: BookingDoc }`.
- **No availability, capacity, shift or overlap check, and no Notification.**
- `quantity` from the client is stripped by zod, so `inventory_quantity` is never stored.
- Because `user_id` is the business, Calendar, Reservations and Today show the business owner's name and email as the "client". The typed customer name only appears in `notes`.

#### 6.9 `PATCH /api/resources/[id]/schedule` (`app/api/resources/[id]/schedule/route.ts`)
- Auth: `getServerSession` → 401 `{error:"Unauthorized"}`.
- 400 `{success:false,error:"Invalid service ID"}`.
- Ownership: `Service.findOne({_id:id, business_id})`; not found → 404 `"Service not found"`.
- Body (all optional and **unvalidated**): `availability_type`, `availability_schedule`, `max_concurrent_bookings`, `group_schedule`. Written via `$set` with `runValidators:false` (28-36).
- 200 `{ success:true, data: ServiceDoc /* updated */ }`; 500 `{success:false,error}`.

#### 6.10 `/api/resources/overrides` (`app/api/resources/overrides/route.ts`)
Auth on every method: `getServerSession` → 401 `{error:"Unauthorized"}`.

- **GET**:
  - Query `week_start`, `week_end` (both "YYYY-MM-DD", compared as strings).
  - 200 `{ success:true, data: ResourceOverride[] }`, scoped to `business_id`, not populated.
- **POST**:
  - Body `{service_id, date, is_closed, quantity_override?}`.
  - 400 `{success:false,error:"service_id and date are required"}`.
  - Upserts on `{service_id, date}` and sets `business_id` to the caller (52-56).
  - **No check that the service belongs to the caller.** Any business can overwrite another business's override row.
  - 200 `{ success:true, data: ResourceOverride }`.
- **DELETE**:
  - Query `service_id`, `date` (same 400 message).
  - Deletes `{business_id, service_id, date}`.
  - 200 `{ success:true }`.
- 500 on any method: `{success:false,error}`.

#### 6.11 How the resources list is loaded
There is **no GET resources route**; `app/api/resources/` contains only `[id]/schedule` and `overrides`. Resources are derived client-side from `GET /api/services` filtered to `service_type === "resource_based" || "group_session"` (`Resources.tsx:519-529`, `Calendar.tsx:2808-2819`).

`GET /api/services` (`app/api/services/route.ts:111-134`): session required; returns `{ success:true, data: Service[] }` with `assigned_employees` populated and no pagination.

`/api/categories` is not used by these screens.

#### 6.12 Endpoints the Calendar also uses (outside the strict scope)
- **`GET /api/employees/time-off`** (`app/api/employees/time-off/route.ts:22-64`):
  - **No auth and no business scoping.** It returns every business's time-off overlapping the range. Calendar filters it to its own columns client-side.
  - Calendar calls `?start_date=${sd}T00:00:00Z&end_date=${ed??sd}T23:59:59Z` (UTC) at `Calendar.tsx:2850-2859`.
- **`POST /api/employees/time-off`**:
  - Session plus employee ownership.
  - zod: `employee_id` min 1, `type?`, `start_time` datetime, `end_time` datetime, `repeat?`, `description?`, `approved?`, `reason?` (11-20).
  - 422 `{success:false,error:"Validation error",details}`; 400 `"start_time must be before end_time"`; 404 `"Employee not found"`; 201 `{success,data}`.
- **`DELETE /api/employees/time-off/[id]`**: session plus ownership; 404 `"Time-off record not found"`; 200 `{success:true,message:"Time-off deleted"}`.
- **`GET /api/employees`** (`app/api/employees/route.ts:130-152`): `{success:true,data:Employee[]}`, sorted `created_at` descending.

---

### 7. Screens

#### 7.1 `/dashboard/calendar`
Files: `app/dashboard/calendar/page.tsx` and `components/Dashboard/Calendar/Calendar.tsx` (3261 lines, raw `fetch` throughout).

**Data loaded:**
- `useGetEmployees`.
- `useGetServices` (`services.service`).
- `useGetCalendarBookings(startDate,endDate)`. Day view: start = end = local `YYYY-MM-DD`. Week view: Monday to Sunday (2827-2839).
- Blocked times via raw fetch (2850-2863).

**Toolbar:**
- "Today", prev/next, and a date label. Day label is `en-US {weekday:short, month:short, day:numeric}`; week label is "Mon d – Sun d, yyyy".
- Team filter dropdown: "All team" or "All resources" (926-932).
- Mode toggle "Team" / "Resources".
- Refresh.
- Day/Week toggle.
- "Add" dropdown with "Appointment" and "Blocked time" (1696-1726).
- On mobile (<sm) the screen always renders a DayView. Week mode shows `MobileDayTabs` (2659-2694).

**Modes:**
- `employee`: columns are employees. Event colour is `employee.calendar_color || "#4DD0E1"`.
- `resource`: columns are resource_based and group_session services. Colour is a hash of the service id into a 10-colour palette (50-61, 127-138).
- Bookings map to columns by `employee_id` or `service_id` (1389-1402).

**Loading, empty and error states:**
- `CalendarSkeleton` while employees load (2939).
- Inline "Loading bookings…" bar (3118-3123).
- `NoScheduleState` when every employee column is not working that day: **"No scheduled team members"** / "Add availability to your team by managing your scheduled shifts", with links "Scheduled shifts" (`/dashboard/employees?tab=schedule`) and "View all team members" (1056-1092, 1418-1424).
- Empty column header: "No team members" or "No resources" (1472-1478).
- Empty grid: "No scheduled team members" / "Add availability via Scheduled Shifts", or "No resource services" / "Add resource or group session services" (1507-1515).
- Booking fetch errors are not surfaced anywhere.

**Event block** (343-411): time range, customer (`user_id.name || booking.customer_name || "Guest"`), `×qty` when `inventory_quantity > 1`, and the service name.

**Slot click** (1305-1315, 1627-1637):
- Snaps to 15 minutes and opens `SlotContextMenu` with the time, "Add appointment" and "Add blocked time".
- The clicked time is **not** passed into the wizard. The wizard always fetches available slots for the date.

**Booking detail panel** (476-870):
- Header: service name and date (`en-US weekday long, month long, day`).
- Rows:
  - Time range and `· {duration} min`.
  - Customer: name or "Walk-in", plus email.
  - Employee, with a "Reassign" link only for employee_based services.
  - Service and `· ${total_price}`.
  - Status badge and payment pill.
  - Notes.
- **Reassign** (585-604):
  - `PATCH /api/bookings/{id}` with `{employee_id: selected || null}`.
  - The select lists "Unassigned" plus eligible employees: those whose shift covers the slot and who pass the `service_overrides` check.
  - If none are eligible: "No available employees" and "No employees are available at this booking's time and duration." Buttons: Cancel / Save.
- **Status** (565-583):
  - `PATCH /api/bookings/status` with `{bookingId, newStatus}` (no notes).
  - Section title "Update Status". Buttons are coloured per status.
  - Errors show in a red box using `data.error` or "Failed to update status".
- **Reschedule** (508-539):
  - Section "Reschedule Appointment", fields "New Date" / "New Time", buttons Cancel / Confirm.
  - Sends `PATCH /api/bookings/{id}` with `{start_time: ISO, duration, status:"rescheduled"}`.
  - Error text: `data.error || "Failed to reschedule"`.
  - Gotcha: `new Date("YYYY-MM-DD")` is parsed as UTC midnight and then `setHours` applies local time (513-514). In negative-UTC timezones this can land on the previous day.

**Appointment wizard** (1805-2455). There is no zod schema; validation is imperative.
- Steps: Service → Employee (employee_based only) → Date & Time → Confirm. Labels are "Service", "Employee", "Date & Time", "Confirm". Header "New Appointment".
- Service step: "Select a Service", search placeholder "Search services…", grouped by `category || "Other"`, empty "No services found". Lists **all** services, including inactive ones.
- Employee step: "Select an Employee"; option "Any available" / "Auto-assign to the first available employee"; per-employee shift label or "Not working this day"; empty "No employees can perform this service".
- Date & Time step:
  - "Date" input only when not opened from a column slot.
  - "Available Times", loading "Fetching available times…".
  - Empty: "No available times for this date. Try a different day or employee."
  - Slots come from `GET /api/bookings/available-slots?date&service_id&timezone[&employee_id]` with **no `duration_minutes`** (1886-1909). Fetch errors are silently swallowed.
- Confirm step:
  - "Booking Summary".
  - "Quantity" with "(max N)" for non-employee services. Max is the group slot capacity, else `max_concurrent_bookings`, else 20.
  - "Client (optional)" with placeholder "Walk-in / name…".
  - "Notes (optional)" with placeholder "Optional notes…".
  - Button "Confirm Appointment".
- Client validation messages (exact): "Please select a service." (1913), "Please select an available time." (1917), "No time slot selected." (1935).
- Submit payload (1941-1956):
  ```ts
  POST /api/calendar/appointments
  { service_id, employee_id: selectedEmpId || null, start_time: <slot ISO>,
    duration: service.base_duration || 60, quantity: isEmployeeBased ? 1 : quantity, // stripped server-side
    customer_name?: string, notes?: string,
    total_price: (service.base_price ?? 0) * (isEmployeeBased ? 1 : quantity) }
  ```
  Error text: `data.error || "Failed to create appointment"`. On success: close and `refetch()`.
- **Bug:** in Resources mode, a slot click sets `selectedEmpId = column._id`, which is a **service id** (1824-1826, 2117). Submitting then sends that as `employee_id`, and the server returns 404 "Employee not found".
- **Mismatch:** "Any available" sends `employee_id: null`. The server does not auto-assign, so the appointment is created unassigned.

**Blocked time modal** (2459-2655):
- Title "Add Blocked Time". Fields: "Employee *" (with "Select employee"), "Date *", "Start *", "End *", "Note" (placeholder "Reason for blocking (optional)…"). Buttons "Cancel" / "Block Time".
- Default end time is start + 1 hour.
- Client errors: "Employee, date, start and end time are required." and "End time must be after start time."
- Payload: `POST /api/employees/time-off` `{employee_id, type:"Blocked", start_time ISO, end_time ISO, description?, approved:true}`. Error text: `data.error || "Failed to block time"`.
- Clicking a blocked block opens "Remove Blocked Time?" with Cancel / Remove → `DELETE /api/employees/time-off/{id}`. Failures are silent (2865-2881).

**Service-type differences** in the calendar:
- Reassign and the employee step exist only for employee_based (`!service_type || === "employee_based"`).
- Resource columns shade unavailable hours from `availability_schedule` (resource) or `group_schedule` (group) (1153-1203). Gotcha: a resource with `availability_type:"always"` and an empty schedule shows as fully unavailable.

#### 7.2 `/dashboard/reservations`
Files: `app/dashboard/reservations/page.tsx` and `components/Dashboard/Reservation/Reservation.tsx`. All raw fetch.

- Fetch (575-611): `GET /api/calendar/bookings?timezone=<tz>&statuses=&page=&limit=[&status_filter=][&start_date=][&end_date=]`. `statuses=""` means cancelled, no-show and refunded are included.
- Employees come from a raw `fetch('/api/employees')` (613-620).
- Header: "Reservations", "{total} total booking(s)".
- Date range picker shows "All dates" by default with a 2-month range calendar.
- Search placeholder "Search on this page…". It is client-side and covers only the current page (customer name/email, service, employee).
- Refresh button.
- Status tabs (542-550): All, Pending, Confirmed, Rescheduled, Completed, No Show, Cancelled, each with a count from `status_counts`. There are no tabs for arrived or refunded.
- Table columns: Client, Service, Employee, Date & Time, Duration, Amount, Status, Payment.
  - Client: initial avatar, name or "Walk-in", email.
  - Employee: `full_name` or "Unassigned".
  - Amount: `${total_price ?? 0}`.
- Loading shows `pageSize` skeleton rows. Empty: "No reservations found", plus a "Clear filters" link when search or status is active. API errors leave the old data in place.
- Pagination: "Showing a–b of N", "Per page" select with 5/10/20/30/40/50 (default 10), page numbers with ellipsis.
- Detail side panel (161-528) has the same shape as the Calendar panel. Error fallback is `data.error || "Failed"`; there are no date-aware transitions (table in §5); reschedule and reassign use the same calls as Calendar.

#### 7.3 `/dashboard/todayreservations`
Files: `app/dashboard/todayreservations/page.tsx` (metadata title "Today's Reservations") and `components/Dashboard/TodayReservations/TodayReservations.tsx`.

- Fetch `GET /api/bookings/today?date=<UTC YYYY-MM-DD>` on mount and on "Refresh" (294-320).
- Header: "Today's Reservations" and the local date (`en-US weekday long, month long, day, year`).
- Stat cards: "Total today", "Confirmed", "Arrived", "Completed". A cancelled count is computed but never rendered.
- Search placeholder "Search by client name or email…".
- Status dropdown "All statuses", shown only when more than one status is present.
- Time pills: "All day", "Morning 12 AM – 12 PM", "Afternoon 12 PM – 5 PM", "Evening 5 PM – 12 AM". These use local hours.
- Loading: 4 skeleton cards.
- Empty: "No reservations for today" / "Bookings made for today will appear here." With filters active: "No results match your filters" / "Try adjusting your search or filters." plus "Clear filters".
- Counter: "Showing X of Y reservation(s)".
- Card: name or "Walk-in", email, status and payment pills, time range and duration, service and price, employee, notes with 📝.
- Status action buttons → `PATCH /api/bookings/status` `{bookingId,newStatus}`. On a non-success response the **error is silently ignored**; there is no message (322-342).
- No reschedule or reassign here.

#### 7.4 `/dashboard/resources`
Files: `app/dashboard/resources/page.tsx` and `components/Dashboard/Resources/Resources.tsx`.

- Data: `useGetServices` filtered as in §6.11, and `useGetResourceOverrides(weekStartISO, weekEndISO)`.
  - Gotcha: `fmtISODate` uses `toISOString()` (UTC, line 54-56). For a positive-offset timezone (Australia) local Monday 00:00 becomes the **previous UTC date**, so week keys and override dates are shifted by one day.
- Header: "Resources", "Manage resource and group session availability by day".
- Desktop: "This week" and prev/next with "Mon d – Sun d, yyyy". Legend: Available / Closed / Sessions / Qty overridden.
- Grid header: "Resource / Service".
- Service row: name, `"{max_concurrent_bookings} units"` or "Group session", and a gear button ("Manage schedule") linking to `/dashboard/resources/{id}`.
- Cell states (`getCellInfo` 98-142, `DayCell` 299-443):
  - "Closed".
  - "Unavail." (resource) or "No sessions" (group).
  - "Open" with "N unit(s)" and a "✎" if overridden.
  - Group slot times (up to 3, then "+N").
  - Past days and no-schedule cells are not clickable.
- Mobile: a single-day list with status text "Closed" / "Unavailable" / "Open · N units" / "N session(s)", plus "Schedule" and "Override" buttons (the latter only for non-past days).
- Empty (desktop): "No resource or group session services yet" / "Add a Resource or Group Session service to manage it here." / "+ Create service" (→ `/dashboard/services/add`). Empty (mobile): "No resource services yet."
- Loading: `ResourcesSkeleton`. Errors are not shown.

**Day override dialog** (154-295). No zod.
- Title: service name and date.
- Toggle: "Closed for this day" / "No bookings will be accepted". For group sessions: "Cancel all sessions" / "No bookings for all slots on this day".
- For resource_based when not closed: "Override quantity", "Default: N units. Leave blank to use default.", number input (min 1).
- Buttons: "Reset" (only if an override exists), "Cancel", "Save".
- Save payload: `POST /api/resources/overrides` `{service_id, date: fmtISODate(day), is_closed, quantity_override: isResource && !isClosed && qty!=="" ? Math.max(1, parseInt(qty)) : null}`.
- Reset sends `{is_closed:false, quantity_override:null}` through the same **upsert**, not DELETE (573-612).
- On success: invalidate `["resourceOverrides"]` and close. There is **no onError**.

#### 7.5 `/dashboard/resources/[id]`
Files: `app/dashboard/resources/[id]/page.tsx` and `components/Dashboard/Resources/ResourceSchedulePage.tsx`.

- Loads `useGetSingleService(id)`. `GET /api/services/single/[id]` checks ownership **before** existence, so a missing id returns 403 `"Unauthorized"` (`app/api/services/single/[id]/route.ts:28-42`).
- States:
  - `PageSkeleton` while loading.
  - "Service not found" when there is no data, including 403 and 401.
  - "Schedule management is only available for Resource and Group Session services."
- Top bar: back button, service name, "Resource schedule" or "Group session schedule", and "Save" (shows "Saved ✓" after save).
- **resource_based editor:**
  - "Capacity" stepper (min 1) with "units available at a time".
  - "Availability" toggle: "Always available" / "Specific schedule".
  - If specific, "Weekly schedule" with "{Xh Ym} total": 7 days Monday–Sunday, each with a checkbox and either "Not working" or the hours, plus start/end time inputs.
- **group_session editor:**
  - "Weekly sessions" with "N slot(s) / week".
  - Per day: checkbox, "No sessions" or "N slot(s)", slot rows (start, end, capacity min 1, "cap", delete), and "+ Add slot".
  - New slot defaults: 09:00–10:00, capacity 1.
- Bottom button: "Save schedule" / "Schedule saved ✓".
- **No client validation.** End can be before start; overlapping slots are allowed. There is no zod.
- Submit payload (200-218):
  ```ts
  // resource_based
  PATCH /api/resources/{id}/schedule
  { availability_type: "always"|"specific", max_concurrent_bookings: Math.max(1,maxQty),
    availability_schedule: { day_of_week:"Monday"…"Sunday"; is_available:boolean; start_time:"HH:MM"; end_time:"HH:MM" }[7] }
  // group_session
  { group_schedule: { day_of_week:"Monday"…; is_active:boolean; slots:{start_time;end_time;capacity}[] }[7] }
  ```
- On success: show "Saved", then go to `/dashboard/resources` after 800 ms. No onError and no invalidation; the list refetches on mount.
- Days are stored capitalised ("Monday"). The availability-slots logic lowercases them (`available-slots/route.ts:99-114`) and the Resources grid matches "Monday" or "Mon" exactly.

---

### 8. `Notification.create` call sites (for push hooks)

Model `server/models/Notification.model.ts:3-15`:
```ts
{ business_id: string /* required, indexed */; type: "appointment" | "review" /* enum, required */;
  title: string; body: string; related_id: ObjectId /* required */; is_read: boolean /* default false */;
  created_at: Date; updated_at: Date }
// index { business_id:1, is_read:1 }
```

| File:line | Trigger | type / title | body |
|---|---|---|---|
| `app/api/bookings/route.ts:345-356` | New consumer booking (inside the transaction) | `appointment` / "New appointment" | `` `${user?.name || "A customer"} booked ${service.title || service.name || "a service"} for ${start_date.toLocaleDateString("en-AU",{dateStyle:"medium"})}` ``; `related_id` = booking id |
| `lib/booking-notifications.ts:44-51` | `notifyBookingChange(..., actor:"user")` only, called from `app/api/bookings/user/[id]/route.ts:41` (cancel) and `:71` (reschedule) | `appointment` / "Booking cancelled" or "Booking rescheduled" | `` `${userName} ${change} their booking for ${serviceName} — ${bookingDate} at ${bookingTime}` `` |
| `app/api/review/route.ts:77-83` | New review | `review` / "New review" | `` `${rating}-star review: "${comment.slice(0,80)}"` `` |
| `app/api/review/edit/[id]/route.ts:52-58` | Review edited | `review` / "Review updated" | `` `${rating}-star review was updated: "…"` `` |

Not covered:
- Business-initiated changes (`/status`, `/[id]`) only send emails.
- The Stripe webhook, ticket sales, deal redemptions and `POST /api/calendar/appointments` create **no** notifications.
- Hooking ticket or deal pushes would need new call sites and new `type` enum values.

Read API:
- `GET /api/notifications` requires `category === "business"` and returns `{ data: Notification[] /* 50 newest */, unread_count }` (`app/api/notifications/route.ts:7-25`).
- `PATCH /api/notifications/[id]` marks the notification read and returns `{ data }`, or 404 `{error:"Not found"}`.
- There is no GET or DELETE on `[id]`.

Clicking an `appointment` notification goes to `/dashboard/bookings?bookingId=<related_id>` (`DashboardLayout.tsx:381-384`).

---

### 9. Contradictions in `F:\whamobileapp\docs\mobile`

| Doc claim | Code reality |
|---|---|
| 03-screens.md:180-181 and 04:330: lock "returns `lock_id` + `total_price`"; body includes `business_id`, `inventory_quantity` | Returns `{success, lock_id, employee_id}` with status 201 and no total_price (`lock/route.ts:498-501`). `business_id` and `inventory_quantity` are not in the zod schema. |
| 04:330: lock auth "⚠️ inferred" | Confirmed `getServerSession` (`lock/route.ts:90-100`). |
| 04:331: "409 for SLOT_TAKEN/OUT_OF_STOCK" | Always 400 because of the `code` mapping bug (`route.ts:26-28,380-383`). |
| 03:181-183, 06:116-120, 99 #1, 04:340: "No online payment currently happens in this path" | The consumer flow does take Stripe payment via the `getBookingPaymentIntent` server action (`app/actions/bookingstripe.tsx`; `BookingCheckout.tsx:114,303-322`) before `POST /api/bookings`. The route ignores the payment and stores `payment_status:"pending"`. The amount comes from the client (`amountInCents` argument). |
| 04:335: `/api/bookings/[id]` GET/PATCH | PATCH only. |
| 04:338: verify is "POST 🔒, QR/manual" | `GET`, **no auth**, a Stripe `session_id` lookup for the success page. |
| 04:339: `/api/calendar/appointments` is a calendar GET with `start_date, end_date, timezone` | It is a `POST` that creates an appointment. Only `/api/calendar/bookings` is GET (and adds `status_filter`, `statuses`, `page`, `limit`). |
| 04:374: notifications `[id]` GET/PATCH/DELETE | PATCH only. |
| 04:412 and 641: webhook handles only `checkout.session.completed` | Also handles `payment_intent.succeeded` for event tickets (`webhooks/stripe/route.ts:109`). |
| 04:322: single service GET auth "—" | Requires session plus ownership (403) (`services/single/[id]/route.ts:17-35`). |
| 04:350: time-off list 🔒 | `GET /api/employees/time-off` has no auth and no business scope. |
| 06:105-107: group_session capacity is a count at the same `start_time` "for that employee" (route.ts:169-188) | That branch is `allow_multiple_bookings && employee_id`, which applies to employee_based services. `service_type:"group_session"` falls into the inventory branch using `max_concurrent_bookings`. The count is per `service_id`, not per employee. |
| 04:109-129 Booking interface | Missing `inventory_quantity`, `stripe_session_id`, `payment_intent_id`, `payment_transaction_id`, `metadata`, `is_reminder_sent`. `business_id` is a String in the schema. |
| 99 #11: isblocked enforcement not traced | Client redirect only (`DashboardLayout.tsx:530`). No API in this area checks `isblocked`. |
| 99 #23: resources response shapes not traced | Now traced (§6.9–6.11). There is no resources GET; resources are services filtered by `service_type`. |
| 03:59: resources "for resource_based/group_session services" | Correct. But overrides do not affect bookable availability (§0.8). |
| 07-forms-and-validation.md | Has no booking, calendar or resource forms. In code there are **no client zod schemas** for any of these forms (grep for `zod|useForm` in the five component folders finds 0 matches). Server zod exists only for lock, available-slots, calendar/appointments and time-off. |

---

### 10. UNVERIFIED items
- Exact zod 4 default error text for `calendar/appointments` (for example the `.datetime()` and `.int()` failures). The route joins `issue.message` with no custom messages.
- Whether the Stripe webhook's `Booking.create` actually fails at runtime. Code reading says it lacks the required `duration`/`total_price`; it was not executed.
- Whether MongoDB accepts the `BookingLock` partial unique index with `{employee_id: {$ne: null}}` (`server/models/BookingLock.model.ts:32-44`). It may not affect runtime behaviour.
