# Open Questions and Unverified Facts

Every `⚠️ UNVERIFIED` / `❓ OPEN QUESTION` from the doc set, grouped by priority.
"Blocker" = would cause the mobile team to build the wrong thing if assumed rather
than confirmed. "Important" = affects design/scope decisions but has a safe default.
"Nice to know" = worth asking, doesn't block starting work.

## 🔴 Blocker

1. **Bookings have no working online-payment path.** `app/api/checkout-session/route.ts`
   computes price from a hardcoded `basePrice = 50.0` and its paired webhook creates a
   *differently-shaped* `Booking` document than the live `POST /api/bookings` path,
   which itself never calls Stripe at all (creates the booking as
   `payment_status: "pending"`). Is booking payment intentionally deferred to
   in-person/elsewhere, or is this an incomplete web feature? This determines whether
   the mobile bookings flow needs a payment step at all. — `04-api-reference.md`,
   `06-features-and-business-logic.md`
2. **`/api/inventory` (referenced by `services/inventory.service.ts`) was not found**
   among the 107 routes enumerated via `app/api/**/route.ts`. Either the path is
   actually nested somewhere not matched by that glob, the feature is unused/dead
   client code, or it errors in production today. Needs a direct check before building
   any mobile inventory/category screen. — `04-api-reference.md`
3. ~~Which endpoint powers a consumer's own "my bookings" list?~~ **Resolved**:
   confirmed `GET /api/bookings/user` (list) and `PATCH /api/bookings/user/[id]` with
   `{action:"cancel"}` (cancel), via `components/Dashboard/UserBookings/UserBookings.tsx:755,774-777`.
   — `04-api-reference.md`
4. **CORS / cross-origin access is entirely unconfigured** (`next.config.ts` has no
   headers/CORS setup). A mobile app calling the API from a different origin than the
   web app expects may hit issues depending on how the hosting platform handles this by
   default. Needs explicit confirmation/config, not an assumption. — `12-mobile-gap-report.md`

## 🟠 Important

5. **`app/whaglobals.css`** (imported at `app/globals.css:466`) was not read in this
   pass — it may define additional design tokens not captured in
   `01-design-system.md`. Read it before finalizing the RN `theme.ts`.
6. **The `font-urbanist`/`text-urbanist-*` utility classes in `app/globals.css:543-619`
   appear to be dead CSS** — no `--font-urbanist` CSS variable is ever defined
   (`app/layout.tsx` only loads Quicksand and Inter). Confirm before assuming Urbanist
   is a real brand font. — `01-design-system.md`
7. **`NEXTAUTH_URL` vs. `NEXT_PUBLIC_APP_URL`** — both env vars exist; unclear which is
   canonical for building absolute links (e.g. in emails, deep links). —
   `00-README.md`
8. **`/super-admin` (`app/super-admin/page.tsx`) renders the exact same `Dashboard`
   component as `/dashboard`** — almost certainly a copy-paste bug/placeholder rather
   than intended behavior. Don't model the mobile super-admin surface (if built at all)
   on this route. — `03-screens.md`
9. **`/search` and `/search/[id]` appear to duplicate `/businesses` and
   `/businesses/[id]`** (same `SingleBusinessPage` component rendered from two URL
   families). Confirm which is canonical, or whether both are intentionally kept for
   different link contexts, before deciding the app's route naming. —
   `03-screens.md`, `10-navigation-map.md`
10. **Three routes touch profile data** (`GET/PATCH /api/user/profile`,
    `POST /api/user/update`, `POST /api/edit-profile`) with no obvious documentation of
    which owns what. Read all three before wiring the mobile profile-edit screen. —
    `05-auth-and-user.md`
11. **`isblocked` enforcement layer not traced** — a `/blocked` page and an `isblocked`
    boolean exist; which layer (client redirect? API 403?) actually enforces it wasn't
    confirmed this pass. — `05-auth-and-user.md`
12. **`AuthGuard`'s `category === "none"` check** (`SessionWrapper.tsx:24-30`) doesn't
    correspond to any value in `Auth.model.ts`'s own `category` enum
    (`"user"|"business"|"super-admin"`) — likely unreachable/dead logic, or the enum
    is incomplete. Confirm before replicating this specific redirect in the app's own
    guard logic. — `05-auth-and-user.md`
13. **Deal redemption's `paymentIntentId`/`quantity` fields** (`RedeemCodeType`,
    `services/redeemandverify.service.ts:6-12`) imply some deals can be paid for, not
    just free-redeemed — the actual `/api/deals/redeem` route logic wasn't traced to
    confirm whether this reuses the event-ticket Stripe/hold pattern. —
    `04-api-reference.md`, `06-features-and-business-logic.md`
14. **`/api/deals/redeem/multiple` vs. a `quantity` param on the single-redeem
    endpoint** — unclear whether these are redundant or serve genuinely different
    cases. — `04-api-reference.md`
15. **Dark mode reachability** — `next-themes` is a dependency and `.dark` CSS variables
    are fully defined, but no theme-toggle UI was found in the components sampled this
    session. Confirm whether dark mode should ship in the mobile app's v1. —
    `01-design-system.md`
16. **`/dashboard/favorite` vs. `/favorites`** and **`/dashboard/tickets` vs.
    `/activity`** — each pair looks like it may be two screens for the same concept
    (one under the "business dashboard" URL prefix, one standalone). Confirm which is
    canonical before building duplicate app screens. — `03-screens.md`
17. **Full business-dashboard sidebar nav item list** wasn't enumerated (only
    inferred from route constants in `DashboardLayout.tsx` and the Manage-Event-specific
    `NAV_SECTIONS`). Needed only if a business-operator companion app is in scope. —
    `10-navigation-map.md`
18. **Footer / contact details / social links** were not traced. Needed for an
    "About/Contact" screen. — `09-content-and-copy.md`
19. **Whether Mailtrap is a testing sandbox or the real production email sender** —
    Mailtrap's core product is an email-testing tool; if it's still just a sandbox in
    production, real users aren't receiving ticket/password-reset emails today. Worth
    confirming given how much of the auth flow depends on email delivery. —
    `08-integrations-and-third-party.md`

## 🟢 Nice to know

20. Whether the mobile app needs analytics/tracking from day one, and which provider —
    none exists in the current web codebase to carry over. — `08-integrations-and-third-party.md`
21. No Australian-specific format validators (postcode, ABN checksum) were found in the
    zod schemas read this pass — confirm none exist elsewhere before assuming free-text
    is acceptable for those fields. — `07-forms-and-validation.md`
22. The Sanatan Samaj vertical (`/api/sanatansamaj/*`) was not traced at all — confirm
    whether it's in scope for a first mobile release. — `04-api-reference.md`
23. Exact response shapes for several admin-scoped routes (employees, resources,
    clients, the categories/inventory naming overlap) weren't traced line-by-line —
    lower priority since these are business/operator surfaces, likely v2. —
    `04-api-reference.md`
24. `lib/ratelimit.ts` (a second, seemingly-unused `Ratelimit` instance separate from
    `proxy.ts`'s own) — confirm whether anything actually imports it, or it's dead
    code. — `08-integrations-and-third-party.md`
25. `/v2.0` route (`app/v2.0/page.tsx`) — purpose unclear, possibly a WIP/preview
    page. — `03-screens.md`
26. "Please login to buy tickets" toast copy in `SingleEventPage.tsx` appears stale —
    guest checkout no longer requires login on at least the ticket-purchase path, so
    this specific message/gate may be leftover from before that feature shipped. —
    `09-content-and-copy.md`
27. Cost-factor inconsistency: bcrypt hashing uses cost 12 at signup but cost 10 at
    password reset (`app/api/auth/update-password/route.ts:24`) — functionally
    harmless (both are secure), just inconsistent; not worth fixing for mobile
    purposes but noted. — `05-auth-and-user.md`
