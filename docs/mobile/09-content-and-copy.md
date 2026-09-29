# Content and Copy Inventory

Almost all copy in this codebase is **hardcoded in components**, not sourced from a
CMS or database (aside from actual business/event/deal data itself, which is
user/business-generated content, not "copy"). The mobile app should treat this as a
static string catalog to reimplement, not something to fetch from an API.

## App identity
- Product name: **"What's Happening Australia"** (`app/layout.tsx:32`), abbreviated
  **WHA** throughout the codebase and this doc set.
- ⚠️ Several page `<meta>` titles instead say **"What's Happening Canberra"**
  (`app/search/page.tsx:4`, `app/deals/page.tsx:4`, `app/events/page.tsx:4`) — the
  product appears to have started as a Canberra-specific app and expanded nationally;
  these are stale titles, not a second brand. Use "What's Happening Australia" as the
  canonical app name and flag the stale titles to the team.
- Meta description: "Discover events, local businesses, deals, and community news
  across Australia." (`app/layout.tsx:33-34`).

## Bottom nav labels
Home · Search · Activity · Profile (`components/ResuableComponents/BottomNavbar.tsx:9-12`).

## Checkout / ticketing copy (this session's work — verified exact strings)
- Step labels: **Tickets**, **Details**, **Checkout**.
- Modal title: "Complete Payment".
- Hold timer banner: "Your tickets are on hold for **{mm:ss}** — complete payment
  before time runs out."
- Guest details helper text: "We'll email your tickets here and use this to keep you
  signed in after checkout."
- Guest field errors: "Please enter your full name and phone number." /
  "Please enter a valid email address."
- Availability errors: `` `Only ${remaining} ${name} ticket(s) available right now` ``
  / `` `${name} tickets are not available right now` `` / "Those tickets are no longer
  available".
- Expired-hold toast: "Your ticket hold has expired. Please try again."
- Success toast: "Payment successful! Your tickets are ready."
- Payment-recovery dialog: title "Confirm your details"; body "Your payment went
  through successfully — we just need your details to send your tickets."; button
  "Get my tickets".
- Order summary labels: "Order Summary", "Service fee", "Order total", "Payment
  Surcharge", "Card processing surcharge (2.5%)", "Total to pay", "Incl. GST".
- Disclaimer: "Service and processing fees are non-refundable."
- Footer: "Secured by Stripe · End-to-end encrypted".
- Guest receipt banner: "You're all set, {name}!" / "Your payment was successful.
  Download your tickets and invoice below — this page won't be available again, but
  we've also emailed you a copy."
- Buy button label states: "Buy Tickets" → "Buy More Tickets" (after a purchase);
  mobile sticky bar: `` `Buy · From $${price}` `` → "Buy More"; "Sold Out"; "Get
  Tickets" (external ticket link); "Register" → "Already Registered" / "Fully Booked" /
  "Processing...".
- Ticket detail actions: "Download Ticket", "Download Invoice".
- Not-found states: "Ticket not found" / "This ticket may have been removed or the
  link is incorrect." (signed-in ticket page); "Receipt not available" / "This
  confirmation page is only available right after checkout. Check your email — we've
  sent a copy of your tickets and invoice there." (guest receipt page).

## Auth copy
- "Please login to buy tickets" / "Please login to get your ticket" (toasts shown when
  an unauthenticated action requires sign-in — note: ticket purchase itself no longer
  requires login, so this specific message is stale on at least one path — see
  `99-open-questions.md`).
- Signup terms checkbox: "You must accept the Terms of Service".
- Password rule messaging: "Password must be at least 6 characters" / "Passwords
  don't match".

## Business dashboard copy (this session's Manage Event work)
- Sidebar sections: "Orders/Refunds" → "Orders"; "Manage attendees" → "Attendees",
  "Scanning count"; "Reports" → "Analytics" (plus "Verify Tickets").
- Status-change confirmation: `` `Are you sure you want to change status of ${buyer} to ${status}?` ``.
- Report labels: "Earnings by Ticket Type", "Ticket Type", "Price Per Ticket",
  "Tickets Sold", "Promo Uses", "Discount Given", "Earnings", "Buyers Who Used a Promo
  Code", "Total Earnings (excl. service fee & surcharge)", "Generate Sales Report",
  "Download as CSV", "Download as PDF".
- Order row actions: "View Invoice", "Print Invoice", "Send Invoice", "Download
  Tickets".

## Legal pages
- `/privacy-policy`, `/terms-and-conditions`, `/terms-of-service` — all render via a
  shared `LegalLayout` component (`components/Legal/LegalLayout.tsx`). Full legal text
  was not extracted in this pass (long-form static content, not app-critical copy to
  inline here) — **link to these existing web pages from the app** (open in an
  in-app browser / `WebView`) rather than duplicating legal text, so updates to the
  legal copy don't require an app release.

## Footer / contact / social
Not traced this pass — ❓ OPEN QUESTION, check the landing page / footer component
directly for contact details and social links before building the app's "About/Contact"
screen.

## Content source: hardcoded vs. dynamic
| Content | Source |
|---|---|
| Nav labels, button text, toast/error copy, form labels | Hardcoded in components (as above) |
| Event/deal/business listings, reviews, notifications | Dynamic — from MongoDB via the API |
| Legal pages | Hardcoded (long-form JSX/markdown, not traced) |
| Landing page featured content | Dynamic, city-scoped (`GET /api/landing?city=`) |
