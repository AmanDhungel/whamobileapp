import { StyleSheet, View } from "react-native";

import { theme, useTheme } from "@/theme";
import type { OptionState } from "@/utils/eventStatus";
import { formatDayMonth, formatPrice } from "@/utils/format";

import { Text } from "./Text";

/**
 * One ticket type on the event detail card — the web sidebar's per-option line:
 * "$25.00 · 12 left" / "Coming soon · 04 Oct" / "Closed" / "Sold Out".
 */
export function TicketOptionRow({
  state,
  showRemaining,
}: {
  state: OptionState;
  showRemaining: boolean;
}) {
  const t = useTheme();
  const { option, status, remaining } = state;

  let detail: string;
  if (status === "released") {
    detail = formatPrice(option.price);
    if (showRemaining && remaining !== null) detail += ` · ${remaining} left`;
  } else if (status === "upcoming") {
    const date = formatDayMonth(option.release_date);
    detail = date ? `Coming soon · ${date}` : "Coming soon";
  } else {
    detail = status === "closed" ? "Closed" : "Sold Out";
  }

  return (
    <View style={[styles.row, { borderColor: t.colors.border }]}>
      <Text
        variant="bodyMedium"
        color={status === "released" ? "foreground" : "mutedForeground"}
        style={styles.name}
        numberOfLines={2}
      >
        {option.name || "General Admission"}
      </Text>
      <Text variant="label" color={status === "released" ? "primary" : "mutedForeground"}>
        {detail}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    paddingVertical: theme.spacing[3],
    borderBottomWidth: theme.sizes.hairline,
  },
  name: { flex: 1 },
});
