import { router, Stack } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";

import {
  Button,
  Card,
  EmptyState,
  InfoRow,
  InvoiceCard,
  Screen,
  ScreenHeader,
  Text,
  TicketCodeCarousel,
  TicketDownloadButtons,
} from "@/components";
import { useAccountArea } from "@/store/authStore";
import { useCheckoutResultStore } from "@/store/checkoutResultStore";
import { theme } from "@/theme";
import { formatDate, formatDateRange, formatTimeRange } from "@/utils/format";
import type { TicketCode } from "@/utils/tickets";

/**
 * Post-payment confirmation (web /checkout/receipt/[id] for guests; signed-in buyers
 * get the same receipt here). The data comes from the /purchase response held in
 * memory — never fetched by id — so it's only available right after checkout.
 */
export default function CheckoutSuccessScreen() {
  const area = useAccountArea();
  const result = useCheckoutResultStore((s) => s.result);
  const clear = useCheckoutResultStore((s) => s.clear);

  // The receipt carries ticket codes: drop it once this screen is left.
  useEffect(() => () => clear(), [clear]);

  const done = () => router.replace("/");

  if (!result) {
    return (
      <Screen scroll={false} padded={false}>
        <ScreenHeader title="Receipt" onBack={done} />
        <EmptyState
          icon="file-text"
          title="Receipt not available"
          message="This confirmation page is only available right after checkout. Check your email — we've sent a copy of your tickets and invoice there."
          action={<Button title="Back to Home" onPress={done} />}
        />
      </Screen>
    );
  }

  const { receipt, guestEmail } = result;
  const isCustomer = area === "customer";
  const codes: TicketCode[] = receipt.items.flatMap((item) =>
    item.uniqueKeys.map((key) => ({ key, label: item.optionName, checkedIn: false })),
  );
  const when = [
    formatDateRange(receipt.event.dateRange?.from, receipt.event.dateRange?.to),
    formatTimeRange(receipt.event.startTime, receipt.event.endTime),
  ]
    .filter(Boolean)
    .join(" · ");
  const venue = receipt.event.venue || receipt.event.location;

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <ScreenHeader title="Payment successful" onBack={done} />
      <View style={styles.body}>
        <View style={styles.hero}>
          <Text variant="h1">You&apos;re all set, {receipt.holderName}!</Text>
          <Text variant="bodySm" color="mutedForeground">
            {isCustomer
              ? "Your payment was successful. Your tickets are in My tickets, and we've also emailed you a copy."
              : "Your payment was successful. Download your tickets and invoice below — this page won't be available again, but we've also emailed you a copy."}
          </Text>
          {!isCustomer && !!guestEmail && (
            <Text variant="bodySm" color="mutedForeground">
              Sent to <Text variant="bodyMedium">{guestEmail}</Text>. If you already have a WHA
              account with this email, log in to see these tickets under My tickets.
            </Text>
          )}
        </View>

        <Card style={styles.card}>
          <Text variant="h3">{receipt.event.title}</Text>
          <TicketCodeCarousel codes={codes} holderName={receipt.holderName} />
        </Card>

        <TicketDownloadButtons
          ticket={{
            title: receipt.event.title,
            dateLine: when || null,
            venue,
            holderName: receipt.holderName,
            codes,
          }}
          invoice={{
            invoiceNumber: receipt.invoiceNumber,
            issuedOn: formatDate(receipt.createdAt),
            eventTitle: receipt.event.title,
            venue,
            dateLine: when || null,
            lines: receipt.items.map((i) => ({
              name: i.optionName,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
            })),
            serviceFee: receipt.serviceFee,
            surcharge: receipt.surcharge,
            promoCode: receipt.promoCode,
            total: receipt.totalAmount,
          }}
        />

        {!!when && <InfoRow icon="calendar" label="Date and time" value={when} />}
        {!!venue && <InfoRow icon="map-pin" label="Location" value={venue} />}

        <InvoiceCard
          invoiceNumber={receipt.invoiceNumber}
          lines={receipt.items.map((i) => ({
            name: i.optionName,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          }))}
          serviceFee={receipt.serviceFee}
          surcharge={receipt.surcharge}
          promoCode={receipt.promoCode}
          total={receipt.totalAmount}
        />

        <View style={styles.actions}>
          {isCustomer && (
            <Button
              title="View in My tickets"
              icon="calendar"
              onPress={() => router.replace("/activity")}
            />
          )}
          <Button title="Continue browsing" variant="outline" onPress={done} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: theme.spacing[6],
    paddingHorizontal: theme.spacing[6],
    paddingBottom: theme.spacing[8],
  },
  hero: { gap: theme.spacing[2] },
  card: { gap: theme.spacing[4] },
  actions: { gap: theme.spacing[3] },
});
