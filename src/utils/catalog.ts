import type { Feather } from "@expo/vector-icons";

// Static catalogues copied verbatim from the website — there are no APIs for these.

type IconName = keyof typeof Feather.glyphMap;

export interface CatalogItem {
  label: string;
  value: string;
  icon: IconName;
}

/** lib/data/services-catalog.ts AU_CITIES — the only cities the backend geo-resolves. */
export const AU_CITIES = [
  "Sydney",
  "Melbourne",
  "Brisbane",
  "Perth",
  "Canberra",
  "Adelaide",
  "Hobart",
  "Darwin",
] as const;
export type AuCity = (typeof AU_CITIES)[number];

/** lib/data/business-categories.ts EMPLOYEE_CATEGORIES (lucide icons → Feather equivalents). */
export const EMPLOYEE_CATEGORIES: CatalogItem[] = [
  { label: "Saloon / Barber", value: "barber", icon: "scissors" },
  { label: "Event Organizer", value: "event-organizer", icon: "calendar" },
  { label: "Travel & Tours", value: "travel and tours", icon: "send" },
  { label: "Food Truck", value: "food truck", icon: "truck" },
  { label: "Catering", value: "catering", icon: "gift" },
  { label: "Restaurant", value: "restaurant", icon: "coffee" },
  { label: "Cleaning", value: "cleaning", icon: "droplet" },
  { label: "Electrician", value: "electrician", icon: "zap" },
  { label: "Painter", value: "painter", icon: "edit-3" },
  { label: "Plumber", value: "plumber", icon: "tool" },
  { label: "Driving School", value: "driving school", icon: "navigation" },
  { label: "Consultancy", value: "consultancy", icon: "book-open" },
  { label: "Health & Wellness", value: "health", icon: "activity" },
  { label: "Wedding", value: "wedding", icon: "heart" },
  { label: "Social Club", value: "social club", icon: "users" },
  { label: "Automotive", value: "automotive", icon: "disc" },
  { label: "Removalists", value: "removalists", icon: "move" },
  { label: "Retail Shop", value: "retails", icon: "shopping-bag" },
  { label: "Others", value: "others", icon: "grid" },
];

/** ITEM_CATEGORIES — rental / inventory businesses. */
export const ITEM_CATEGORIES: CatalogItem[] = [
  { label: "Kayak Rentals", value: "kayak-rentals", icon: "wind" },
  { label: "Bike Rentals", value: "bike-rentals", icon: "compass" },
  { label: "Car Rentals", value: "car-rentals", icon: "key" },
  { label: "Ski Rentals", value: "ski-rentals", icon: "cloud-snow" },
  { label: "Camper Van Rentals", value: "camper-van-rentals", icon: "truck" },
  { label: "Boat Rentals", value: "boat-rentals", icon: "anchor" },
  { label: "Surfboard Rentals", value: "surfboard-rentals", icon: "sun" },
  { label: "Scooter Rentals", value: "scooter-rentals", icon: "navigation-2" },
  { label: "Equipment Rentals", value: "equipment-rentals", icon: "package" },
  { label: "Others", value: "others", icon: "grid" },
];

/** BUSINESS_CATEGORIES — both lists, de-duplicated by value (web behaviour). */
export const BUSINESS_CATEGORIES: CatalogItem[] = [
  ...EMPLOYEE_CATEGORIES,
  ...ITEM_CATEGORIES,
].filter((c, i, all) => all.findIndex((x) => x.value === c.value) === i);

export function categoryLabel(value?: string | null): string {
  if (!value) return "";
  const hit = BUSINESS_CATEGORIES.find((c) => c.value === value.toLowerCase());
  return hit?.label ?? value.charAt(0).toUpperCase() + value.slice(1);
}

export function categoryIcon(value?: string | null): IconName {
  return BUSINESS_CATEGORIES.find((c) => c.value === value?.toLowerCase())?.icon ?? "briefcase";
}

/** components/Event/EventFilter.tsx categories. */
export const EVENT_CATEGORIES = [
  { label: "All", value: "all" },
  { label: "Concert", value: "Concert" },
  { label: "Festival", value: "Festival" },
  { label: "Cultural Event", value: "Cultural Event" },
  { label: "Educational Seminar", value: "Educational Seminar" },
  { label: "Food Event", value: "Food Event" },
  { label: "Others", value: "Others" },
] as const;

/** components/Deal/DealFilter.tsx categories. */
export const DEAL_CATEGORIES = [
  { label: "All", value: "all" },
  { label: "Groceries", value: "Groceries" },
  { label: "Shopping", value: "Shopping" },
  { label: "Restaurant", value: "Restaurant" },
  { label: "Fashion", value: "Fashion" },
  { label: "Events", value: "Events" },
] as const;

/** ResuableComponents/FilterPanel.tsx community filter (events). "All" removes the param. */
export const FILTER_COMMUNITIES = [
  { label: "All", value: "" },
  { label: "Australian", value: "Australian" },
  { label: "Nepali", value: "Nepali" },
] as const;

/** components/Auth/BusinessSignupPage.tsx COMMUNITIES (max 3, or "Not Specified" alone). */
export const SIGNUP_COMMUNITIES = [
  "Nepali",
  "Indian",
  "Bhutanese",
  "Chinese",
  "Filipino",
  "Vietnamese",
  "Other Asian",
  "Middle Eastern",
  "African",
  "European",
  "Latin American",
] as const;
export const NOT_SPECIFIED = "Not Specified";
export const MAX_SIGNUP_COMMUNITIES = 3;

/** Website footer (components/LandingPage/LandingPage.tsx). */
export const SOCIAL_LINKS = {
  instagram: "https://www.instagram.com/whatshappening_australia",
  facebook: "https://www.facebook.com/whatshappeningaustralia",
  email: "mailto:info@whatshappeningaustralia.com",
} as const;
