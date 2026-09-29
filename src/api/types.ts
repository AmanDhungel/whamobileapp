// API types. Source of truth: docs/mobile/04-api-reference.md.
// Where the docs don't spell out a shape (the mobile `user` object), the type is
// transcribed from the backend source it cites — noted inline.

// ─── Envelopes ──────────────────────────────────────────────────────────────────

/** Every /api/mobile/v1/* route (server/lib/mobileResponse.ts). */
export type MobileErrorCode = "ACCOUNT_BLOCKED" | "ACCOUNT_NOT_FOUND" | "TOKEN_INVALID";

export interface MobileEnvelope<T> {
  data: T | null;
  error: { message: string; code: MobileErrorCode | null } | null;
  meta: Record<string, unknown> | null;
}

export interface Pagination {
  total_number: number;
  count: number;
  per_page: number;
  current_page: number;
  last_page: number;
}

/** Most pre-existing (non-mobile) routes — services/apitypes.ts. Not universal. */
export interface ApiResponseType<T> {
  status: number;
  message: string;
  error: string | null;
  data: T;
  pagination?: Pagination;
}

/** Ad hoc legacy auth-route success shape, e.g. `{ message, success }`. */
export interface LegacyMessageResponse {
  message: string;
  success?: boolean;
}

// ─── Mobile auth ────────────────────────────────────────────────────────────────

export type Platform = "ios" | "android";
export type AccountCategory = "user" | "business" | "super-admin";

/**
 * The `user` object every mobile auth route returns. Not spelled out in
 * 04-api-reference.md — transcribed from server/lib/authUser.ts (`toAuthUser`).
 * Note `id`, not `_id`.
 */
export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  image?: string;
  category: AccountCategory;
  business_name?: string;
  business_category?: string;
  business_type?: "employee_based" | "item_based" | null;
  city_name?: string;
  community_name?: string;
  location?: string;
  phone_number?: string;
  emailVerified?: string | null; // Date serialized as ISO string
  isblocked: boolean;
  verified: boolean;
  googleId?: string | null;
  appleId?: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  /** Seconds until the access token expires (900 = 15 min). */
  expiresIn: number;
}

export interface AuthSession extends AuthTokens {
  user: AuthUser;
}

/** /auth/register 201 when the account was created but tokens couldn't be issued. */
export interface RegisterFallback {
  user: AuthUser;
  tokens: null;
}

export type RegisterResponse = AuthSession | RegisterFallback;

interface DeviceFields {
  deviceId?: string;
  platform?: Platform;
}

export interface LoginRequest extends DeviceFields {
  email: string;
  password: string;
  category: "user" | "business";
}

/** Sent as multipart FormData — see src/api/auth.ts. */
export interface RegisterUserRequest extends DeviceFields {
  name: string;
  email: string;
  password: string;
  accpetalltermsandcondition: boolean; // (sic) — backend field name
  image?: UploadFile;
}

export interface RefreshRequest extends DeviceFields {
  refreshToken: string;
}

export interface LogoutRequest {
  refreshToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  code: string;
  password: string;
}

export interface SocialSignInRequest extends DeviceFields {
  idToken: string;
  provider: "google" | "apple";
  /** Apple only — its id_token never carries a name. */
  name?: string;
}

export interface GuestIdentityRequest extends DeviceFields {
  name: string;
  email: string;
  phone: string;
}

export interface MessageData {
  message: string;
}

export interface SuccessData {
  success: true;
}

export interface MeData {
  user: AuthUser;
}

// Legacy (non-mobile) auth routes still used by the mobile flows.
export interface EmailRequest {
  email: string;
}

export interface EmailCodeRequest {
  email: string;
  code: string;
}

/** A local file for multipart upload (expo-image-picker asset → RN FormData part). */
export interface UploadFile {
  uri: string;
  name: string;
  type: string;
}

/** Sent as multipart FormData — see registerBusiness() in src/api/auth.ts. */
export interface RegisterBusinessRequest extends DeviceFields {
  business_name: string;
  phone_number: string;
  business_category: string;
  location: string;
  latitude?: number;
  longitude?: number;
  is24_7: boolean;
  schedule: WeekSchedule;
  community: string[];
  /** 3–10 images; the first becomes `image` (cover), the rest venue_image_0..8. */
  images: UploadFile[];
  name: string;
  email: string;
  password: string;
  accpetalltermsandcondition: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Public read models (Phase B).
//
// Typed from the LIVE API (read-only GETs against whaustralia.com, 2026-09-29) where
// production had data, otherwise from the route handlers in the website repo — see
// docs/mobile/04-api-reference.md "Phase B — shapes discovered".
//
// PUBLIC FIELDS ONLY. Several public endpoints currently return entire User documents
// including bcrypt password hashes, tokens and emails (a backend leak, reported).
// Those fields are deliberately NOT declared, so nothing in the app can read them.
// ═══════════════════════════════════════════════════════════════════════════════

export type ObjectId = string;
export type ISODateString = string;
/** "YYYY-MM-DD" — event dateRange and ticket option release/close dates are plain strings. */
export type DateOnlyString = string;
/** "HH:mm", 24-hour. */
export type TimeString = string;

/** The plain `{ data, message }` shape most pre-existing read routes use. */
export interface DataResponse<T> {
  data: T;
  message?: string;
}

// ─── Businesses (User documents with category "business") ─────────────────────

export type WeekdayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export interface DaySchedule {
  open: boolean;
  slots: { from: TimeString; to: TimeString }[];
}

/** Stored on the business itself at signup (User.schedule). */
export type WeekSchedule = Record<WeekdayKey, DaySchedule>;

/** Separate OperatingHours document — preferred over `schedule` when present. Live-verified. */
export interface OperatingHours {
  _id: ObjectId;
  business_id: ObjectId;
  is24_7: boolean;
  schedule: {
    day: string; // "Monday" … "Sunday"
    isOpen: boolean;
    openTime: TimeString;
    closeTime: TimeString;
    _id?: ObjectId;
  }[];
}

/** Employee — only the fields the public page shows (contact details are omitted). */
export interface Employee {
  _id: ObjectId;
  full_name: string;
  employee_photo?: string;
  is_active?: boolean;
}

/** Service (server/models/Service.model.ts). Not live-verified: production has none yet. */
export interface Service {
  _id: ObjectId;
  business_id: ObjectId | { _id: ObjectId };
  name: string;
  description?: string;
  category?: string;
  base_price: number; // AUD
  base_duration: number; // minutes
  service_type?: "employee_based" | "resource_based" | "group_session";
  is_active: boolean;
  assigned_employees?: (Employee | ObjectId)[];
}

/** List/card shape — /api/business, /api/landing `business`. Live-verified. */
export interface BusinessSummary {
  _id: ObjectId;
  name?: string;
  business_name?: string;
  business_category?: string;
  business_type?: "employee_based" | "item_based" | null;
  city?: string;
  city_name?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  community?: string[];
  image?: string;
  venue_images?: string[];
  portfolio_images?: string[];
  is24_7?: boolean;
  schedule?: WeekSchedule | null;
  verified?: boolean;
  isSponsor?: boolean;
  seo_keywords?: string[];
  seo_description?: string;
  /** Present on /api/business and /api/landing (matched by the business-name slug). */
  reviews?: Review[];
  /** /api/business only. */
  services?: Service[];
  /** Metres — only returned when a geo search (lat/lng or city) is active. */
  distance?: number;
  createdAt?: ISODateString;
}

/**
 * GET /api/business/single/[slug] (slug = business_name lowercased, non-alphanumerics
 * stripped — NOT the _id; an _id returns 500). Live-verified.
 */
export interface BusinessDetail extends BusinessSummary {
  phone_number?: string;
  /** Queried by _id server-side, but reviews are stored by slug → usually empty. Use /api/review. */
  review: Review[];
  hours: OperatingHours | null;
  event: EventSummary[];
  deal: Deal[];
  services: Service[];
  employees: Employee[];
}

// ─── Reviews ────────────────────────────────────────────────────────────────────

/** Populated reviewer — public fields only (the API also leaks email/phone). */
export interface ReviewAuthor {
  _id: ObjectId;
  name?: string;
  image?: string;
  business_name?: string;
}

/** Live-verified (GET /api/review?business_id=<slug>). */
export interface Review {
  _id: ObjectId;
  /** The business-name slug, not an ObjectId. */
  business_id: string;
  /** Populated on GET; a bare ObjectId in POST/PATCH responses. */
  user: ReviewAuthor | ObjectId;
  rating: number; // 1–5
  comment: string; // 10–500 chars
  business_reply?: { text: string; replied_at: ISODateString } | null;
  replies?: {
    _id: ObjectId;
    user: ObjectId | ReviewAuthor;
    text: string;
    created_at: ISODateString;
  }[];
  created_at: ISODateString;
  updated_at?: ISODateString;
}

export interface ReviewsResponse {
  message: string;
  count: number;
  data: Review[];
}

export interface CreateReviewRequest {
  business_id: string; // slug
  rating: number;
  comment: string;
}

export interface UpdateReviewRequest {
  rating?: number;
  comment?: string;
}

export interface ReviewMutationResponse {
  message: string;
  data: Review;
}

// ─── Events ─────────────────────────────────────────────────────────────────────
// Production has 0 events, so these are typed from server/models/Event.model.ts and
// the route handlers, not a live response. `promo_codes` is returned publicly by
// /api/event/getallevent (leak) and intentionally not declared.

export type EventPriceCategory = "registration" | "paid" | "external";

export interface EventOption {
  _id?: ObjectId;
  name?: string;
  release_date?: DateOnlyString | null;
  close_date?: DateOnlyString | null;
  price?: number | null;
  capacity?: number | null;
  sold?: number | null;
  /** Actively reserved but unpaid (ticket holds). */
  held?: number | null;
}

/** single-event populates `user` with "email business_name city location image" (email omitted). */
export interface EventHost {
  _id: ObjectId;
  business_name?: string;
  name?: string;
  city?: string;
  location?: string;
  image?: string;
}

/** /api/event/getallevent, /api/landing `upcomingevents`, business `event[]`. */
export interface EventSummary {
  _id: ObjectId;
  title: string;
  slug?: string;
  description?: string;
  dateRange?: { from?: DateOnlyString; to?: DateOnlyString };
  startTime?: TimeString;
  endTime?: TimeString;
  venue?: string;
  location?: string;
  location_tba?: boolean;
  city?: string;
  category?: string;
  category_name?: string;
  community?: string;
  image?: string;
  latitude?: number;
  longitude?: number;
  price_category?: EventPriceCategory;
  ticket_link?: string | null;
  options?: EventOption[];
  registration_capacity?: number | null;
  registration_sold?: number | null;
  max_tickets_per_request?: number | null;
  show_remaining_tickets?: boolean;
  isSponsor?: boolean;
  archived?: boolean;
  /** Metres — geo searches only. */
  distance?: number;
  /** ObjectId on list routes; populated on single-event and landing. */
  user?: ObjectId | EventHost;
  createdAt?: ISODateString;
}

/** GET /api/event/single-event/[slug]. */
export interface EventDetail extends EventSummary {
  email?: string;
  phone_number?: string;
  website_link?: string;
  host_name?: string;
  support_details?: string;
  event_rules?: string;
  refund_policy?: string;
  reviews?: Review[];
}

// ─── Deals ──────────────────────────────────────────────────────────────────────

/** Populated deal owner — public fields only (the API populates the full user doc). */
export interface DealBusiness {
  _id: ObjectId;
  business_name?: string;
  name?: string;
  image?: string;
  location?: string;
  city?: string;
}

/** /api/deals/get-all, /api/deals/single-deal/[_id]. Live-verified. */
export interface Deal {
  _id: ObjectId;
  title: string;
  description?: string;
  valid_till: ISODateString;
  city?: string;
  category?: string;
  terms_for_the_deal?: string;
  deals_for?: string;
  max_redemptions?: number;
  current_redemptions?: number;
  image?: string;
  price: number;
  discount_percentage: number;
  user: DealBusiness | ObjectId;
  createdAt?: ISODateString;
}

// ─── Landing (GET /api/landing?city=) — live-verified ──────────────────────────

export interface LandingData {
  /** Next 5 upcoming events (not filtered by city). */
  upcomingevents: EventSummary[];
  /** Returned but not rendered by the website home page. */
  deals: Deal[];
  /** Up to 20 businesses, filtered by city when given, with `reviews`. */
  business: BusinessSummary[];
  /** (sic) Sponsored events + businesses. Not rendered by the website. */
  sponser: (EventSummary | BusinessSummary)[];
}

// ─── Favorites (/api/favroite — sic) ────────────────────────────────────────────

/** A business is favourited as "User". */
export type FavoriteItemType = "Event" | "Deal" | "User" | "Service";

export interface FavoritesData {
  events: EventSummary[];
  deals: Deal[];
  services: Service[];
  business: BusinessSummary[];
}

export interface ToggleFavoriteRequest {
  item_id: ObjectId;
  item_type: FavoriteItemType;
}

export interface ToggleFavoriteResponse {
  success: boolean;
  is_favorited: boolean;
  message: string;
}

// ─── Tickets (GET /api/tickets) ─────────────────────────────────────────────────
// Three document types merged into one array with NO discriminator field — the
// website tells them apart by shape (components/Dashboard/Ticket/ticket-utils.ts).
// The QR value for each ticket is the raw code string.

export type TicketStatus = "pending" | "verified";

/** Deal claim. Codes: "WHA-DEAL-XXXXXXXX" (free) or "WHA-DEAL-XXXXXXXX-1of3" (paid). */
export interface DealRedemptionTicket {
  _id: ObjectId;
  deal: Deal;
  uniqueKeys: string[];
  verifiedKeys?: string[];
  status: TicketStatus;
  verifiedAt?: ISODateString;
  createdAt: ISODateString;
}

/** Free-event registration. Code: "WHA-EVT-XXXXXXXX". */
export interface EventRegistrationTicket {
  _id: ObjectId;
  event: EventSummary;
  uniqueKey: string;
  status: TicketStatus;
  verifiedAt?: ISODateString;
  createdAt: ISODateString;
}

export interface EventTicketLineItem {
  optionId: ObjectId;
  optionName: string;
  quantity: number;
  unitPrice: number;
  uniqueKeys: string[];
}

/** Paid ticket purchase. Codes: "WHA-<EVENT-TITLE>-XXXXXXXX". */
export interface EventTicketPurchaseTicket {
  _id: ObjectId;
  event: EventSummary;
  items: EventTicketLineItem[];
  uniqueKeys: string[];
  verifiedKeys: string[];
  verifiedTimestamps: { key: string; verifiedAt: ISODateString }[];
  promoCode?: string;
  invoiceNumber: string;
  ticketTotal: number;
  serviceFee: number;
  surcharge: number;
  totalAmount: number;
  status: TicketStatus;
  verifiedAt?: ISODateString;
  createdAt: ISODateString;
}

export type TicketItem = DealRedemptionTicket | EventRegistrationTicket | EventTicketPurchaseTicket;

// ─── Profile ────────────────────────────────────────────────────────────────────

/** PATCH /api/user/update (bearer OK). Sets BOTH fields — always send the current image. */
export interface UpdateProfileRequest {
  name: string;
  image?: string;
}

/** POST /api/edit-profile (cookie-only today). At least one field is required. */
export interface EditProfileRequest {
  phone_number?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
}

/** POST /api/upload-profile-pic, FormData field `file` (cookie-only today). Also sets user.image. */
export interface UploadProfilePicResponse {
  message: string;
  success: boolean;
  data: { url: string };
}

// ─── Ticket checkout (Phase C) ──────────────────────────────────────────────────
// Typed from the route handlers: app/api/mobile/v1/event/ticket/price,
// server/lib/eventTicketPricing.ts, app/api/event/ticket/{hold,hold/release,purchase}.

export interface TicketCartItem {
  optionId: ObjectId;
  quantity: number;
}

/** POST /api/mobile/v1/event/ticket/price (guests allowed). Creates a NEW PaymentIntent every call. */
export interface TicketPriceRequest {
  eventId: ObjectId;
  items: TicketCartItem[];
  promoCode?: string;
  /** The server releases this PaymentIntent's hold before re-pricing. */
  previousPaymentIntentId?: string;
}

export interface PricedLineItem {
  optionId: ObjectId;
  name: string;
  quantity: number;
  /** Per-ticket price after any promo discount (AUD, unrounded). */
  unitPrice: number;
  originalPrice: number;
  discounted: boolean;
}

/** Authoritative server pricing — the app only formats these, never computes them. */
export interface TicketPricing {
  clientSecret: string;
  paymentIntentId: string;
  invoiceNumber: string;
  items: PricedLineItem[];
  ticketTotal: number;
  serviceFee: number;
  surcharge: number;
  totalToPay: number;
  promoApplied: boolean;
}

/** POST /api/event/ticket/hold — idempotent per paymentIntentId (doesn't reset the timer). */
export interface TicketHoldRequest {
  eventId: ObjectId;
  items: TicketCartItem[];
  paymentIntentId: string;
}

export interface TicketHoldResponse {
  success: boolean;
  /** 5 minutes after the hold was created. */
  expiresAt: ISODateString;
}

export interface GuestInfo {
  name: string;
  email: string;
  phone: string;
}

/** POST /api/event/ticket/purchase — idempotent per paymentIntentId. */
export interface TicketPurchaseRequest {
  eventId: ObjectId;
  paymentIntentId: string;
  /** Required when not signed in (else 400 code GUEST_INFO_REQUIRED). */
  guestInfo?: GuestInfo;
}

export interface PurchaseReceipt {
  /** Buyer's account name, or "Ticket Holder" (always on idempotent replays). */
  holderName: string;
  event: {
    title: string;
    image?: string;
    venue?: string;
    location?: string;
    dateRange?: { from?: DateOnlyString; to?: DateOnlyString };
    latitude?: number;
    longitude?: number;
    slug?: string;
    startTime?: TimeString;
    endTime?: TimeString;
  };
  items: { optionName: string; uniqueKeys: string[]; quantity: number; unitPrice: number }[];
  invoiceNumber: string;
  ticketTotal: number;
  serviceFee: number;
  surcharge: number;
  totalAmount: number;
  promoCode?: string;
  createdAt: ISODateString;
}

export interface TicketPurchaseResponse {
  success: boolean;
  purchaseId: ObjectId;
  invoiceNumber: string;
  items: { optionName: string; codes: string[] }[];
  /** Web-cookie auto-login only — always false for bearer (app) callers. */
  signedIn: boolean;
  receipt: PurchaseReceipt;
}
