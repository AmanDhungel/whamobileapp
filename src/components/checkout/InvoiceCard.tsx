import { StyleSheet, View } from "react-native";

import { theme, useTheme } from "@/theme";
import { formatPrice } from "@/utils/format";

import { Card } from "../Card";
import { Text } from "../Text";

export interface InvoiceLine {
  name: string;
  quantity: number;
  /** Server unit price (AUD). */
  unitPrice: number;
}

export interface InvoiceCardProps {
  invoiceNumber: string;
  lines: InvoiceLine[];
  serviceFee: number;
  surcharge: number;
  promoCode?: string;
  total: number;
}

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
      <Text variant={strong ? "label" : "bodySm"}>{value}</Text>
    </View>
  );
}

/** Paid-order invoice (web ticket detail / guest receipt "Invoice" section). Server amounts only. */
export function InvoiceCard({
  invoiceNumber,
  lines,
  serviceFee,
  surcharge,
  promoCode,
  total,
}: InvoiceCardProps) {
  const t = useTheme();
  return (
    <Card style={styles.card}>
      <Text variant="h3">Invoice</Text>
      <Text variant="caption" color="mutedForeground">
        #{invoiceNumber}
      </Text>
      {lines.map((line, i) => (
        <Row
          key={`${line.name}-${i}`}
          label={`${line.name} × ${line.quantity}`}
          value={`${formatPrice(line.unitPrice)} each`}
        />
      ))}
      <Row label="Service fee" value={formatPrice(serviceFee)} />
      <Row label="Card processing surcharge (2.5%)" value={formatPrice(surcharge)} />
      {!!promoCode && <Row label="Promo code applied" value={promoCode.toUpperCase()} />}
      <View style={[styles.divider, { backgroundColor: t.colors.divider }]} />
      <Row label="Total paid" value={formatPrice(total)} strong />
      <Text variant="caption" color="mutedForeground">
        Incl. GST. Service and processing fees are non-refundable.
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: theme.spacing[2] },
  row: { flexDirection: "row", alignItems: "center", gap: theme.spacing[3] },
  divider: { height: theme.sizes.hairline, marginVertical: theme.spacing[1] },
  flex: { flex: 1 },
});
