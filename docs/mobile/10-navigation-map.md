# Navigation Map

## Website structure

### Consumer bottom nav (mobile web, `components/ResuableComponents/BottomNavbar.tsx`)
This is the **single most direct source** for the app's tab bar — it's already
designed mobile-first:

| Icon | Label | Path (logged out) | Path (logged in) |
|---|---|---|---|
| `Home` | Home | `/` | `/` |
| `Search` | Search | `/search` (→ business directory, despite the label) | same |
| `Calendar` | Activity | `/auth` | `/activity` |
| `User` | Profile | `/auth` | `/dashboard` |

Notes carried from the source: the current city filter is preserved across tab
switches as a `?city=` query param; this bar is hidden entirely on `/auth/*` routes and
on `/dashboard/*` routes for a business-category session (which gets its own nav
instead, see below); the active tab shows a colored top indicator bar + filled icon.

**Two things worth flagging before copying this 1:1 into the app**: (1) "Search"
routing to the business directory specifically (not events, not a unified search) is a
real, possibly confusing product decision — confirm with the team whether the app
should keep it as-is or make it a true global search; (2) both "Activity" and
"Profile" degrade to the *same* destination (`/auth`) when logged out — the app should
probably still show these tabs (perhaps gated behind a "Sign in to view" screen) rather
than hiding them, since RN tab bars are less natural to conditionally reshape than a
web nav.

### Business/dashboard nav
A separate, desktop-oriented sidebar (icon rail + sections) used on `/dashboard/*` for
business accounts — seen concretely in `ManageEventPage.tsx`'s `NAV_SECTIONS`
(Orders/Refunds → Orders; Manage attendees → Attendees, Scanning count; Reports →
Analytics), and more broadly in `components/Dashboard/DashboardLayout.tsx` (routes
referenced there include `/dashboard/bookings`, `/dashboard/deals`,
`/dashboard/inventory`, `/dashboard/settings`, `/dashboard/complete-profile`,
`/dashboard/clients`, plus a dashboard-wide search bar hitting
`GET /api/dashboard/search?q=`). The exact full top-level sidebar item list wasn't
enumerated this pass — ⚠️ UNVERIFIED, read `DashboardLayout.tsx` directly if a business
companion app is in scope. **Recommendation**: treat the business/operator surface as
a v2 concern (see build order in `11-mobile-implementation-notes.md`) — a first mobile
release should focus on the consumer nav above.

### Header (desktop web, not directly relevant to mobile)
Not traced this pass — the mobile-web bottom nav above is the correct reference per the
task's own instruction to prefer the mobile-web layout.

## Proposed Expo Router navigation tree

```
app/
├─ (auth)/                      # stack, no tab bar — shown when signed out
│  ├─ choice.tsx                # ~ /auth (customer vs business)
│  ├─ login.tsx                 # ~ /auth/user|business/login, role param
│  ├─ signup.tsx                # ~ /auth/user|business/signup
│  ├─ forgot-password.tsx
│  ├─ verify-code.tsx
│  └─ reset-password.tsx
│
├─ (tabs)/                      # bottom tab bar — mirrors BottomNav exactly
│  ├─ index.tsx                 # Home  ~ /
│  ├─ search/
│  │  ├─ index.tsx              # Search ~ /search (business directory)
│  │  └─ [id].tsx               # ~ /businesses/[id]
│  ├─ activity/
│  │  ├─ index.tsx              # ~ /activity  (requires auth — else show sign-in prompt)
│  │  └─ tickets/[id].tsx       # ~ /activity/tickets/[id]
│  └─ profile/
│     ├─ index.tsx              # ~ /dashboard (or a consumer profile home if business dashboard stays web-only)
│     ├─ edit.tsx                # ~ /dashboard/profile
│     ├─ my-bookings.tsx        # ~ /dashboard/my-bookings
│     └─ settings.tsx           # ~ /dashboard/settings
│
├─ events/
│  ├─ index.tsx                 # ~ /events (could also live inside (tabs) as a 5th tab — see open question below)
│  └─ [slug]/
│     ├─ index.tsx              # ~ /events/[id]
│     └─ checkout.tsx           # modal — the 3-step EventCheckOut flow
│
├─ deals/
│  ├─ index.tsx                 # ~ /deals
│  └─ [id].tsx                  # ~ /deals/[id]
│
├─ bookings/
│  └─ ...                       # ~ /bookings — multi-step booking flow, likely its own stack
│
├─ checkout/
│  └─ receipt/[id].tsx          # ~ /checkout/receipt/[id] — reached only via nav param/secure-store, not a public deep link (see 03-screens.md)
│
└─ legal/
   ├─ privacy.tsx
   └─ terms.tsx
```

❓ **Open question for the team**: the web nav has no dedicated "Events" or "Deals" tab
— they're reached via the Home feed or deep links. Should the app add them as explicit
tabs (a 5-6 item tab bar) for discoverability, or keep the web's minimal 4-tab
structure and surface Events/Deals from the Home feed the same way the website does?
This is a product decision, not something the code answers — logged in
`99-open-questions.md`.

## Deep link patterns (website URL → app route)

| Website URL | App route |
|---|---|
| `whaustralia.com/events/:slug` | `whaapp://events/:slug` → `app/events/[slug]/index.tsx` |
| `whaustralia.com/deals/:id` | `whaapp://deals/:id` |
| `whaustralia.com/businesses/:id` | `whaapp://search/:id` |
| `whaustralia.com/activity/tickets/:id` | `whaapp://activity/tickets/:id` (requires the user to be signed in on-device; if not, land on sign-in then redirect) |
| `whaustralia.com/verify-email?token=...` | Handle as a **universal/app link**, not a custom scheme, since this URL is emailed to users who may not have the app installed — must gracefully fall back to opening the mobile web page if the app isn't installed. Same for password-reset links. |
| `whaustralia.com/auth?tab=login` (post-signup redirect target on web) | Not a deep link target — the app should just navigate internally after its own signup flow. |

Configure both a custom scheme (`whaapp://`) for internal/already-installed-app links
and Expo's universal links (`associatedDomains` in `app.json`) for links that originate
from email or being shared before the recipient necessarily has the app — the
email-based flows (email verification, password reset, ticket confirmation) are the
ones most likely to be opened by someone without the app installed yet, so those
specifically need the web-fallback behavior, not just the custom scheme.
