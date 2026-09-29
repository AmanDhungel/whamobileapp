import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useMemo, useState, type ReactNode } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { ApiError } from "@/api/errors";
import type { BusinessDetail, Employee, Review } from "@/api/types";
import {
  Avatar,
  Badge,
  Button,
  Card,
  DealCard,
  DetailHero,
  EmptyState,
  ErrorState,
  EventCard,
  FavoriteButton,
  OpeningHours,
  OverlayIconButton,
  PhotoGrid,
  RatingStars,
  ReviewCard,
  ReviewForm,
  Screen,
  ScreenHeader,
  Skeleton,
  StaticMap,
  Text,
  TextLink,
  businessDisplayName,
  shareLink,
} from "@/components";
import { useBusiness } from "@/hooks/queries/browse";
import {
  useCreateReview,
  useDeleteReview,
  useReviews,
  useUpdateReview,
} from "@/hooks/queries/reviews";
import { useAccountArea, useAuthStore } from "@/store/authStore";
import { requestLogin } from "@/store/loginPromptStore";
import { theme, useTheme } from "@/theme";
import { categoryLabel } from "@/utils/catalog";
import { formatDuration } from "@/utils/format";
import { webUrls } from "@/utils/links";
import { averageRating, formatRating, reviewAuthorId } from "@/utils/rating";
import { slugifyBusinessName } from "@/utils/slug";
import type { ReviewValues } from "@/utils/validation";

const PREVIEW_COUNT = 2;

function teamOf(business: BusinessDetail): Employee[] {
  // Web: unique populated `assigned_employees` across the business's services.
  const seen = new Map<string, Employee>();
  for (const service of business.services ?? []) {
    for (const e of service.assigned_employees ?? []) {
      if (typeof e === "object" && e && !seen.has(e._id)) seen.set(e._id, e);
    }
  }
  return [...seen.values()];
}

function BusinessSkeleton() {
  const t = useTheme();
  return (
    <View>
      <Skeleton height={t.sizes.detailHeroHeight} radius={0} />
      <View style={styles.body}>
        <Skeleton width="70%" height={t.spacing[8]} />
        <Skeleton width="45%" height={t.spacing[4]} />
        <Skeleton height={t.sizes.staticMapHeight} radius={t.radius.tailwindLg} />
      </View>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="h3" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

/**
 * ~ web /businesses/[slug] (SingleBusinessPage). The slug is the business-name slug
 * (the backend's lookup key); reviews are keyed by the same slug.
 */
export default function BusinessDetailScreen() {
  const t = useTheme();
  const params = useLocalSearchParams<{ slug: string }>();
  const slug = slugifyBusinessName(params.slug);
  const area = useAccountArea();
  const userId = useAuthStore((s) => s.user?.id);

  const query = useBusiness(slug);
  const reviewsQuery = useReviews(slug);
  const createReview = useCreateReview(slug);
  const updateReview = useUpdateReview(slug);
  const deleteReview = useDeleteReview(slug);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Review | null>(null);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [showAllDeals, setShowAllDeals] = useState(false);

  const reviews = useMemo(() => reviewsQuery.data ?? [], [reviewsQuery.data]);
  const ownReview = userId ? reviews.find((r) => reviewAuthorId(r) === userId) : undefined;

  if (query.isPending) {
    return (
      <Screen padded={false} edges={["bottom"]}>
        <BusinessSkeleton />
      </Screen>
    );
  }

  if (query.isError || !query.data) {
    // The backend returns 500 (not 404) for an unknown slug — treat both as "not found"
    // when the request itself reached the server.
    const notFound =
      query.error instanceof ApiError && (query.error.status === 404 || query.error.status === 500);
    return (
      <Screen scroll={false} padded={false}>
        <ScreenHeader title="Business" />
        {notFound ? (
          <EmptyState
            icon="briefcase"
            title="Business not found"
            message="This business may have moved or the link is incorrect."
          />
        ) : (
          <ErrorState
            title="Couldn't load this business"
            error={query.error}
            onRetry={() => void query.refetch()}
          />
        )}
      </Screen>
    );
  }

  const business = query.data;
  const name = businessDisplayName(business);
  const images = business.venue_images?.length
    ? business.venue_images
    : business.image
      ? [business.image]
      : [];
  const rating = averageRating(reviews);
  const services = (business.services ?? []).filter((s) => s.is_active);
  const team = teamOf(business);
  const events = business.event ?? [];
  const deals = business.deal ?? [];
  const community = (business.community ?? []).filter(Boolean);
  const typeLabel =
    business.business_type === "item_based"
      ? "Item Booking"
      : business.business_type === "employee_based"
        ? "Service Booking"
        : null;
  const city = business.city_name || business.city;
  const verified = business.verified ?? business.isSponsor ?? false;

  const openWriteReview = () => {
    if (area !== "customer") {
      requestLogin("Sign in to write a review");
      return;
    }
    setEditing(ownReview ?? null);
    setFormOpen(true);
  };

  const submitReview = (values: ReviewValues) => {
    const done = { onSuccess: () => setFormOpen(false) };
    if (editing) updateReview.mutate({ id: editing._id, ...values }, done);
    else createReview.mutate(values, done);
  };

  const confirmDelete = (review: Review) =>
    Alert.alert("Delete review?", "Your review will be removed from this business.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteReview.mutate(review._id) },
    ]);

  const visibleReviews = showAllReviews ? reviews : reviews.slice(0, t.sizes.maxReviewPreview);

  return (
    <Screen padded={false} edges={["bottom"]}>
      <DetailHero
        images={images}
        actions={
          <>
            <OverlayIconButton
              icon="share"
              label="Share"
              onPress={() => void shareLink(name, webUrls.business(slug))}
            />
            <FavoriteButton target={{ type: "User", item: business }} size="md" />
          </>
        }
      />

      <View style={styles.body}>
        {/* Info bar */}
        <View style={styles.titleBlock}>
          <View style={styles.nameRow}>
            <Text variant="h1" style={styles.flexShrink}>
              {name}
            </Text>
            {verified && (
              <Feather
                name="check-circle"
                size={t.sizes.iconLg}
                color={t.colors.secondary}
                accessibilityLabel="Verified business"
              />
            )}
          </View>
          <View style={styles.ratingRow}>
            {rating !== null ? (
              <>
                <RatingStars value={rating} size={t.sizes.starSm} />
                <Text variant="captionMedium">{formatRating(rating)}</Text>
                <Text variant="caption" color="mutedForeground">
                  ({reviews.length} review{reviews.length === 1 ? "" : "s"})
                </Text>
              </>
            ) : (
              <Text variant="caption" color="mutedForeground">
                No reviews yet
              </Text>
            )}
          </View>
          <View style={styles.badges}>
            {!!business.business_category && (
              <Badge label={categoryLabel(business.business_category)} tone="info" />
            )}
            {typeLabel && <Badge label={typeLabel} />}
          </View>
          {!!(city || business.location) && (
            <Text variant="bodySm" color="mutedForeground">
              {[city, business.location].filter(Boolean).join(" · ")}
            </Text>
          )}
          {services.length > 0 && (
            <Text variant="caption" color="mutedForeground">
              {services.length} service{services.length === 1 ? "" : "s"} available
            </Text>
          )}
        </View>

        {community.length > 0 && (
          <Section title="Community">
            <View style={styles.badges}>
              {community.map((c) => (
                <Badge key={c} label={c} icon="users" />
              ))}
            </View>
          </Section>
        )}

        {services.length > 0 && (
          <Section title="Services">
            <Card padded={false}>
              {services.map((s, i) => (
                <View
                  key={s._id}
                  style={[
                    styles.serviceRow,
                    i > 0 && { borderTopWidth: t.sizes.hairline, borderTopColor: t.colors.divider },
                  ]}
                >
                  <View style={styles.flex}>
                    {!!s.category && (
                      <Text variant="caption" color="mutedForeground">
                        {s.category}
                      </Text>
                    )}
                    <Text variant="label">{s.name}</Text>
                    {!!formatDuration(s.base_duration) && (
                      <Text variant="caption" color="mutedForeground">
                        {formatDuration(s.base_duration)}
                      </Text>
                    )}
                  </View>
                  <Text variant="label" color="primary">
                    AUD {s.base_price}
                  </Text>
                </View>
              ))}
            </Card>
            <Text variant="caption" color="mutedForeground">
              Online booking is coming to the app soon.
            </Text>
          </Section>
        )}

        {events.length > 0 && (
          <Section title="Events">
            {(showAllEvents ? events : events.slice(0, PREVIEW_COUNT)).map((e) => (
              <EventCard key={e._id} event={e} />
            ))}
            {events.length > PREVIEW_COUNT && (
              <TextLink onPress={() => setShowAllEvents((v) => !v)}>
                {showAllEvents ? "Show fewer events" : `View all ${events.length} events`}
              </TextLink>
            )}
          </Section>
        )}

        {deals.length > 0 && (
          <Section title="Deals">
            {(showAllDeals ? deals : deals.slice(0, PREVIEW_COUNT)).map((d) => (
              <DealCard key={d._id} deal={d} />
            ))}
            {deals.length > PREVIEW_COUNT && (
              <TextLink onPress={() => setShowAllDeals((v) => !v)}>
                {showAllDeals ? "Show fewer deals" : `View all ${deals.length} deals`}
              </TextLink>
            )}
          </Section>
        )}

        {team.length > 0 && (
          <Section title="Team">
            <View style={styles.team}>
              {team.map((e) => (
                <View key={e._id} style={styles.member}>
                  <Avatar uri={e.employee_photo} name={e.full_name} size={t.sizes.thumbMd} />
                  <Text variant="caption" align="center" numberOfLines={2}>
                    {e.full_name}
                  </Text>
                </View>
              ))}
            </View>
          </Section>
        )}

        {/* Reviews */}
        <Section title="Reviews">
          <Card style={styles.reviewSummary}>
            <Text variant="display">{formatRating(rating) ?? "–"}</Text>
            <View style={styles.flex}>
              <RatingStars value={rating ?? 0} />
              <Text variant="caption" color="mutedForeground">
                {reviews.length} review{reviews.length === 1 ? "" : "s"}
              </Text>
            </View>
          </Card>
          {area !== "business" && (
            <Button
              title={ownReview ? "Edit your review" : "Write a review"}
              icon="edit-3"
              variant="outline"
              onPress={openWriteReview}
            />
          )}
          {reviewsQuery.isPending ? (
            <Skeleton height={t.sizes.thumbLg} radius={t.radius.tailwindLg} />
          ) : reviewsQuery.isError ? (
            <ErrorState
              title="Couldn't load reviews"
              error={reviewsQuery.error}
              onRetry={() => void reviewsQuery.refetch()}
            />
          ) : reviews.length === 0 ? (
            <Text variant="bodySm" color="mutedForeground">
              No reviews yet. Be the first to share your experience!
            </Text>
          ) : (
            <>
              {visibleReviews.map((r) => {
                const isOwn = !!userId && reviewAuthorId(r) === userId;
                return (
                  <ReviewCard
                    key={r._id}
                    review={r}
                    isOwn={isOwn}
                    onEdit={() => {
                      setEditing(r);
                      setFormOpen(true);
                    }}
                    onDelete={() => confirmDelete(r)}
                  />
                );
              })}
              {reviews.length > t.sizes.maxReviewPreview && (
                <TextLink onPress={() => setShowAllReviews((v) => !v)}>
                  {showAllReviews ? "Show fewer reviews" : `Show all ${reviews.length} reviews`}
                </TextLink>
              )}
            </>
          )}
        </Section>

        {!!business.venue_images?.length && (
          <Section title="Venue Photos">
            <PhotoGrid images={business.venue_images} />
          </Section>
        )}

        {!!business.portfolio_images?.length && (
          <Section title="Portfolio">
            <PhotoGrid images={business.portfolio_images} />
          </Section>
        )}

        {(business.hours || business.schedule || business.is24_7) && (
          <Section title="Opening times">
            <OpeningHours
              hours={business.hours}
              schedule={business.schedule}
              is24_7={business.is24_7}
            />
          </Section>
        )}

        {(business.location || typeof business.latitude === "number") && (
          <Section title="Location">
            <StaticMap
              latitude={business.latitude}
              longitude={business.longitude}
              label={name}
              address={business.location}
            />
          </Section>
        )}
      </View>

      <ReviewForm
        visible={formOpen}
        onClose={() => setFormOpen(false)}
        initial={editing ? { rating: editing.rating, comment: editing.comment } : undefined}
        submitting={createReview.isPending || updateReview.isPending}
        onSubmit={submitReview}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1 },
  body: { gap: theme.spacing[8], padding: theme.spacing[6] },
  titleBlock: { gap: theme.spacing[2] },
  nameRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing[2] },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing[1.5] },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing[2] },
  section: { gap: theme.spacing[3] },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    padding: theme.spacing[4],
  },
  team: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing[4] },
  member: { width: theme.sizes.thumbLg, alignItems: "center", gap: theme.spacing[1.5] },
  reviewSummary: { flexDirection: "row", alignItems: "center", gap: theme.spacing[4] },
});
