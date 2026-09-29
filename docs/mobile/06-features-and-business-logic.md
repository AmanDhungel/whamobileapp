# Features and Business Logic

## Event ticketing — pricing, holds, and purchase

**Files**: `app/actions/eventTicketStripe.tsx` (Server Action), `app/api/event/ticket/hold/route.ts`,
`app/api/event/ticket/hold/release/route.ts`, `app/api/event/ticket/purchase/route.ts`,
`server/lib/ticketHold.ts`, `server/models/TicketHold.model.ts`.

### Pricing (always re-derived server-side — never trust a client-supplied amount)
```
serviceFee  = totalQuantity * $2.00                         // flat per ticket, AUD
ticketTotal = Σ (unitPrice_i * quantity_i)                  // unitPrice already promo-discounted per line
surcharge   = (ticketTotal + serviceFee) * 0.025             // 2.5% card processing surcharge
totalToPay  = ticketTotal + serviceFee + surcharge
```
A promo code discounts `unitPrice` by `discount_percentage`% on every option in
`applicable_options` (or *every* option in the cart if `applicable_options` is empty).
The finalize route compares the actual Stripe `paymentIntent.amount` (in cents) against
`Math.round((ticketTotal+serviceFee+surcharge)*100)` and rejects on any mismatch — the
app must always re-fetch the authoritative price rather than compute and send its own.

### Ticket holds (5-minute reservation)
When a buyer reaches the payment step, the app must call `POST /api/event/ticket/hold`
with the cart — this atomically checks `capacity - sold - held >= quantity` per option
inside a Mongo transaction and increments `held` (a separate counter from `sold`, so
availability messaging can distinguish "sold out" from "temporarily held by someone
mid-checkout"). The hold is tied to a Stripe `paymentIntentId` and is:
- **Idempotent** — calling it again with the same `paymentIntentId` returns the
  existing hold unchanged rather than resetting the 5-minute timer (important: retries
  from network flakiness on the client must not silently extend someone's hold
  indefinitely).
- **Released** explicitly (`POST /api/event/ticket/hold/release`, `{paymentIntentId}`,
  no auth required — the ID itself is the bearer secret) when the user closes the
  checkout UI, or **automatically expires** via `TicketHold`'s TTL index PLUS a lazy
  "sweep expired holds" step that runs at the top of the pricing action and the
  purchase route (since there's no cron infrastructure in this app — MongoDB's TTL
  background reaper isn't instant, so code paths that read live availability actively
  reclaim expired holds first rather than waiting for it).
- **Re-priced re-holds**: applying/changing a promo code creates a *new* PaymentIntent
  (price changed), which releases the old hold and re-holds under the new
  `paymentIntentId` — the client must pass `previousPaymentIntentId` when re-pricing so
  the old hold doesn't leak.
- Availability messaging distinguishes three states the app should replicate exactly:
  fully sold out (`capacity - sold <= 0`), temporarily unavailable due to others' active
  holds (`capacity - sold - held < requested`, but `capacity - sold > 0`), and available.

### Purchase finalization
`POST /api/event/ticket/purchase` is **idempotent by `paymentIntentId`** (checked
*before* anything else, including the guest-info requirement — a deliberate ordering
fix this session, so a retry after a recoverable error never fails just because the
retry no longer carries the same session/guest info). Inside one Mongo transaction it:
consumes the hold (`held -= qty`, `sold += qty`) or falls back to a raw capacity
recheck if the hold expired right as payment completed (so a successful charge is never
left without inventory), generates one unique ticket code per ticket
(`WHA-<EVENT-SLUG>-<8 hex chars>`, uppercased), creates the `EventTicketPurchase`
document, and increments the matched promo code's `used` counter. After the
transaction commits, it sends the confirmation email and — only as the very last,
independently-failure-isolated step — attempts to auto-sign-in a new/passwordless guest
account. **A failure in that last step must never turn an already-successful purchase
into an error response** (a real production bug fixed this session: the auto-login step
used to be able to throw and mask a completed sale).

### Guest checkout
Buying without an account: collected `guestInfo{name,email,phone}` is looked up by
email; an **existing password-protected account is never auto-signed-into** (security
boundary — only a brand-new or already-passwordless account gets the auto-login
cookie). Mirror this exactly in the mobile flow: a guest checkout must never be able to
take over someone else's password-protected account.

### Case-insensitive ticket codes and per-code check-in timestamps
Ticket codes are matched case-insensitively at verification time (legacy mixed-case
data is normalized on read) — the mobile scanner UI (if built) should not assume exact
string matching. Each ticket's check-in time is tracked individually
(`verifiedTimestamps: [{key, verifiedAt}]`) rather than one shared `verifiedAt` on the
whole purchase — changing one ticket's status must never alter another ticket's
displayed check-in time.

## Event archiving rules (business-side)

An event can only be archived (`POST /api/event/archive/[id]`) once it has **ended**,
and only if it's safe to do so given ticket sales — the exact rule established this
session: if even one ticket has been sold, the event cannot be archived until it ends;
once ended, it can always be archived regardless of sales. Separately, editing an
event's date range can never move the **end date earlier** than its previously-saved
end date (prevents accidentally shortening a live event out from under buyers).
Editing an event must **merge** `options[].sold` and `promo_codes[].used` by `_id`
rather than overwrite the whole array — a bug fixed this session where a naive save
reset real sales counters to 0.

## Service bookings

**Files**: `app/api/bookings/lock/route.ts`, `app/api/bookings/route.ts`,
`app/api/bookings/available-slots/route.ts`.

Three service "shapes", each with different capacity logic (`Service.service_type`):
- **`employee_based`**: a specific employee is booked; overlap is checked against that
  employee's existing bookings (with a per-service `buffer_time` added to the blocked
  window) — `POST /api/bookings/route.ts:189-207`.
- **`resource_based`** (no employee, has `max_concurrent_bookings`): capacity is
  tracked as "peak concurrent quantity" across the requested time window — the route
  walks every booking/lock touch-point in the window and computes the maximum
  simultaneous allocation, rejecting if it would exceed `max_concurrent_bookings`
  (`route.ts:208-273`). This is a non-trivial algorithm — port it exactly rather than
  approximating, since an approximation could either over- or under-sell capacity.
- **`group_session`** (`allow_multiple_bookings` + `max_bookings_per_slot`): capacity
  is a simple count of bookings+locks at the exact same `start_time` for that employee
  (`route.ts:169-188`).
- Per-employee **service price/duration overrides** (`employee.service_overrides`) are
  applied if present, multiplied by the requested `multiplier` (e.g. "extended
  session ×2").
- `is_one_time_booking` services auto-deactivate (`is_active: false`) once their
  capacity is reached, so they stop appearing as bookable.
- Flow: `available-slots` (read) → `lock` (short-lived hold, mirrors the ticket-hold
  pattern conceptually, backed by `BookingLock` with its own `expires_at`) → `bookings`
  POST (consumes the lock, re-validates everything server-side, creates the booking as
  `payment_status: "pending"`).
- ⚠️ **No online payment currently happens in this path** (see the `checkout-session`
  dead-code flag in `04-api-reference.md`) — bookings are created "pending" and
  (presumably) settled in person or by some other unobserved mechanism.
  ❓ OPEN QUESTION for the team before building mobile payment for bookings.

## Deals

Businesses set `discount_percentage`, `max_redemptions`, `valid_till`. Redemption
(`POST /api/deals/redeem`) generates a `uniqueKey`; a `paymentIntentId`/`quantity` on
the request body suggests some deals can also be *paid for* (not just discount codes
redeemed at zero cost) — ⚠️ UNVERIFIED whether this reuses the same Stripe pattern as
event tickets or something else; read `app/api/deals/redeem/route.ts` directly before
building deal-purchase in the app.

## Client-side state to replicate

- **City filter**: `contexts/city-filter-context.tsx` — a persistent, app-wide selected
  city that scopes most list/search queries (landing, events, businesses, deals). In
  RN, back this with Zustand + `AsyncStorage` persistence (non-sensitive preference,
  `AsyncStorage` is fine here unlike auth tokens).
  the current server-state cache; on RN use the same library (`@tanstack/react-query`)
  directly — no need to re-architect this part.
- **Auth-modal open state**: a global "please log in" modal triggered from many places
  (`components/Auth/DialogLogin/use-auth-model.ts`) — port as a simple global
  boolean/store rather than prop-drilling.
- **Cart/checkout ephemeral state** (selected quantities, promo input, hold
  countdown) lives in local component state, not global store — fine to keep local in
  RN too, scoped to the checkout screen/stack.

## Edge cases explicitly handled in the code (carry these over)

- A charge succeeding but finalize failing (network blip, expired session) must offer
  recovery, never a dead end — see `02-components.md`'s recovery-dialog note.
- Retrying a finalize call with the same `paymentIntentId` after a partial failure is
  always safe (idempotent) and must not double-charge or double-issue tickets.
- Promo code re-application mid-checkout must release the stale hold, not leak it.
- A guest's auto-login must never hijack an existing password-protected account.
- Manually reverting a ticket's status to "pending" clears its check-in date.
- Archiving/date-editing rules above must be enforced both client-side (good UX) and
  are also enforced server-side (the real security boundary) — don't skip server
  validation in a rush to ship the RN screen.
