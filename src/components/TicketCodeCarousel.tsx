import { useState } from "react";
import {
  FlatList,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";

import { theme, useTheme } from "@/theme";
import type { TicketCode } from "@/utils/tickets";

import { Badge } from "./Badge";
import { QRCode } from "./QRCode";
import { Text } from "./Text";

/**
 * One swipeable page per ticket code (web TicketDetailPage carousel): QR,
 * "{holder} · Ticket i of n", the ticket-type label and a check-in badge.
 */
export function TicketCodeCarousel({
  codes,
  holderName,
}: {
  codes: TicketCode[];
  holderName: string;
}) {
  const t = useTheme();
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width) setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <FlatList
          horizontal
          pagingEnabled
          data={codes}
          keyExtractor={(c) => c.key}
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item, index: i }) => (
            <View style={[styles.page, { width }]}>
              <QRCode value={item.key} />
              <Text variant="label" align="center">
                {holderName} · Ticket {i + 1} of {codes.length}
              </Text>
              <Text variant="caption" color="mutedForeground" align="center">
                {item.label}
              </Text>
              <Text variant="caption" color="mutedForeground" align="center" selectable>
                {item.key}
              </Text>
              <Badge
                label={item.checkedIn ? "Checked in" : "Not checked in"}
                tone={item.checkedIn ? "success" : "warning"}
                icon={item.checkedIn ? "check-circle" : "clock"}
                style={styles.badge}
              />
            </View>
          )}
        />
      )}
      {codes.length > 1 && (
        <View style={styles.dots}>
          {codes.map((c, i) => (
            <View
              key={c.key}
              style={[
                styles.dot,
                { backgroundColor: i === index ? t.colors.primary : t.colors.borderStrong },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { alignItems: "center", gap: theme.spacing[2], paddingVertical: theme.spacing[2] },
  badge: { alignSelf: "center" },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: theme.spacing[1.5],
    marginTop: theme.spacing[3],
  },
  dot: {
    width: theme.sizes.badgeDot,
    height: theme.sizes.badgeDot,
    borderRadius: theme.radius.full,
  },
});
