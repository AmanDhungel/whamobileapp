import { z } from "zod";

import type { BusinessEvent, EventPriceCategory, UploadFile } from "@/api/types";
import { prepareImagesForUpload } from "@/services/imageUpload";

// Business event create/edit — transcribed from the web's EventsForm.tsx (zod schema
// L51-167, superRefine L126-166, submit L438-479). Error copy is verbatim; where the web
// relies on zod's default text (dates, image) the copy below is ours.
// Values are kept as strings like the web form; buildEventFormData() turns them into the
// multipart body both POST /api/event and PATCH /api/event/edit/[id] read.

export const EVENT_CATEGORIES = [
  "Concert",
  "Festival",
  "Educational Seminar",
  "Cultural Event",
  "Food Event",
  "Others",
] as const;

export const PRICE_CATEGORY_OPTIONS: { value: EventPriceCategory; label: string }[] = [
  { value: "registration", label: "Free With Registration" },
  { value: "paid", label: "Paid" },
  { value: "external", label: "External Ticket" },
];

export const MAX_TICKET_OPTIONS = 5;
export const MAX_PROMO_CODES = 5;
/** Web: Event Image max 3 MB — moot here, photos are re-encoded to ~0.3 MB before upload. */

const option = z.object({
  _id: z.string().optional(),
  name: z.string(),
  release_date: z.string(),
  close_date: z.string(),
  price: z.string(),
  capacity: z.string(),
});
export type EventOptionValues = z.infer<typeof option>;

const promo = z.object({
  _id: z.string().optional(),
  code: z.string(),
  discount_percentage: z.string(),
  limit: z.string(),
  applicable_options: z.array(z.string()),
});
export type PromoCodeValues = z.infer<typeof promo>;

const isCompleteOption = (o: EventOptionValues) =>
  !!o.name.trim() && !!o.release_date && o.price.trim() !== "" && o.capacity.trim() !== "";

export const eventFormSchema = z
  .object({
    // Basic Info
    title: z
      .string()
      .min(2, "Title is required")
      .regex(/^[a-zA-Z0-9\s]+$/, "Special characters are not allowed"),
    /** A picked photo, or the existing image URL when editing. */
    image: z.custom<UploadFile | string | null>((v) => !!v, "Event image is required"),
    category: z.string().min(1, "Category is required"),
    category_name: z.string(),
    description: z.string().min(10, "Description must be at least 10 characters"),
    event_rules: z.string(),
    refund_policy: z.string(),
    // Date & Location
    dateFrom: z.string().min(1, "Please pick the event dates"),
    dateTo: z.string(),
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string(),
    location_tba: z.boolean(),
    venue: z.string(),
    location: z.string(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    // Pricing
    price_category: z.enum(["registration", "paid", "external"]),
    ticket_link: z.string(),
    registration_capacity: z.string(),
    options: z.array(option).max(MAX_TICKET_OPTIONS, "You can add up to 5 options"),
    // Promo Code
    promo_codes: z.array(promo).max(MAX_PROMO_CODES, "You can add up to 5 promo codes"),
    // Host Details
    host_name: z.string(),
    email: z.union([z.literal(""), z.email("Invalid email address")]),
    phone_number: z.string(),
    website_link: z.string(),
    support_details: z.string(),
    // Settings
    max_tickets_per_request: z.string(),
    show_remaining_tickets: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (!v.location_tba) {
      if (v.location.trim().length < 2) {
        ctx.addIssue({ code: "custom", path: ["location"], message: "Location is required" });
      }
      if (v.venue.trim().length < 2) {
        ctx.addIssue({ code: "custom", path: ["venue"], message: "Venue is required" });
      }
    }
    if (v.price_category === "paid" && !v.options.some(isCompleteOption)) {
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: "Add at least one complete ticket option (name, release date, price, capacity)",
      });
    }
    if (v.price_category === "external" && v.ticket_link.trim().length < 3) {
      ctx.addIssue({
        code: "custom",
        path: ["ticket_link"],
        message: "Ticket link is required for external ticketing",
      });
    }
  });

export type EventFormValues = z.infer<typeof eventFormSchema>;

/** Web edit rule (EventsForm L418-436) — the server rejects it too, with its own copy. */
export const END_DATE_EARLIER_MESSAGE =
  "End date cannot be earlier than the event's current end date.";

// ─── Wizard steps (web SECTIONS / SECTION_FIELDS) ─────────────────────────────────

export type EventFormStep = "basic" | "location" | "pricing" | "promo" | "host" | "settings";

export const EVENT_FORM_STEPS: {
  key: EventFormStep;
  label: string;
  fields: (keyof EventFormValues)[];
}[] = [
  {
    key: "basic",
    label: "Basic Info",
    fields: [
      "title",
      "image",
      "category",
      "category_name",
      "description",
      "event_rules",
      "refund_policy",
    ],
  },
  {
    key: "location",
    label: "Date & Location",
    fields: [
      "dateFrom",
      "dateTo",
      "startTime",
      "endTime",
      "venue",
      "location_tba",
      "location",
      "latitude",
      "longitude",
    ],
  },
  {
    key: "pricing",
    label: "Pricing",
    fields: ["price_category", "options", "registration_capacity", "ticket_link"],
  },
  { key: "promo", label: "Promo Code", fields: ["promo_codes"] },
  {
    key: "host",
    label: "Host Details",
    fields: ["email", "phone_number", "website_link", "host_name", "support_details"],
  },
  {
    key: "settings",
    label: "Settings",
    fields: ["max_tickets_per_request", "show_remaining_tickets"],
  },
];

export const EMPTY_OPTION: EventOptionValues = {
  name: "",
  release_date: "",
  close_date: "",
  price: "",
  capacity: "",
};

export const EMPTY_PROMO: PromoCodeValues = {
  code: "",
  discount_percentage: "",
  limit: "",
  applicable_options: [],
};

export function emptyEventForm(): EventFormValues {
  return {
    title: "",
    image: null,
    category: "",
    category_name: "",
    description: "",
    event_rules: "",
    refund_policy: "",
    dateFrom: "",
    dateTo: "",
    startTime: "",
    endTime: "",
    location_tba: false,
    venue: "",
    location: "",
    latitude: undefined,
    longitude: undefined,
    price_category: "paid",
    ticket_link: "",
    registration_capacity: "",
    options: [{ ...EMPTY_OPTION }],
    promo_codes: [],
    host_name: "",
    email: "",
    phone_number: "",
    website_link: "",
    support_details: "",
    max_tickets_per_request: "10",
    show_remaining_tickets: true,
  };
}

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));

/** Edit mode: an event from single-event-for-form → form values (ids kept). */
export function eventToForm(e: BusinessEvent): EventFormValues {
  const options = (e.options ?? []).map((o) => ({
    _id: o._id ? String(o._id) : undefined,
    name: str(o.name),
    release_date: str(o.release_date),
    close_date: str(o.close_date),
    price: str(o.price),
    capacity: str(o.capacity),
  }));
  return {
    ...emptyEventForm(),
    title: e.title ?? "",
    image: e.image ?? null,
    category: e.category ?? "",
    category_name: e.category_name ?? "",
    description: e.description ?? "",
    event_rules: e.event_rules ?? "",
    refund_policy: e.refund_policy ?? "",
    dateFrom: e.dateRange?.from ?? "",
    dateTo: e.dateRange?.to ?? "",
    startTime: e.startTime ?? "",
    endTime: e.endTime ?? "",
    location_tba: !!e.location_tba,
    venue: e.venue ?? "",
    location: e.location ?? "",
    latitude: typeof e.latitude === "number" ? e.latitude : undefined,
    longitude: typeof e.longitude === "number" ? e.longitude : undefined,
    price_category: e.price_category ?? "paid",
    ticket_link: e.ticket_link ?? "",
    registration_capacity: str(e.registration_capacity),
    options: options.length ? options : [{ ...EMPTY_OPTION }],
    promo_codes: (e.promo_codes ?? []).map((p) => ({
      _id: p._id ? String(p._id) : undefined,
      code: str(p.code),
      discount_percentage: str(p.discount_percentage),
      limit: str(p.limit),
      applicable_options: p.applicable_options ?? [],
    })),
    host_name: e.host_name ?? "",
    email: e.email ?? "",
    phone_number: e.phone_number ?? "",
    website_link: e.website_link ?? "",
    support_details: e.support_details ?? "",
    max_tickets_per_request: str(e.max_tickets_per_request ?? 10),
    show_remaining_tickets: e.show_remaining_tickets !== false,
  };
}

/**
 * Multipart body for POST /api/event and PATCH /api/event/edit/[id].
 * - Option / promo `_id`s are always sent, so edits keep their sold / used counters.
 * - Edit replaces the whole event (missing keys reset on the server), so every field is
 *   always sent — except venue/location while "To be announced": the edit route rejects
 *   an empty venue even then (web bug), so they're left out and stay as they were.
 * - A new photo is re-encoded and sent as a file; an unchanged image as its URL.
 */
export async function buildEventFormData(
  v: EventFormValues,
): Promise<{ form: FormData; uploadBytes: number }> {
  const form = new FormData();
  const put = (key: string, value: string) => form.append(key, value);

  put("title", v.title.trim());
  put("description", v.description.trim());
  put("category", v.category);
  put("category_name", v.category === "Others" ? v.category_name.trim() : "");
  put("event_rules", v.event_rules.trim());
  put("refund_policy", v.refund_policy.trim());

  put("dateRange", JSON.stringify({ from: v.dateFrom, to: v.dateTo || v.dateFrom }));
  put("startTime", v.startTime);
  put("endTime", v.endTime);
  put("location_tba", String(v.location_tba));
  if (!v.location_tba) {
    put("venue", v.venue.trim());
    put("location", v.location.trim());
    if (v.latitude !== undefined && v.longitude !== undefined) {
      put("latitude", String(v.latitude));
      put("longitude", String(v.longitude));
    }
  }

  put("price_category", v.price_category);
  put("ticket_link", v.price_category === "external" ? v.ticket_link.trim() : "");
  put(
    "registration_capacity",
    v.price_category === "registration" ? v.registration_capacity.trim() : "",
  );
  const paid = v.price_category === "paid";
  const options = paid
    ? v.options
        .filter(
          (o) =>
            o.name.trim() || o.price.trim() || o.capacity.trim() || o.release_date || o.close_date,
        )
        .map((o) => ({
          ...(o._id ? { _id: o._id } : {}),
          name: o.name.trim(),
          release_date: o.release_date,
          close_date: o.close_date,
          price: o.price.trim(),
          capacity: o.capacity.trim(),
        }))
    : [];
  const promos = paid
    ? v.promo_codes
        .filter((p) => p.code.trim() || p.discount_percentage.trim() || p.limit.trim())
        .map((p) => ({
          ...(p._id ? { _id: p._id } : {}),
          code: p.code.trim(),
          discount_percentage: p.discount_percentage.trim(),
          limit: p.limit.trim(),
          applicable_options: p.applicable_options,
        }))
    : [];
  put("options", JSON.stringify(options));
  put("promo_codes", JSON.stringify(promos));

  put("host_name", v.host_name.trim());
  put("email", v.email.trim());
  put("phone_number", v.phone_number.trim());
  put("website_link", v.website_link.trim());
  put("support_details", v.support_details.trim());

  put("max_tickets_per_request", v.max_tickets_per_request.trim() || "10");
  put("show_remaining_tickets", String(v.show_remaining_tickets));

  let uploadBytes = 0;
  if (typeof v.image === "string") {
    put("image", v.image);
  } else if (v.image) {
    const upload = await prepareImagesForUpload([v.image]);
    if (upload.files[0]) form.append("image", upload.files[0]);
    uploadBytes = upload.totalBytes;
  }
  return { form, uploadBytes };
}
