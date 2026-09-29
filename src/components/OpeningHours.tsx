import { StyleSheet, View } from "react-native";

import type { OperatingHours as OperatingHoursDoc, WeekSchedule } from "@/api/types";
import { theme } from "@/theme";
import { formatTime } from "@/utils/format";

import { Text } from "./Text";

const DAYS = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
] as const;

type Row = { day: string; value: string; open: boolean };

function rowsFromHours(hours: OperatingHoursDoc): Row[] {
  return DAYS.map(({ label }) => {
    const d = hours.schedule.find((s) => s.day.toLowerCase() === label.toLowerCase());
    const open = !!d?.isOpen;
    return {
      day: label,
      open,
      value: open
        ? `${formatTime(d?.openTime) ?? ""} – ${formatTime(d?.closeTime) ?? ""}`
        : "Closed",
    };
  });
}

function rowsFromSchedule(schedule: WeekSchedule): Row[] {
  return DAYS.map(({ key, label }) => {
    const d = schedule[key];
    const open = !!d?.open && d.slots.length > 0;
    return {
      day: label,
      open,
      value: open
        ? d.slots.map((s) => `${formatTime(s.from) ?? ""} – ${formatTime(s.to) ?? ""}`).join(", ")
        : "Closed",
    };
  });
}

export interface OpeningHoursProps {
  /** Separate OperatingHours doc — preferred when present (web BusinessHours). */
  hours?: OperatingHoursDoc | null;
  /** Fallback: the schedule saved at signup (web NewScheduleDisplay). */
  schedule?: WeekSchedule | null;
  is24_7?: boolean;
}

/** Weekly opening times, today highlighted. Returns null when nothing is known. */
export function OpeningHours({ hours, schedule, is24_7 }: OpeningHoursProps) {
  if (hours?.is24_7 || (!hours && is24_7)) {
    return <Text variant="bodyMedium">Open 24/7</Text>;
  }
  const rows = hours ? rowsFromHours(hours) : schedule ? rowsFromSchedule(schedule) : null;
  if (!rows) return null;
  // JS getDay(): 0 = Sunday → our Monday-first index.
  const todayIndex = (new Date().getDay() + 6) % 7;

  return (
    <View style={styles.list}>
      {rows.map((row, i) => {
        const today = i === todayIndex;
        return (
          <View key={row.day} style={styles.row}>
            <Text variant={today ? "label" : "bodySm"} style={styles.day}>
              {row.day}
              {today ? " (today)" : ""}
            </Text>
            <Text
              variant={today ? "label" : "bodySm"}
              color={row.open ? "foreground" : "mutedForeground"}
              style={styles.value}
            >
              {row.value}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: theme.spacing[2] },
  row: { flexDirection: "row", justifyContent: "space-between", gap: theme.spacing[3] },
  day: { flexShrink: 0 },
  value: { flex: 1, textAlign: "right" },
});
