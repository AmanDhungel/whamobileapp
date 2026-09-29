import { StyleSheet, View } from "react-native";

import type { TicketPricing } from "@/api/types";
import { theme, useTheme } from "@/theme";
import { formatPrice } from "@/utils/format";

import { Badge } from "../Badge";
import { Card } from "../Card";
import { Text } from "../Text";

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Text
        variant={strong ? "label" : "bodySm"}
        color={strong ? "foreground" : "mutedForeground"}
        style={styles.flex}
      >
        {label}
      </Text>
      <Text variant={strong ? "title" : "bodySm"}>{value}</Text>
    </View>
  );
}

/**
 * Web "Order Summary" (EventCheckOut.tsx) — every amount comes from the SERVER pricing
 * response and is only formatted here. (The web also shows a client-computed "Order
 * total" row; the app omits it: never calculate prices in the app.)
 */
export function OrderSummary({ pricing }: { pricing: TicketPricing }) {
  const t = useTheme();
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text variant="h3" style={styles.flex}>
          Order Summary
        </Text>
        <Badge label={pricing.invoiceNumber} />
      </View>

      {pricing.items.map((item) => (
        <View key={item.optionId} style={styles.row}>
          <Text variant="bodySm" style={styles.flex}>
            {item.name} × {item.quantity}
          </Text>
          <View style={styles.price}>
            {item.discounted && (
              <Text variant="caption" color="mutedForeground" style={styles.strike}>
                {formatPrice(item.originalPrice)}
              </Text>
            )}
            <Text variant="bodySm">{formatPrice(item.unitPrice)} each</Text>
          </View>
        </View>
      ))}

      <View style={[styles.divider, { backgroundColor: t.colors.divider }]} />
      <Row label="Tickets" value={formatPrice(pricing.ticketTotal)} />
      <Row label="Service fee" value={formatPrice(pricing.serviceFee)} />
      <Row label="Card processing surcharge (2.5%)" value={formatPrice(pricing.surcharge)} />
      <View style={[styles.divider, { backgroundColor: t.colors.divider }]} />
      <Row label="Total to pay" value={formatPrice(pricing.totalToPay)} strong />
      <Text variant="caption" color="mutedForeground" align="right">
        Incl. GST
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: theme.spacing[2] },
  header: { flexDirection: "row", alignItems: "center", gap: theme.spacing[2] },
  row: { flexDirection: "row", alignItems: "center", gap: theme.spacing[3] },
  price: { flexDirection: "row", alignItems: "center", gap: theme.spacing[1.5] },
  strike: { textDecorationLine: "line-through" },
  divider: { height: theme.sizes.hairline, marginVertical: theme.spacing[1] },
  flex: { flex: 1 },
});
