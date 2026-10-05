import { Pressable, StyleSheet, View } from "react-native";

import type { BusinessEvent } from "@/api/types";
import { theme, useTheme } from "@/theme";
import {
  EVENT_STATUS_LABEL,
  eventDateLine,
  eventLocationLine,
  getEventStatus,
  type EventStatus,
} from "@/utils/businessEvents";

import { Badge, type BadgeTone } from "../Badge";
import { Button } from "../Button";
import { RemoteImage } from "../RemoteImage";
import { Text } from "../Text";

export const EVENT_STATUS_TONE: Record<EventStatus, BadgeTone> = {
  upcoming: "info",
  live: "success",
  past: "default",
  archived: "warning",
};

export interface EventRowProps {
  event: BusinessEvent;
  onPress: () => void;
  onMore: () => void;
}

/** My events row: image · title, location, date · status · ⋯ (web EventsPage row). */
export function EventRow({ event, onPress, onMore }: EventRowProps) {
  const t = useTheme();
  const status = getEventStatus(event);
  const location = eventLocationLine(event);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Manage ${event.title}`}
      style={({ pressed }) => [styles.row, pressed && { opacity: t.opacity.pressed }]}
    >
      {event.image ? (
        <RemoteImage uri={event.image} style={[styles.thumb, { borderRadius: t.radius.lg }]} />
      ) : (
        <View
          style={[
            styles.thumb,
            styles.fallback,
            { backgroundColor: t.colors.accent, borderRadius: t.radius.lg },
          ]}
        >
          <Text variant="h3" color="whaBlue">
            {(event.title?.[0] ?? "E").toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.body}>
        <Text variant="label" numberOfLines={2}>
          {event.title}
        </Text>
        {!!location && (
          <Text variant="caption" color="mutedForeground" numberOfLines={1}>
            {location}
          </Text>
        )}
        <Text variant="caption" color="mutedForeground" numberOfLines={1}>
          {eventDateLine(event)}
        </Text>
        <Badge
          label={EVENT_STATUS_LABEL[status]}
          tone={EVENT_STATUS_TONE[status]}
          style={styles.badge}
        />
      </View>
      <Button
        variant="ghost"
        size="icon"
        icon="more-vertical"
        accessibilityLabel={`More actions for ${event.title}`}
        onPress={onMore}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: theme.spacing[3] },
  thumb: { width: theme.sizes.thumbLg, height: theme.sizes.thumbLg },
  fallback: { alignItems: "center", justifyContent: "center" },
  body: { flex: 1, gap: theme.spacing[0.5] },
  badge: { alignSelf: "flex-start", marginTop: theme.spacing[1] },
});
