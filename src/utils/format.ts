// Date/number formatting matching the website's card and detail formats. Implemented
// by hand (not Intl) so output is identical on every Hermes/device locale.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * Parses "YYYY-MM-DD" as a LOCAL date (the web's `new Date(str)` treats it as UTC,
 * which is the same calendar day in Australia) and full ISO strings normally.
 */
export function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Today as "YYYY-MM-DD" in local time (option release/close dates are compared as strings). */
export function todayDateOnly(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

/** Event card: "SAT, OCT 04" (web: en-US weekday/2-digit day/short month, uppercased). */
export function formatCardDate(value?: string | null): string | null {
  const d = parseDate(value);
  if (!d) return null;
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${pad2(d.getDate())}`.toUpperCase();
}

/** "dd MMM yyyy" → "04 Oct 2025". */
export function formatDate(value?: string | null): string | null {
  const d = parseDate(value);
  if (!d) return null;
  return `${pad2(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "dd MMM" → "04 Oct". */
export function formatDayMonth(value?: string | null): string | null {
  const d = parseDate(value);
  if (!d) return null;
  return `${pad2(d.getDate())} ${MONTHS[d.getMonth()]}`;
}

/** "EEEE, dd MMM yyyy" → "Saturday, 04 Oct 2025" (deal "Valid Until"). */
export function formatDateLong(value?: string | null): string | null {
  const d = parseDate(value);
  if (!d) return null;
  return `${WEEKDAYS_LONG[d.getDay()]}, ${pad2(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "October 4" (ticket rows). */
export function formatMonthDay(value?: string | null): string | null {
  const d = parseDate(value);
  if (!d) return null;
  return `${MONTHS_LONG[d.getMonth()]} ${d.getDate()}`;
}

/** Event date range: "04 Oct 2025" or "04 Oct 2025 - 06 Oct 2025"; null when unknown. */
export function formatDateRange(from?: string | null, to?: string | null): string | null {
  const start = formatDate(from);
  if (!start) return null;
  const end = formatDate(to);
  return end && end !== start ? `${start} - ${end}` : start;
}

/** "HH:mm" → "7:00 PM" (web: date-fns "h:mm aa"). */
export function formatTime(value?: string | null): string | null {
  if (!value) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!m) return null;
  const h = Number(m[1]);
  const suffix = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m[2]} ${suffix}`;
}

/** "7:00 PM - 10:00 PM" / "7:00 PM" / null. */
export function formatTimeRange(start?: string | null, end?: string | null): string | null {
  const s = formatTime(start);
  if (!s) return null;
  const e = formatTime(end);
  return e ? `${s} - ${e}` : s;
}

/** Metres → "850 m" / "3.2 km". */
export function formatDistance(metres?: number | null): string | null {
  if (typeof metres !== "number" || !Number.isFinite(metres)) return null;
  return metres < 1000 ? `${Math.round(metres)} m` : `${(metres / 1000).toFixed(1)} km`;
}

/** 12.5 → "$12.50". */
export function formatPrice(amount?: number | null): string {
  return `$${(amount ?? 0).toFixed(2)}`;
}

/** Minutes → "45 mins" / "1 hr 30 mins". */
export function formatDuration(minutes?: number | null): string | null {
  if (!minutes || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} mins`;
  return m ? `${h} hr ${m} mins` : `${h} hr`;
}

/** Web detail headers: "dashain NIGHT" → "Dashain Night". */
export function titleCase(text?: string | null): string {
  return (text ?? "").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function capitalize(text?: string | null): string {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

/** "a, b, c, d" → "a, b" (web deal card location). */
export function shortLocation(location?: string | null, parts = 2): string {
  return (location ?? "")
    .split(",")
    .slice(0, parts)
    .map((s) => s.trim())
    .filter(Boolean)
    .join(", ");
}

/** Seconds → "MM:SS" (web hold banner: padStart(2) minutes and seconds). */
export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`;
}
