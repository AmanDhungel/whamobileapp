# Forms and Validation

All forms use **react-hook-form + zod** (`@hookform/resolvers/zod`). Validation rules
below are transcribed from the schemas read this pass; forms not listed were not
opened — treat their rules as ⚠️ UNVERIFIED until read directly (grep for
`z.object(` in the relevant component before porting).

## Signup — user (`components/Auth/Signup.tsx:16-32`)
| Field | Type | Rules |
|---|---|---|
| `name` | string | min 2 chars — error: "Name is required" |
| `email` | email | `z.email()` — error: "Email is required" |
| `password` | string | min 6 chars — error: "Password must be at least 6 characters" |
| `cpassword` | string | min 6 chars, **must equal `password`** (cross-field `.refine`, error attached to `cpassword`) — error: "Passwords don't match" |
| `category` | enum | `"user" \| "business"` |
| `accpetalltermsandcondition` | boolean | must be `true` — error: "You must accept the Terms of Service" |

Submission is gated on a prior 6-digit email-verification code (see
`05-auth-and-user.md`) — `EmailVerifyGate` is imported into this same file, implying the
signup screen embeds the code-verification step inline rather than as a separate page.

## Signup — business (`components/Auth/BusinessSignupPage.tsx`)
Multi-step form (step 2 requires `business_name` + `phone_number` per the
`stepFields` map at line 139 — i.e. validation is applied per-step, not all at once).
Confirmed rule:
| Field | Type | Rules |
|---|---|---|
| `phone_number` | string | **exactly 10 characters** (`min(10)` and `max(10)`, no format/regex beyond length) — error: "Valid phone number required" |

Other business-signup fields (`business_name`, `business_type`, `business_category`,
`city`, `location`, `is24_7`, `community`, `schedule`, image uploads) exist per the API
route's accepted `FormData` fields (`04-api-reference.md`) but their exact zod rules
weren't read this pass — ⚠️ UNVERIFIED, check `BusinessSignupPage.tsx` directly.

## Login (`components/Auth/LoginPage.tsx:14`)
`email: z.email().min(1, "Email is required")` — password field rule not read this
pass (almost certainly a simple "required", not length-validated, since login doesn't
need to enforce a policy the account may predate).

## Guest checkout details (`components/Stripe/EventCheckOut.tsx`)
Not a zod schema — inline validation in `handleContinueFromDetails`:
- `name` and `phone`: non-empty after `.trim()` — error: "Please enter your full name and phone number."
- `email`: matches `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` — error: "Please enter a valid email address."
This exact pattern (and error copy) is duplicated in the payment-recovery dialog in
`components/Event/SingleEventPage.tsx` — keep both in sync if the rule ever changes.

## General patterns to replicate
- **Cross-field validation** (password confirmation, etc.) uses zod's `.refine()` at
  the object level with an explicit `path` so the error attaches to the right field —
  react-hook-form's `form.trigger(subsetFields)` does **not** reliably surface
  `.refine()`/`superRefine` issues in this codebase's experience this session; when
  porting to RN (e.g. with `react-hook-form` + zod again, which works identically on
  RN), prefer manual `form.setError()` for cross-field checks over relying on
  `trigger()` alone if validating a subset of fields (e.g. a multi-step wizard).
- **Multi-step forms** (business signup, the event create/edit form) validate a named
  subset of fields per step before allowing "Next", and show a persistent error
  indicator (a red dot) on any step/section containing an invalid field — see
  `02-components.md`'s sidebar-section pattern. Replicate both the per-step gating and
  the indicator, not just final-submit validation.
- **File uploads** go via native `FormData` + `multipart/form-data` (image fields
  appended directly to a `FormData` object, then posted with `Post<FormData,...>`,
  which skips the `Content-Type` header in `lib/action.ts:63,90` so the browser sets
  the multipart boundary itself). On RN, build the equivalent `FormData` with `{uri,
  name, type}` file objects from `expo-image-picker`/`expo-document-picker` — this is a
  close, direct port (see `11-mobile-implementation-notes.md`).

No Australian-specific format validators (postcode regex, ABN checksum, etc.) were
found in the schemas read this pass — `abn_number` and `city`/`location` fields appear
to be free-text with no client-side format enforcement observed. Flag as ⚠️ UNVERIFIED
rather than assuming none exists anywhere in the codebase.
