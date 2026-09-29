import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import type { TicketItem } from "@/api/types";
import { theme, useTheme } from "@/theme";
import { formatDate, formatMonthDay, formatTimeRange } from "@/utils/format";
import {
  ticketCodes,
  ticketDeal,
  ticketEvent,
  ticketImage,
  ticketTitle,
  ticketVenue,
} from "@/utils/tickets";

import { Badge } from "./Badge";
import { RemoteImage } from "./RemoteImage";
import { Text } from "./Text";

export function ticketWhen(item: TicketItem): string | null {
  const event = ticketEvent(item);
  if (event?.dateRange?.from) {
    const day = formatMonthDay(event.dateRange.from);
    const time = formatTimeRange(event.startTime, event.endTime);
    return [day, time].filter(Boolean).join(" · ");
  }
  const deal = ticketDeal(item);
  const validTill = formatDate(deal?.valid_till);
  return validTill ? `Valid till ${validTill}` : null;
}

/** "My tickets" list row (web components/Dashboard/Ticket/Ticket.tsx row). */
export function TicketRow({ item }: { item: TicketItem }) {
  const t = useTheme();
  const codes = ticketCodes(item);
  const when = ticketWhen(item);
  const venue = ticketVenue(item);
  const used = codes.length > 0 && codes.every((c) => c.checkedIn);

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/activity/tickets/[id]", params: { id: item._id } })}
      accessibilityRole="button"
      accessibilityLabel={`${ticketTitle(item)}${when ? `, ${when}` : ""}`}
      style={({ pressed }) => [
        styles.row,
        { borderColor: t.colors.border, backgroundColor: t.colors.card },
        pressed && { backgroundColor: t.colors.muted },
      ]}
    >
      <RemoteImage
        uri={ticketImage(item)}
        style={[styles.thumb, { borderRadius: t.radius.lg }]}
        placeholderIcon={ticketEvent(item) ? "calendar" : "tag"}
      />
      <View style={styles.text}>
        <Text variant="title" numberOfLines={2}>
          {ticketTitle(item)}
        </Text>
        {!!when && (
          <Text variant="caption" color="secondary" numberOfLines={1}>
            {when}
          </Text>
        )}
        {!!venue && (
          <Text variant="caption" color="mutedForeground" numberOfLines={1}>
            {venue}
          </Text>
        )}
        <View style={styles.meta}>
          <Badge
            label={`${codes.length} QR code${codes.length === 1 ? "" : "s"}`}
            icon="maximize"
          />
          {used && <Badge label="Used" tone="success" icon="check" />}
        </View>
      </View>
      <Feather name="chevron-right" size={t.sizes.iconMd} color={t.colors.mutedForeground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    padding: theme.spacing[3],
    borderWidth: theme.sizes.hairline,
    borderRadius: theme.radius.tailwindLg,
  },
  thumb: { width: theme.sizes.thumbLg, height: theme.sizes.thumbLg },
  text: { flex: 1, gap: theme.spacing[1] },
  meta: { flexDirection: "row", gap: theme.spacing[2], marginTop: theme.spacing[0.5] },
});
