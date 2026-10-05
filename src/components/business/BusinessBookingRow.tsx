import { Pressable, StyleSheet, View } from "react-native";

import type { BusinessBooking } from "@/api/types";
import { theme, useTheme } from "@/theme";
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_TONE } from "@/utils/bookings";
import { dayAndMonth, formatDateTimeShort, formatDuration, formatPrice } from "@/utils/format";

import { Badge } from "../Badge";
import { Text } from "../Text";

/** The populated staff member's name, if any. */
export function employeeName(booking: BusinessBooking): string | null {
  const e = booking.employee_id;
  return e && typeof e === "object" ? e.full_name || null : null;
}

export interface BusinessBookingRowProps {
  booking: BusinessBooking;
  onPress?: () => void;
}

/** Date badge · service + customer + time/duration · status (web dashboard BookingRow). */
export function BusinessBookingRow({ booking, onPress }: BusinessBookingRowProps) {
  const t = useTheme();
  const date = dayAndMonth(booking.start_time);
  const customer = booking.user_id?.name || booking.user_id?.email;
  const staff = employeeName(booking);
  const meta = [formatDateTimeShort(booking.start_time), formatDuration(booking.duration)]
    .filter(Boolean)
    .join(" · ");

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      style={({ pressed }) => [styles.row, pressed && { opacity: t.opacity.pressed }]}
    >
      <View style={[styles.date, { backgroundColor: t.colors.accent }]}>
        <Text variant="title" color="whaBlue">
          {date?.day ?? "--"}
        </Text>
        <Text variant="caption" color="whaBlue">
          {date?.month ?? ""}
        </Text>
      </View>
      <View style={styles.body}>
        <Text variant="label" numberOfLines={1}>
          {booking.service_id?.name || "Service"}
        </Text>
        {(!!customer || !!staff) && (
          <Text variant="caption" color="mutedForeground" numberOfLines={1}>
            {[customer, staff && `with ${staff}`].filter(Boolean).join(" · ")}
          </Text>
        )}
        <Text variant="caption" color="mutedForeground" numberOfLines={1}>
          {meta}
        </Text>
      </View>
      <View style={styles.side}>
        <Badge
          label={BOOKING_STATUS_LABEL[booking.status] ?? booking.status}
          tone={BOOKING_STATUS_TONE[booking.status] ?? "default"}
        />
        <Text variant="captionMedium">{formatPrice(booking.total_price)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: theme.spacing[3] },
  date: {
    width: theme.sizes.thumbSm,
    height: theme.sizes.thumbSm,
    borderRadius: theme.radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, gap: theme.spacing[0.5] },
  side: { alignItems: "flex-end", gap: theme.spacing[1] },
});
