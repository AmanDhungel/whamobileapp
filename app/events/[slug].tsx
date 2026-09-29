import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Linking, StyleSheet, View } from "react-native";

import { ApiError } from "@/api/errors";
import type { EventDetail, EventHost } from "@/api/types";
import {
  Avatar,
  CheckoutChoiceSheet,
  Badge,
  Button,
  Card,
  DetailHero,
  EmptyState,
  ErrorState,
  FavoriteButton,
  InfoRow,
  OverlayIconButton,
  Screen,
  ScreenHeader,
  Skeleton,
  StaticMap,
  StickyActionBar,
  Text,
  TextLink,
  TicketOptionRow,
  openBusiness,
  shareLink,
  showToast,
} from "@/components";
import { useEvent } from "@/hooks/queries/browse";
import { useAccountArea } from "@/store/authStore";
import { theme, useTheme } from "@/theme";
import { getEventAvailability } from "@/utils/eventStatus";
import { formatDateRange, formatPrice, formatTimeRange, titleCase } from "@/utils/format";
import { htmlToText, splitLines } from "@/utils/html";
import { webUrls } from "@/utils/links";
import { normalizeEventSlug } from "@/utils/slug";

const COMING_SOON = "Coming soon — in-app tickets arrive in the next update.";

function hostOf(event: EventDetail): EventHost | null {
  return typeof event.user === "object" && event.user ? event.user : null;
}

function TextSection({ title, lines }: { title: string; lines: string[] }) {
  if (!lines.length) return null;
  return (
    <View style={styles.section}>
      <Text variant="h3">{title}</Text>
      {lines.map((line, i) => (
        <Text key={i} variant="bodySm" color="mutedForeground">
          {line}
        </Text>
      ))}
    </View>
  );
}

function EventDetailSkeleton() {
  const t = useTheme();
  return (
    <View>
      <Skeleton height={t.sizes.detailHeroHeight} radius={0} />
      <View style={styles.body}>
        <Skeleton width="80%" height={t.spacing[8]} />
        <Skeleton width="50%" height={t.spacing[4]} />
        <Skeleton width="60%" height={t.spacing[4]} />
        <Skeleton height={t.sizes.staticMapHeight} radius={t.radius.tailwindLg} />
      </View>
    </View>
  );
}

/**
 * ~ web /events/[slug] (components/Event/SingleEventPage.tsx). Paid events open the
 * ticket checkout; external events open their ticket link.
 */
export default function EventDetailScreen() {
  const params = useLocalSearchParams<{ slug: string }>();
  const slug = normalizeEventSlug(params.slug);
  const query = useEvent(slug);
  const area = useAccountArea();
  const [choiceOpen, setChoiceOpen] = useState(false);

  if (query.isPending) {
    return (
      <Screen padded={false} edges={["bottom"]}>
        <EventDetailSkeleton />
      </Screen>
    );
  }

  if (query.isError || !query.data) {
    const notFound = query.error instanceof ApiError && query.error.status === 404;
    return (
      <Screen scroll={false} padded={false}>
        <ScreenHeader title="Event" />
        {notFound ? (
          <EmptyState
            icon="calendar"
            title="Event not found"
            message="This event may have been removed or the link is incorrect."
          />
        ) : (
          <ErrorState
            title="Couldn't load this event"
            error={query.error}
            onRetry={() => void query.refetch()}
          />
        )}
      </Screen>
    );
  }

  const event = query.data;
  const availability = getEventAvailability(event);
  const host = hostOf(event);
  const dateLine = formatDateRange(event.dateRange?.from, event.dateRange?.to) ?? "Date TBA";
  const timeLine = formatTimeRange(event.startTime, event.endTime) ?? "Time TBA";
  const venue = event.venue || "Venue TBA";
  const description = htmlToText(event.description);

  let action: { label: string; caption?: string; disabled?: boolean; onPress: () => void };
  if (event.price_category === "paid") {
    const soldOut = availability.buyable.length === 0;
    action = soldOut
      ? { label: "Sold Out", disabled: true, onPress: () => undefined }
      : {
          label: "Get tickets",
          caption:
            availability.fromPrice !== null
              ? `From ${formatPrice(availability.fromPrice)}`
              : undefined,
          onPress: () => {
            if (area === "customer") {
              router.push({ pathname: "/checkout/[slug]", params: { slug: event.slug ?? slug } });
            } else {
              setChoiceOpen(true); // log in, or continue as a guest
            }
          },
        };
  } else if (event.price_category === "external") {
    action = {
      label: "Get Tickets",
      disabled: !event.ticket_link,
      onPress: () => {
        if (event.ticket_link) void Linking.openURL(event.ticket_link);
      },
    };
  } else {
    action = availability.registrationFull
      ? { label: "Fully Booked", disabled: true, onPress: () => undefined }
      : {
          label: "Register",
          caption: "Free event",
          onPress: () => showToast({ type: "info", message: COMING_SOON }),
        };
  }

  return (
    <View style={styles.flex}>
      <Screen padded={false} edges={[]}>
        <DetailHero
          images={event.image ? [event.image] : []}
          actions={
            <>
              {event.slug && (
                <OverlayIconButton
                  icon="share"
                  label="Share"
                  onPress={() => void shareLink(event.title, webUrls.event(event.slug ?? slug))}
                />
              )}
              <FavoriteButton target={{ type: "Event", item: event }} size="md" />
            </>
          }
        />

        <View style={styles.body}>
          <View style={styles.titleBlock}>
            {!!(event.category_name || event.category) && (
              <Badge label={event.category_name || event.category || ""} tone="info" />
            )}
            <Text variant="h1">{titleCase(event.title)}</Text>
          </View>

          <View style={styles.info}>
            <InfoRow icon="calendar" label="Date" value={dateLine} />
            <InfoRow icon="clock" label="Time" value={timeLine} />
            <InfoRow icon="map-pin" label="Venue" value={venue} />
          </View>

          {/* Tickets card (web sidebar) */}
          <Card style={styles.section}>
            <Text variant="h3">Tickets</Text>
            {event.price_category === "paid" &&
              (availability.options.length ? (
                availability.options.map((state, i) => (
                  <TicketOptionRow
                    key={state.option._id ?? i}
                    state={state}
                    showRemaining={availability.showRemaining}
                  />
                ))
              ) : (
                <Text variant="bodySm" color="mutedForeground">
                  Ticket options will be announced soon.
                </Text>
              ))}
            {event.price_category === "external" && (
              <Text variant="bodySm" color="mutedForeground">
                Tickets via external site
              </Text>
            )}
            {(event.price_category === "registration" || !event.price_category) && (
              <>
                <Text variant="bodySm" color="mutedForeground">
                  Free Event · Registration Required
                </Text>
                {availability.showRemaining && availability.registrationRemaining !== null && (
                  <Text variant="label" color="primary">
                    {availability.registrationRemaining} spot
                    {availability.registrationRemaining === 1 ? "" : "s"} left
                  </Text>
                )}
              </>
            )}
          </Card>

          {!!description && (
            <View style={styles.section}>
              <Text variant="h3">Description</Text>
              <Text variant="bodySm" color="mutedForeground">
                {description}
              </Text>
            </View>
          )}

          {!event.location_tba && (
            <View style={styles.section}>
              <Text variant="h3">Location</Text>
              <StaticMap
                latitude={event.latitude}
                longitude={event.longitude}
                label={venue}
                address={event.location || event.venue}
              />
            </View>
          )}

          {/* Host */}
          <View style={styles.section}>
            <Text variant="h3">Host</Text>
            <Card style={styles.host}>
              {event.host_name ? (
                <>
                  <Avatar uri={event.image} name={event.host_name} />
                  <View style={styles.flex}>
                    <Text variant="label">{event.host_name}</Text>
                    {!!event.phone_number && (
                      <TextLink onPress={() => void Linking.openURL(`tel:${event.phone_number}`)}>
                        {event.phone_number}
                      </TextLink>
                    )}
                    {!!event.email && (
                      <TextLink onPress={() => void Linking.openURL(`mailto:${event.email}`)}>
                        {event.email}
                      </TextLink>
                    )}
                    {!!event.website_link && (
                      <TextLink
                        onPress={() =>
                          void Linking.openURL(
                            /^https?:\/\//.test(event.website_link ?? "")
                              ? (event.website_link ?? "")
                              : `https://${event.website_link}`,
                          )
                        }
                      >
                        {event.website_link}
                      </TextLink>
                    )}
                  </View>
                </>
              ) : (
                <>
                  <Avatar uri={host?.image} name={host?.business_name} />
                  <View style={styles.flex}>
                    <Text variant="label">{host?.business_name || "Event organiser"}</Text>
                    {!!host?.city && (
                      <Text variant="caption" color="mutedForeground">
                        {host.city}
                      </Text>
                    )}
                    {host?.business_name && (
                      <TextLink onPress={() => openBusiness(host)}>View business</TextLink>
                    )}
                  </View>
                </>
              )}
            </Card>
          </View>

          <TextSection title="Support Details" lines={splitLines(event.support_details)} />
          <TextSection title="Event Rules" lines={splitLines(event.event_rules)} />
          <TextSection title="Refund Policy" lines={splitLines(event.refund_policy)} />
        </View>
      </Screen>

      <StickyActionBar>
        <View style={styles.flex}>
          <Text variant="label" numberOfLines={1}>
            {titleCase(event.title)}
          </Text>
          {!!action.caption && (
            <Text variant="caption" color="mutedForeground">
              {action.caption}
            </Text>
          )}
        </View>
        <Button
          title={action.label}
          fullWidth={false}
          disabled={action.disabled}
          onPress={action.onPress}
        />
      </StickyActionBar>

      <CheckoutChoiceSheet
        visible={choiceOpen}
        onClose={() => setChoiceOpen(false)}
        onLogin={() => {
          setChoiceOpen(false);
          router.push({ pathname: "/login", params: { type: "user" } });
        }}
        onGuest={() => {
          setChoiceOpen(false);
          router.push({
            pathname: "/checkout/[slug]",
            params: { slug: event.slug ?? slug, guest: "1" },
          });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { gap: theme.spacing[6], padding: theme.spacing[6] },
  titleBlock: { gap: theme.spacing[2] },
  info: { gap: theme.spacing[4] },
  section: { gap: theme.spacing[3] },
  host: { flexDirection: "row", alignItems: "flex-start", gap: theme.spacing[3] },
});
