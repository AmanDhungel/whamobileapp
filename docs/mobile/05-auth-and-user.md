# Authentication and User Flows

## Summary

Auth is **NextAuth v4.24.13**, config at `app/api/auth/[...nextauth]/route.ts`, JWT
session strategy (no database session adapter — despite `@auth/prisma-adapter` being a
dependency, it is not wired into `authOptions` in the file read). Three providers:

| Provider id | Type | Used for |
|---|---|---|
| `google` | OAuth (`next-auth/providers/google`) | Both user and business sign-in; auto-creates a `category: "user"` account on first Google sign-in with no matching email (`route.ts:82-124`) — **business accounts cannot originate from Google sign-in**, only from the dedicated business signup form |
| `user-credentials` | Credentials (email+password) | Regular users. Looks up `User.findOne({ email, category: "user" })` (`route.ts:45-48`) |
| `business-credentials` | Credentials (email+password) | Business + super-admin accounts. Looks up `category: { $in: ["business","super-admin"] }` (`route.ts:66-69`) |

There is **no dedicated mobile/token auth today** — see the Blocker section below.

## Password storage and verification

- Hashed with **bcryptjs**, cost factor **12** at signup (`app/api/auth/user/signup/route.ts:45`,
  `.../business/signup/route.ts:55`), cost factor **10** at password reset
  (`app/api/auth/update-password/route.ts:24`) — ⚠️ inconsistent cost factor between
  signup and reset; not a blocker, just noted.
- Verified with `bcrypt.compare(plaintext, user.password)` in each Credentials
  provider's `authorize()` (`route.ts:50,71`).
- The `password` field is only `required` when `provider === "credentials"`
  (`server/models/Auth.model.ts:32-37`) — Google-originated and guest accounts have no
  password. `provider` enum: `"credentials" | "google" | "guest"`
  (`Auth.model.ts:42-46`).
- A mobile login endpoint should reuse this exact logic: find by `email` + `category`
  filter, `bcrypt.compare`, reject if no `password` field is set (Google/guest account).

## Session token shape (JWT)

The NextAuth JWT (`callbacks.jwt`, `route.ts:133-176`) carries, beyond the defaults
(`sub`, `email`, `name`, `iat`, `exp`, `jti`):

```ts
{
  mongodbId: string;       // the Mongo _id — this is what session.user.id resolves to
  googleId: string | null;
  category: "user" | "business" | "super-admin";
  business_name: string | undefined;
  image: string | undefined;
  city_name: string | undefined;
  community_name: string | undefined;
  emailVerified: Date | "" ;
  isblocked: boolean;
  verified: boolean;
  location: string;
  phone_number: string;
  business_type: "employee_based" | "item_based" | null;
}
```

On every token refresh where `user` isn't freshly provided (i.e. every request after
the first), the callback **re-reads the user from MongoDB by email** (`route.ts:155-173`)
so profile edits show up without forcing re-login. `session.user.id` is populated from
`token.mongodbId` in the `session` callback (`route.ts:178-195`). A manual
`update()` call from the client (NextAuth's `useSession().update()`) merges the passed
object directly into the token (`route.ts:150-152`) — used elsewhere in this codebase
to refresh the session after auto-login (see `components/Event/SingleEventPage.tsx`).

Cookie name: `next-auth.session-token`, or `__Secure-next-auth.session-token` if
`NEXTAUTH_URL` starts with `https://` (this exact logic is duplicated in
`server/lib/guestAuth.ts:40-43` for a manually-issued cookie — see Guest checkout
below). `secret: process.env.NEXT_AUTH_SECRET!` (`route.ts:78`) — note the underscore
placement differs from NextAuth's own default env var name `NEXTAUTH_SECRET`; this
project always sets it explicitly rather than relying on the default.

## Route protection — client-side only

There is **no root `middleware.ts`** enforcing auth (the only root-level "middleware"
equivalent, `proxy.ts`, does IP rate limiting only — see `08-integrations-and-third-party.md`).
Instead:
- `components/Auth/SessionWrapper.tsx` wraps the **entire app** (`app/layout.tsx:49`)
  in a client component (`AuthGuard`) that watches `useSession()` and redirects:
  `unauthenticated` + path starts with `/dashboard` → push `/auth`; `authenticated` +
  path starts with `/auth` → push `/dashboard`; `authenticated` + `category === "none"`
  (a state that doesn't appear in the schema's own enum — ⚠️ UNVERIFIED how a user
  actually reaches `category === "none"`, possibly dead logic) + not already on
  `/dashboard/complete-profile` → push there.
- This is a **UX redirect only** — the actual security boundary is each API route
  individually calling `getServerSession(authOptions)` and checking `session?.user`
  (65 of 107 routes do this — see `04-api-reference.md`). A client that skips the
  redirect (e.g. a raw `fetch` from a mobile app) gets a proper 401 from the API, so
  this is safe to reimplement purely as RN-navigator-level guarding.
- Role/category checks beyond "logged in or not" are done ad hoc, per-route, by
  comparing `session.user.category` (grep `category` in any `app/api/**/route.ts`) —
  there is no centralized role-permission table.
- `isblocked` (a boolean on the user, toggled by super-admin —
  `app/api/super-admin/business/block/[id]/route.ts`) and a `/blocked` page exist;
  ⚠️ UNVERIFIED exactly which layer checks `isblocked` and redirects there — grep
  found it referenced in `DashboardLayout.tsx` and the two SuperAdmin tables but the
  actual gate wasn't traced in this pass.

## Signup flow (user or business)

Both flows require an **email-verification code BEFORE the account is created** (this
is a different mechanism from the post-signup "verify your email" gate below — see the
note at the end of this section).

1. **`POST /api/auth/send-verification-code`** — body `{ email }`. Validates a basic
   email regex, checks `email` doesn't already belong to an existing account (400 if
   so), generates a 6-digit numeric code, upserts an `EmailVerification` document keyed
   by `email` (TTL 10 minutes via `expires_at` + `code`, `attempts: 0`), emails it via
   `sendSignupVerificationCode` (`lib/mail.ts`). Response `{ message, success: true }`.
2. **`POST /api/auth/verify-signup-code`** — body `{ email, code }`. Looks up the
   `EmailVerification` doc; rejects if missing/expired/5+ wrong attempts
   (`MAX_ATTEMPTS = 5`); on a wrong code, increments `attempts` and returns 400; on
   match, sets `verified: true` and extends `expires_at` by 30 minutes (giving the user
   time to finish the signup form). Response `{ message, success: true }`.
3. **`POST /api/auth/user/signup`** (user) or **`POST /api/auth/business/signup`**
   (business) — **multipart `FormData`**, not JSON (because of file uploads). Re-checks
   that a `verified: true`, unexpired `EmailVerification` exists for that email (400 if
   not — so step 2 is enforced server-side, not just client-side). Hashes the password
   (bcrypt, cost 12), uploads any image(s) to S3, creates the `User` doc with
   `provider: "credentials"` and `emailVerified: new Date()` (i.e. **the pre-signup
   code IS the email verification** — the account is created already "verified"),
   deletes the `EmailVerification` doc. Response `201` with
   `{ message, success: true, userId }`.
   - User signup fields: `name, email, password, accpetalltermsandcondition, image?`
     (`app/api/auth/user/signup/route.ts:13-16,47`).
   - Business signup fields (superset): adds `business_name` (must be globally unique —
     400 if taken), `business_type` (`"employee_based"|"item_based"`),
     `business_category`, `phone_number`, `city`, `location`, `is24_7`, `latitude`,
     `longitude`, `community` (JSON-encoded string array), `schedule` (JSON-encoded
     object), plus up to **9** `venue_image_{0..8}` files in addition to the main
     `image` (`app/api/auth/business/signup/route.ts:66-100`).
4. Client then calls NextAuth's `signIn("user-credentials", {...})` or
   `signIn("business-credentials", {...})` to actually log in — signup does not
   auto-issue a session itself.

⚠️ Note the two distinct verification systems in this codebase — do not conflate them:
- **Pre-signup code verification** (above): 6-digit code, `EmailVerification` collection,
  gates *account creation*.
- **Post-signup "verify your email" gate**: a magic-link token stored directly on the
  `User` document (`token`, `verificationTokenExpire` fields —
  `server/models/Auth.model.ts:74-75`), sent via `POST /api/send-email-verification`
  (generates a 32-byte hex token, 24h expiry, emails a link) and consumed by
  `GET /api/verify-email?token=...` (sets `emailVerified`/`verified: true`, clears the
  token). This is what backs the `EmailVerifyGate.tsx` "please verify your email, resend
  in 60s" UI seen elsewhere in this codebase, gating logged-in-but-unverified accounts
  from certain actions. Since credentials signup already sets `emailVerified` at
  creation time, this second gate mainly matters for accounts that reach an unverified
  state some other way (⚠️ UNVERIFIED exactly which — not traced this pass).

## Login flow

- **User**: `app/auth/user/login/page.tsx` → calls `signIn("user-credentials", { email, password, redirect: false })`. On success, NextAuth sets the session cookie and the client reads the updated session.
- **Business**: `app/auth/business/login/page.tsx` (pattern is
  `` signIn(`${loginType}-credentials`, {...}) `` established in the shared login
  component — same shape, `business-credentials` provider id).
- **Google**: a button calls `signIn("google", { redirect: false })` — **note**:
  NextAuth's client `signIn()` for any non-Credentials (OAuth) provider **always**
  navigates the browser to the provider's consent screen regardless of the `redirect`
  option; `redirect:false` only affects the *return* leg. This is an important
  web-specific detail with **no RN equivalent to blindly port** — see
  `05-auth-and-user.md`'s Recommended mobile approach below and `expo-auth-session`.
- Errors surface as `null` from `signIn()` (NextAuth swallows Credentials-provider
  `authorize()` failures into a generic failure) — the login form must show a generic
  "invalid email or password" message; the API does not expose *why* it failed (wrong
  password vs. no such account vs. Google-only account with no password) for security.

## Forgot / reset password

Three-step flow, **no NextAuth involvement** (plain REST, no session required):
1. **`POST /api/reset-password`** — body `{ email }`. Generates a 6-digit code,
   `resetPasswordExpire` = now + 10 minutes, saves onto the `User` doc (bypasses
   validators: `runValidators: false`), emails the code via `sendSimpleMail`. 404 if no
   user with that email.
2. **`POST /api/auth/verify-code`** — body `{ email, code }`. Confirms the code matches
   and hasn't expired; distinguishes "expired" vs "invalid" in the error message. Does
   **not** clear the code yet (that happens at step 3) — so this step is a pure
   pre-check the UI can call before showing the "set new password" screen.
3. **`POST /api/auth/update-password`** — body `{ email, code, password }`. Re-validates
   the code+expiry, hashes the new password (bcrypt, cost 10 — see note above), clears
   `resetPasswordToken`/`resetPasswordExpire`. Response `{ message }`.

## Email verification (post-signup gate)

See the note under Signup above. Two endpoints: `POST /api/send-email-verification`
(body `{ email }`, sends a link) and `GET /api/verify-email?token=...` (consumes it).
No rate limit beyond the global IP limiter (`proxy.ts`) — ⚠️ UNVERIFIED whether
resend-spam is otherwise prevented server-side (the 60-second client-side cooldown seen
in `EmailVerifyGate.tsx` this session is a **client-only** throttle, not enforced by the
API).

## Profile view/edit, account deletion

- `GET/PATCH /api/user/profile` and `POST /api/user/update`, `POST /api/edit-profile`
  — ⚠️ UNVERIFIED exact split of responsibility between these three (all session-gated,
  all touch the `User` doc); read each route file before building the mobile profile
  screen rather than assuming which one to call. Logged in `99-open-questions.md`.
- `POST /api/delete-profile` — session-gated; presumably deletes/deactivates the
  account. Not traced line-by-line this pass.
- `POST /api/upload-profile-pic` — multipart `FormData`, session-gated, uploads to S3,
  returns `{ url }`.

## Guest checkout auto-login (event tickets only)

A non-standard but important mechanism: when someone buys an event ticket **without**
being signed in, `app/api/event/ticket/purchase/route.ts` creates (or reuses) a `User`
document with `provider: "guest"` and — if that account has no password (i.e. it's
brand new, or was itself a passwordless Google/guest account) — **manually mints a
NextAuth-compatible session cookie** via `server/lib/guestAuth.ts:attachAutoLoginCookie()`,
using `next-auth/jwt`'s `encode()` with the exact same token shape the real
`jwt`/`session` callbacks expect, and sets it directly via `response.cookies.set(...)`.
This never happens for an existing **password-protected** account matched by email
(security boundary: never auto-login into an account you don't already own). For the
mobile app, this whole mechanism should be replaced by the proposed
`POST /api/mobile/auth/social`/guest-checkout-then-issue-JWT pattern in
`12-mobile-gap-report.md` — cookie-minting doesn't translate to a token-based client.

## Recommended mobile auth design

See `12-mobile-gap-report.md` for the full endpoint table with request/response types.
Summary of the approach:
- Add `POST /api/mobile/auth/login`, `/register`, `/refresh`, `/logout`,
  `/forgot-password`, `/reset-password`, `/social`, and `GET /api/mobile/me` under a new
  `/api/mobile/` namespace, reusing the **same** `User` model, bcrypt logic, and
  `EmailVerification` flow already in place — do not duplicate business rules, just
  expose them as bearer-token endpoints instead of cookie-setting ones.
- Issue a short-lived **access token** (JWT, e.g. 15-30 min) + a longer-lived
  **refresh token** (e.g. 30 days, stored server-side or as a signed opaque token) on
  login/register — mirroring `SESSION_MAX_AGE = 30 * 24 * 60 * 60` already used for the
  guest auto-login cookie (`server/lib/guestAuth.ts:5`) as the refresh lifetime.
- **Do not change `authOptions.secret`** — sign mobile tokens with the *same*
  `NEXT_AUTH_SECRET` (or a clearly-separate `MOBILE_JWT_SECRET` if the team prefers
  isolating blast radius) so both systems can be verified without adding a second
  secret-management surface, but keep the mobile token's *claims/shape* independent of
  NextAuth's own JWT so a change to one never silently breaks the other.
- Add a shared server-side helper, e.g. `getAuthUser(req)`, that first tries
  `getServerSession(authOptions)` (web) and falls back to verifying an
  `Authorization: Bearer <token>` header (mobile) — then swap every route's
  `getServerSession(authOptions)` call for this helper. This is mechanical but touches
  65 files; see the gap report for sequencing.
- Store tokens on-device with `expo-secure-store` (access + refresh token), never
  `AsyncStorage` (unencrypted) for anything auth-related.
- For Google sign-in from the app, use `expo-auth-session`'s Google provider to get an
  ID token on-device, then send it to `POST /api/mobile/auth/social` for the backend to
  verify against Google and either find-or-create the `User` exactly as
  `authOptions.callbacks.signIn` already does for web (`route.ts:82-124`) — reuse that
  logic rather than reimplementing it.
