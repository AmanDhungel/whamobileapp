import { StyleSheet, View } from "react-native";

import { theme, useTheme } from "@/theme";
import type { OptionState } from "@/utils/eventStatus";
import { formatDayMonth, formatPrice } from "@/utils/format";

import { Button } from "../Button";
import { Text } from "../Text";

export interface TicketQuantityRowProps {
  state: OptionState;
  quantity: number;
  showRemaining: boolean;
  canIncrement: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
  disabled?: boolean;
}

/**
 * One ticket option in the Tickets step (web TicketsStep row: name, "$X.XX each",
 * − qty +). Options that can't be bought yet/any more show their status instead of a
 * stepper (the web hides them; the app shows them greyed so the full line-up is visible).
 */
export function TicketQuantityRow({
  state,
  quantity,
  showRemaining,
  canIncrement,
  onIncrement,
  onDecrement,
  disabled,
}: TicketQuantityRowProps) {
  const t = useTheme();
  const { option, status, remaining } = state;
  const buyable = status === "released";

  let statusText: string | null = null;
  if (status === "upcoming") {
    const date = formatDayMonth(option.release_date);
    statusText = date ? `Coming soon · ${date}` : "Coming soon";
  } else if (status === "closed") statusText = "Closed";
  else if (status === "soldout") statusText = "Sold Out";

  return (
    <View
      style={[
        styles.row,
        { borderColor: t.colors.border },
        !buyable && { opacity: t.opacity.disabled },
      ]}
    >
      <View style={styles.info}>
        <Text variant="label">{option.name || "General Admission"}</Text>
        <Text variant="caption" color="mutedForeground">
          {formatPrice(option.price)} each
          {buyable && showRemaining && remaining !== null ? ` · ${remaining} left` : ""}
        </Text>
      </View>
      {buyable ? (
        <View style={styles.stepper}>
          <Button
            variant="outline"
            size="icon"
            icon="minus"
            accessibilityLabel={`Remove one ${option.name ?? "ticket"}`}
            disabled={disabled || quantity === 0}
            onPress={onDecrement}
          />
          <Text variant="title" style={styles.qty} accessibilityLabel={`${quantity} selected`}>
            {quantity}
          </Text>
          <Button
            variant="outline"
            size="icon"
            icon="plus"
            accessibilityLabel={`Add one ${option.name ?? "ticket"}`}
            disabled={disabled || !canIncrement}
            onPress={onIncrement}
          />
        </View>
      ) : (
        <Text variant="captionMedium" color="mutedForeground">
          {statusText}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    paddingVertical: theme.spacing[4],
    borderBottomWidth: theme.sizes.hairline,
  },
  info: { flex: 1, gap: theme.spacing[0.5] },
  stepper: { flexDirection: "row", alignItems: "center", gap: theme.spacing[2] },
  qty: { minWidth: theme.spacing[6], textAlign: "center" },
});
