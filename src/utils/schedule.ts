import type { WeekdayKey, WeekSchedule } from "@/api/types";

import { formatTime } from "./format";

// Ported from components/Auth/BusinessSignupPage.tsx (DAYS, TIME_OPTS, DEFAULT_SCHEDULE
// and the toggleDay/addSlot/removeSlot/updateSlot helpers).

export const WEEK_DAYS: { key: WeekdayKey; short: string; long: string }[] = [
  { key: "mon", short: "Mon", long: "Monday" },
  { key: "tue", short: "Tue", long: "Tuesday" },
  { key: "wed", short: "Wed", long: "Wednesday" },
  { key: "thu", short: "Thu", long: "Thursday" },
  { key: "fri", short: "Fri", long: "Friday" },
  { key: "sat", short: "Sat", long: "Saturday" },
  { key: "sun", short: "Sun", long: "Sunday" },
];

export const MAX_SHIFTS_PER_DAY = 2;
const DEFAULT_SHIFT = { from: "09:00", to: "18:00" };
const EXTRA_SHIFT = { from: "18:00", to: "21:00" };

/** Every 30 minutes, "00:00" … "23:30", labelled "12:00 AM" … "11:30 PM". */
export const TIME_OPTIONS: { value: string; label: string }[] = Array.from(
  { length: 48 },
  (_, i) => {
    const h = Math.floor(i / 2);
    const m = i % 2 === 0 ? "00" : "30";
    const value = `${String(h).padStart(2, "0")}:${m}`;
    return { value, label: formatTime(value) ?? value };
  },
);

/** Mon–Fri open 09:00–18:00, weekend closed. */
export function defaultSchedule(): WeekSchedule {
  return Object.fromEntries(
    WEEK_DAYS.map(({ key }, i) => [
      key,
      i < 5 ? { open: true, slots: [{ ...DEFAULT_SHIFT }] } : { open: false, slots: [] },
    ]),
  ) as WeekSchedule;
}

export function toggleDay(s: WeekSchedule, day: WeekdayKey): WeekSchedule {
  const opening = !s[day].open;
  return { ...s, [day]: { open: opening, slots: opening ? [{ ...DEFAULT_SHIFT }] : [] } };
}

export function addShift(s: WeekSchedule, day: WeekdayKey): WeekSchedule {
  if (s[day].slots.length >= MAX_SHIFTS_PER_DAY) return s;
  return { ...s, [day]: { ...s[day], slots: [...s[day].slots, { ...EXTRA_SHIFT }] } };
}

export function removeShift(s: WeekSchedule, day: WeekdayKey, index: number): WeekSchedule {
  const slots = s[day].slots.filter((_, i) => i !== index);
  return { ...s, [day]: { open: slots.length > 0, slots } };
}

export function updateShift(
  s: WeekSchedule,
  day: WeekdayKey,
  index: number,
  field: "from" | "to",
  value: string,
): WeekSchedule {
  const slots = s[day].slots.map((slot, i) => (i === index ? { ...slot, [field]: value } : slot));
  return { ...s, [day]: { ...s[day], slots } };
}
