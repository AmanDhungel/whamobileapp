import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, View, type DimensionValue } from "react-native";

import type { EventSummary } from "@/api/types";
import { theme, useTheme } from "@/theme";
import { formatCardDate, formatDistance, formatTimeRange } from "@/utils/format";

import { Badge } from "./Badge";
import { FavoriteButton } from "./FavoriteButton";
import { RemoteImage } from "./RemoteImage";
import { Text } from "./Text";

export function eventDateLine(event: EventSummary): string {
  const date = formatCardDate(event.dateRange?.from);
  if (!date) return "TBA";
  return `${date}, ${formatTimeRange(event.startTime, event.endTime) ?? "Time TBA"}`;
}

export function openEvent(event: Pick<EventSummary, "slug">) {
  if (event.slug) router.push({ pathname: "/events/[slug]", params: { slug: event.slug } });
}

/** Mirrors components/cards/event-card.tsx: image + heart, date line, title, venue, price pill. */
export function EventCard({ event, width }: { event: EventSummary; width?: DimensionValue }) {
  const t = useTheme();
  const distance = formatDistance(event.distance);
  const ticketed = event.price_category === "paid" || event.price_category === "external";

  return (
    <Pressable
      onPress={() => openEvent(event)}
      disabled={!event.slug}
      accessibilityRole="button"
      accessibilityLabel={`${event.title}, ${eventDateLine(event)}`}
      style={({ pressed }) => [{ width }, pressed && { opacity: t.opacity.pressed }]}
    >
      <View>
        <RemoteImage
          uri={event.image}
          style={[styles.image, { height: t.sizes.cardImageHeight }]}
          placeholderIcon="calendar"
        />
        <View style={styles.heart}>
          <FavoriteButton target={{ type: "Event", item: event }} />
        </View>
      </View>
      <View style={styles.body}>
        <Text variant="captionMedium" color="secondary" numberOfLines={1}>
          {eventDateLine(event)}
        </Text>
        <Text variant="title" numberOfLines={2}>
          {event.title}
        </Text>
        <View style={styles.metaRow}>
          <Feather name="map-pin" size={t.sizes.starSm} color={t.colors.mutedForeground} />
          <Text variant="caption" color="mutedForeground" numberOfLines={1} style={styles.flex}>
            {event.venue || "Venue TBA"}
            {distance ? ` · ${distance} away` : ""}
          </Text>
        </View>
        <Badge label={ticketed ? "GET TICKETS" : "FREE"} tone={ticketed ? "primary" : "success"} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  image: { borderRadius: theme.radius.tailwindLg },
  heart: { position: "absolute", top: theme.spacing[3], right: theme.spacing[3] },
  body: { gap: theme.spacing[1.5], paddingTop: theme.spacing[3] },
  metaRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing[1] },
  flex: { flex: 1 },
});
