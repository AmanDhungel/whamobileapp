# Reusable UI Component Catalog

Two layers exist: **`components/ui/*`** — shadcn/ui primitives (Radix UI headless
components + Tailwind styling, `class-variance-authority` for variants) — and
**composite/business components** built on top of them throughout `components/**`.
This file covers both, with a React Native equivalent for each.

## Primitive layer (`components/ui/*`)

| Component | File | Purpose | Variants/props | RN equivalent |
|---|---|---|---|---|
| `Button` | `button.tsx` | The one button component used everywhere | variant: `default \| outline \| ghost \| destructive`; size: `default \| sm \| lg \| icon`; `asChild` (Radix `Slot`, renders as its child, e.g. a `Link`). **Pill-shaped** (`rounded-full`), `active:scale-95` press feedback, disabled → `opacity-50 pointer-events-none`. Colors: default = navy fill/white text, inverts on hover; outline = white fill/navy border, inverts on hover; ghost = transparent/navy, 10%-opacity navy on hover; destructive = red fill, inverts on hover. | `Pressable` + `Animated.View` (scale 0.95 on `pressIn`) wrapping `Text`; hover-invert has no RN equivalent — use the same base colors but drop the invert-on-interaction behavior, or use it as the pressed-state color instead |
| `Badge` | `badge.tsx` | Small status/label pill | variant: `default \| secondary \| destructive \| outline \| ghost \| link` | `View`+`Text` styled pill; no direct RN component |
| `Input` | `input.tsx` | Text field | standard HTML input wrapper | `TextInput` |
| `Textarea` | `textarea.tsx` | Multi-line text | | `TextInput` with `multiline` |
| `Label` | `label.tsx` | Form field label | | `Text` |
| `Select` | `select.tsx` | Dropdown select (Radix Select) | | `@react-native-picker/picker`, or a custom bottom-sheet picker (more common in RN apps) |
| `Checkbox` | `checkbox.tsx` | | | `expo-checkbox` or a custom `Pressable` + icon |
| `Switch` | `switch.tsx` | Toggle | used for e.g. "Show remaining tickets" setting | RN `Switch` |
| `Toggle` / `ToggleGroup` | `toggle.tsx`, `toggle-group.tsx` | Segmented control | | a custom segmented-control (no first-party RN one) |
| `Card` | `card.tsx` | Bordered/shadowed content container | pairs with the `.card`/`.card-lg` CSS classes | `View` with the `shadows.card` token from `01-design-system.md` |
| `Dialog` | `dialog.tsx` | Centered modal (Radix Dialog) | used for "View Invoice", confirmations | RN `Modal` (`transparent`, `animationType="fade"`) or a bottom-sheet library |
| `AlertDialog` | `alert-dialog.tsx` | Confirmation modal with explicit Cancel/Action buttons | used for the Attendees "Are you sure you want to change status of {buyer} to {status}?" confirmation and event-archive confirmation | RN `Modal` styled as a confirm dialog, or `Alert.alert` for the simplest cases (though `Alert.alert` can't show rich content) |
| `Drawer` | `drawer.tsx` | Bottom-sheet-style panel (`vaul` under the hood) | | `@gorhom/bottom-sheet` — the de facto RN equivalent |
| `DropdownMenu` (+ `Sub`/`SubTrigger`/`SubContent`) | `dropdown-menu.tsx` | Contextual action menu, opened from a trigger button, supports nested submenus | used for per-row actions (Orders: View/Print/Send Invoice/Download Tickets; "Generate Sales Report" submenu: CSV/PDF) | no hover in RN — use an action sheet (`expo-router`'s modal, or a library like `react-native-action-sheet`) triggered by press; nested menus become a second sheet or a grouped list |
| `Popover` | `popover.tsx` | Small floating panel anchored to a trigger | | a custom absolutely-positioned `View`, or a bottom sheet on mobile (anchored popovers are a poor mobile pattern) |
| `Tooltip` | `tooltip.tsx` | Hover-triggered hint (wraps the whole app via `TooltipProvider` in `app/layout.tsx:51`) | | no RN equivalent for hover — drop, or replace with a press-and-hold hint / inline help text |
| `Tabs` | `tabs.tsx` | Tabbed content switcher | used for Upcoming/Live/Past event filters, Manage Event's sidebar sections | a top segmented control (or RN's own tab navigator if the tabs represent full navigational state) |
| `Table` (+`Header`/`Body`/`Row`/`Cell`/`Head`) | `table.tsx` | Data table | used extensively in the business dashboard (Orders, Attendees, Clients, Bookings) | not a mobile-native pattern — convert to a `FlatList` of cards, each card showing the same fields stacked vertically |
| `Pagination` | `pagination.tsx` | Page-number controls | | infinite-scroll (`FlatList`'s `onEndReached`) is the standard RN substitute |
| `Carousel` (+ `Content`/`Item`/`Previous`/`Next`) | `carousel.tsx` | Swipeable item carousel (Embla under the hood) | used for the ticket QR-code carousel (one slide per ticket) | RN `FlatList` with `horizontal pagingEnabled`, or `react-native-reanimated-carousel` |
| `Calendar` | `calendar.tsx` | Date picker grid (`react-day-picker`) | | `react-native-calendars` |
| `DateTime` | `date-time.tsx` | Combined date+time picker | | `@react-native-community/datetimepicker` |
| `Command` | `command.tsx` | Command-palette-style searchable list (`cmdk`) | | a searchable `FlatList` with a `TextInput` header — RN has no command-palette convention |
| `Avatar` (+`Image`/`Fallback`) | `avatar.tsx` | Profile picture with initials fallback | | RN `Image` + a `Text` fallback view, or `expo-image` |
| `Skeleton` | `skeleton.tsx` | Loading placeholder (pulsing block) | e.g. `EventDetailsSkeleton`, the receipt page's `ReceiptSkeleton` | a `View` with an animated opacity pulse (`Animated.loop`), or a library like `react-native-skeleton-placeholder` |
| `Progress` | `progress.tsx` | Progress bar | | RN `View` with an animated width, or `react-native-progress` |
| `ScrollArea` | `scroll-area.tsx` | Styled scroll container | | `ScrollView` (native scrollbars are the default on RN anyway) |
| `InputOTP` | `input-otp.tsx` | Segmented one-time-code input | used for the 6-digit email verification code | `react-native-otp-textinput` or a custom row of single-char `TextInput`s |
| `Breadcrumb` / `DynamicBreadCrumb` | `breadcrumb.tsx`, `DynamicBreadCrumb.tsx` | Path trail | dashboard-only | not a mobile pattern — use a back button + screen title instead |
| `Separator` | `separator.tsx` | Divider line | | `View` with a 1px background |
| `Sonner` (`Toaster`) | `sonner.tsx` | Toast notifications (rendered globally, `app/layout.tsx:55`) | every mutation success/error in this codebase calls `toast.success(...)`/`toast.error(...)` | `react-native-toast-message` or Expo's own toast pattern |
| `FavoriteButton` | `favorite-button.tsx` | Heart icon toggle | wraps `useCreateFavroite` | a `Pressable` `Heart` icon with optimistic toggle |
| `CardSlider` / `SponsorSlider` | `card-slider.tsx`, `sponsor-slider.tsx` | Horizontal promotional card carousels (landing page) | | `FlatList horizontal` |
| `LocationFormFiled` | `LocationFormFiled.tsx` | Address/location autocomplete input | pairs with `components/ResuableComponents/LocationSearch` | a places-autocomplete component — `react-native-google-places-autocomplete` if Google Places is introduced, or a simpler city/suburb picker if the app only needs coarse location |
| `LogoutDialog` | `LogoutDialog.tsx` | "Are you sure you want to log out?" confirm | | `AlertDialog` RN equivalent above |
| `DynamicDeleteButton` (`DeleteConfirmDialog`) | `DynamicDeleteButton.tsx` | Generic "delete this?" confirm+action button | ⚠️ noted as currently unused in at least one screen (`ManageEventPage.tsx` imports it but doesn't render it — dead import, not a real UI gap) | same RN confirm-dialog pattern |

## Composite / business components (representative — not exhaustive)

These live under `components/<Domain>/*` and compose the primitives above with
data-fetching hooks. Patterns worth carrying into the app 1:1 since they encode real
UX decisions made this session:

### `StepIndicator` (inline in `components/Stripe/EventCheckOut.tsx`)
A 2-or-3-step progress indicator using **icons, not numerals** (Ticket/User/CreditCard
via lucide-react), each step a filled circle (navy when current, green with a
checkmark when completed, gray outline when upcoming), connected by a line that fills
green as steps complete. Steps differ for guest (3: Tickets/Details/Checkout) vs.
signed-in (2: Tickets/Checkout — Details is skipped). **RN**: a `View` row of circular
icon badges + connecting `View` lines; trivial to port directly since it's pure
presentational logic driven by a `step` number.

### Checkout modal steps (`TicketsStep` / `GuestDetailsStep` / `CheckoutStep`)
Three sub-components (not separately exported, defined inline in `EventCheckOut.tsx`)
implementing the flow described in `03-screens.md`. Key behavioral details to
replicate exactly: quantity steppers cap at both per-option `remaining` and the event's
`max_tickets_per_request`; the hold countdown is a `mm:ss` countdown text inside an
amber banner; the Pay button shows a spinner and is disabled for the *entire* span from
tapping Pay through both the Stripe confirmation AND the backend finalize call (not
just the Stripe part) to prevent double-submission — this was a deliberate fix this
session, don't regress it in the RN port.

### `ManageEventPage` sidebar-section pattern
A left rail of collapsible sections (`Orders/Refunds`, `Manage attendees`, `Reports`),
each containing one or more tab items; a red dot renders on a section's rail entry when
any tab under it currently has a form-validation error (this exact indicator pattern
also exists on the **event create/edit form**, `EventsForm.tsx`, sidebar). **RN**: a
collapsible `SectionList`/accordion; the red-dot-on-error pattern is just a derived
boolean per section (`hasErrorsInSection = errorFieldNames.some(f => section.fields.includes(f))`).

### Ticket/invoice PDF builders
Three near-identical implementations exist (`TicketDetailPage.tsx`,
`GuestTicketReceiptPage.tsx`, and a bulk version in `ManageEventPage.tsx`) building a
per-ticket PDF (jsPDF, 100×160mm "ticket" page size, WHA logo top-right, title, date,
venue, a QR image captured from an already-rendered `<QRCodeCanvas>` via
`canvas.toDataURL()`, holder name, "Ticket X of Y · {type}", and the raw ticket code
printed in monospace beneath the QR) and a separate A4 invoice PDF (itemized lines,
service fee, surcharge, promo code, total, a "non-refundable fees" footnote). **These
were deliberately kept as three separate, lightly-duplicated implementations rather
than one shared utility**, to avoid refactor risk on already-working code — a mobile
build has no such constraint and should implement this once as a shared PDF-builder
function taking a plain data object, since RN has no direct DOM/canvas equivalent for
"read back a rendered QR as an image" (see `08-integrations-and-third-party.md`'s QR
code note for the RN-appropriate approach — generate the QR image data directly rather
than rendering-then-capturing).

### Recovery dialog pattern (`components/Event/SingleEventPage.tsx`)
When a payment succeeds but the backend finalize call fails for a recoverable reason
(missing guest info because a session silently expired), the UI shows a **second,
minimal modal** — not a generic error toast — asking only for the missing info, then
retries the *same* PaymentIntent. This "never strand a successful charge" principle
should be treated as a hard requirement for the mobile checkout flow too, not just a
web nicety.

### Sales report generation (`ManageEventPage.tsx`)
Client-side-only report builder producing both CSV (manual string-building +
`Blob`/`URL.createObjectURL` download) and PDF (`jspdf-autotable`) from data already in
memory (no dedicated report API endpoint). RN has no `Blob`/`<a download>` — see
`11-mobile-implementation-notes.md` for the file-save equivalent
(`expo-file-system` + `expo-sharing`).
