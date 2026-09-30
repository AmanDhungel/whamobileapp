import { useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";

import {
  Card,
  EmptyState,
  ErrorState,
  InfoRow,
  InvoiceCard,
  Loader,
  LoginPrompt,
  RemoteImage,
  Screen,
  ScreenHeader,
  StaticMap,
  Text,
  TicketCodeCarousel,
  TicketDownloadButtons,
  TextLink,
  ticketWhen,
  openDeal,
  openEvent,
} from "@/components";
import { useTickets } from "@/hooks/queries/tickets";
import { useAuthStore, useIsCustomer } from "@/store/authStore";
import { theme, useTheme } from "@/theme";
import { formatDate } from "@/utils/format";
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

        {codes.length > 0 && (
          <TicketDownloadButtons
            ticket={{ title: ticketTitle(item), dateLine: when, venue, holderName, codes }}
            invoice={
              isPurchase(item)
                ? {
                    invoiceNumber: item.invoiceNumber,
                    issuedOn: formatDate(item.createdAt),
                    eventTitle: ticketTitle(item),
                    venue,
                    dateLine: when,
                    lines: item.items.map((l) => ({
                      name: l.optionName,
                      quantity: l.quantity,
                      unitPrice: l.unitPrice,
                    })),
                    serviceFee: item.serviceFee,
                    surcharge: item.surcharge,
                    promoCode: item.promoCode,
                    total: item.totalAmount,
                  }
                : null
            }
          />
        )}

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
          <InvoiceCard
            invoiceNumber={item.invoiceNumber}
            lines={item.items.map((l) => ({
              name: l.optionName,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
            }))}
            serviceFee={item.serviceFee}
            surcharge={item.surcharge}
            promoCode={item.promoCode}
            total={item.totalAmount}
          />
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
});
