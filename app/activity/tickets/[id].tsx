import { useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";

import {
  Card,
  EmptyState,
  ErrorState,
  InfoRow,
  Loader,
  LoginPrompt,
  RemoteImage,
  Screen,
  ScreenHeader,
  StaticMap,
  Text,
  TicketCodeCarousel,
  TextLink,
  ticketWhen,
  openDeal,
  openEvent,
} from "@/components";
import { useTickets } from "@/hooks/queries/tickets";
import { useAuthStore, useIsCustomer } from "@/store/authStore";
import { theme, useTheme } from "@/theme";
import { formatPrice } from "@/utils/format";
import {
  isPurchase,
  ticketCodes,
  ticketDeal,
  ticketEvent,
  ticketImage,
  ticketTitle,
  ticketVenue,
} from "@/utils/tickets";

/**
 * ~ web /activity/tickets/[id] (TicketDetailPage). No single-ticket endpoint exists —
 * the item is found in GET /api/tickets, exactly like the website.
 */
export default function TicketDetailScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isCustomer = useIsCustomer();
  const holderName = useAuthStore((s) => s.user?.name) || "Ticket Holder";
  const tickets = useTickets();

  if (!isCustomer) {
    return (
      <Screen scroll={false} padded={false}>
        <ScreenHeader title="Ticket" />
        <LoginPrompt icon="lock" title="Log in to view this ticket" />
      </Screen>
    );
  }
  if (tickets.isPending) {
    return (
      <Screen scroll={false} padded={false}>
        <ScreenHeader title="Ticket" />
        <Loader />
      </Screen>
    );
  }
  if (tickets.isError && !tickets.data) {
    return (
      <Screen scroll={false} padded={false}>
        <ScreenHeader title="Ticket" />
        <ErrorState
          title="Couldn't load your tickets."
          error={tickets.error}
          onRetry={() => void tickets.refetch()}
        />
      </Screen>
    );
  }

  const item = tickets.data?.find((x) => x._id === id);
  if (!item) {
    return (
      <Screen scroll={false} padded={false}>
        <ScreenHeader title="Ticket" />
        <EmptyState
          icon="alert-circle"
          title="Ticket not found"
          message="This ticket may have been removed or the link is incorrect."
        />
      </Screen>
    );
  }

  const event = ticketEvent(item);
  const deal = ticketDeal(item);
  const codes = ticketCodes(item);
  const when = ticketWhen(item);
  const venue = ticketVenue(item);

  return (
    <Screen padded={false}>
      <ScreenHeader title="Ticket" />
      <View style={styles.body}>
        <Card style={styles.ticketCard}>
          <View style={styles.titleRow}>
            <RemoteImage
              uri={ticketImage(item)}
              style={[styles.thumb, { borderRadius: t.radius.lg }]}
              placeholderIcon={event ? "calendar" : "tag"}
            />
            <View style={styles.flex}>
              <Text variant="h3">{ticketTitle(item)}</Text>
              {event?.slug && <TextLink onPress={() => openEvent(event)}>View event</TextLink>}
              {deal && <TextLink onPress={() => openDeal(deal)}>View deal</TextLink>}
            </View>
          </View>
          {codes.length ? (
            <TicketCodeCarousel codes={codes} holderName={holderName} />
          ) : (
            <Text variant="bodySm" color="mutedForeground" align="center">
              No ticket codes were issued for this item.
            </Text>
          )}
        </Card>

        {!!when && <InfoRow icon="calendar" label="Date and time" value={when} />}
        {!!venue && (
          <View style={styles.section}>
            <Text variant="h3">Location</Text>
            <StaticMap
              latitude={event?.latitude}
              longitude={event?.longitude}
              label={venue}
              address={event?.location || venue}
            />
          </View>
        )}

        {isPurchase(item) && (
          <Card style={styles.section}>
            <Text variant="h3">Invoice</Text>
            <Text variant="caption" color="mutedForeground">
              #{item.invoiceNumber}
            </Text>
            {item.items.map((line) => (
              <View key={line.optionId} style={styles.line}>
                <Text variant="bodySm" style={styles.flex}>
                  {line.optionName} × {line.quantity}
                </Text>
                <Text variant="bodySm">{formatPrice(line.unitPrice * line.quantity)}</Text>
              </View>
            ))}
            <View style={styles.line}>
              <Text variant="bodySm" color="mutedForeground" style={styles.flex}>
                Service fee
              </Text>
              <Text variant="bodySm">{formatPrice(item.serviceFee)}</Text>
            </View>
            <View style={styles.line}>
              <Text variant="bodySm" color="mutedForeground" style={styles.flex}>
                Card processing surcharge (2.5%)
              </Text>
              <Text variant="bodySm">{formatPrice(item.surcharge)}</Text>
            </View>
            {!!item.promoCode && (
              <View style={styles.line}>
                <Text variant="bodySm" color="mutedForeground" style={styles.flex}>
                  Promo code
                </Text>
                <Text variant="bodySm">{item.promoCode}</Text>
              </View>
            )}
            <View style={[styles.line, styles.total, { borderTopColor: t.colors.border }]}>
              <Text variant="label" style={styles.flex}>
                Total paid
              </Text>
              <Text variant="label">{formatPrice(item.totalAmount)}</Text>
            </View>
            <Text variant="caption" color="mutedForeground">
              Incl. GST. Service and processing fees are non-refundable.
            </Text>
          </Card>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: {
    gap: theme.spacing[6],
    paddingHorizontal: theme.spacing[6],
    paddingBottom: theme.spacing[8],
  },
  ticketCard: { gap: theme.spacing[4] },
  titleRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing[3] },
  thumb: { width: theme.sizes.thumbMd, height: theme.sizes.thumbMd },
  section: { gap: theme.spacing[3] },
  line: { flexDirection: "row", alignItems: "center", gap: theme.spacing[3] },
  total: { borderTopWidth: theme.sizes.hairline, paddingTop: theme.spacing[3] },
});
