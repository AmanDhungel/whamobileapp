import { useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";

import { ApiError } from "@/api/errors";
import {
  Avatar,
  Badge,
  Button,
  Card,
  DealPrice,
  DetailHero,
  EmptyState,
  ErrorState,
  FavoriteButton,
  InfoRow,
  OverlayIconButton,
  Screen,
  ScreenHeader,
  Skeleton,
  StickyActionBar,
  Text,
  TextLink,
  dealBusiness,
  openBusiness,
  shareLink,
  showToast,
} from "@/components";
import { useDeal } from "@/hooks/queries/browse";
import { useTickets } from "@/hooks/queries/tickets";
import { useAccountArea } from "@/store/authStore";
import { requestLogin } from "@/store/loginPromptStore";
import { theme, useTheme } from "@/theme";
import { formatDateLong, shortLocation } from "@/utils/format";
import { splitLines } from "@/utils/html";
import { webUrls } from "@/utils/links";
import { isDealTicket } from "@/utils/tickets";

/**
 * ~ web /deals/[id] (SingleDealPage). Claiming isn't available in the app yet —
 * POST /api/deals/redeem is still cookie-only on the backend.
 */
export default function DealDetailScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const area = useAccountArea();
  const query = useDeal(id);
  const tickets = useTickets();

  if (query.isPending) {
    return (
      <Screen padded={false} edges={["bottom"]}>
        <Skeleton height={t.sizes.detailHeroHeight} radius={0} />
        <View style={styles.body}>
          <Skeleton width="80%" height={t.spacing[8]} />
          <Skeleton width="40%" height={t.spacing[5]} />
          <Skeleton height={t.sizes.staticMapHeight} radius={t.radius.tailwindLg} />
        </View>
      </Screen>
    );
  }

  if (query.isError || !query.data) {
    const notFound = query.error instanceof ApiError && query.error.status === 404;
    return (
      <Screen scroll={false} padded={false}>
        <ScreenHeader title="Deal" />
        {notFound ? (
          <EmptyState
            icon="tag"
            title="Deal not found"
            message="This deal may have ended or the link is incorrect."
          />
        ) : (
          <ErrorState
            title="Couldn't load this deal"
            error={query.error}
            onRetry={() => void query.refetch()}
          />
        )}
      </Screen>
    );
  }

  const deal = query.data;
  const business = dealBusiness(deal);
  const validUntil = formatDateLong(deal.valid_till);

  // Web "Status": Used / Claimed — pending verification / Available to claim.
  const redemption = tickets.data?.find((x) => isDealTicket(x) && x.deal?._id === deal._id);
  const status = redemption
    ? redemption.status === "verified"
      ? "Used"
      : "Claimed — pending verification"
    : "Available to claim";

  const claim = () => {
    if (area !== "customer") {
      requestLogin("Sign in to claim this deal");
      return;
    }
    showToast({
      type: "info",
      message: "Coming soon — claiming deals in the app arrives in a later update.",
    });
  };

  return (
    <View style={styles.flex}>
      <Screen padded={false} edges={[]}>
        <DetailHero
          images={deal.image ? [deal.image] : []}
          actions={
            <>
              <OverlayIconButton
                icon="share"
                label="Share"
                onPress={() => void shareLink(deal.title, webUrls.deal(deal._id))}
              />
              <FavoriteButton target={{ type: "Deal", item: deal }} size="md" />
            </>
          }
        />
        <View style={styles.body}>
          <View style={styles.titleBlock}>
            {deal.discount_percentage > 0 && (
              <Badge label={`${deal.discount_percentage}% OFF`} tone="onImage" />
            )}
            <Text variant="h1">{deal.title}</Text>
            <DealPrice deal={deal} suffix=" AUD" />
          </View>

          {!!deal.description && (
            <Text variant="bodySm" color="mutedForeground">
              {deal.description}
            </Text>
          )}

          <View style={styles.section}>
            <Text variant="h3">Deal Information</Text>
            {!!validUntil && <InfoRow icon="calendar" label="Valid Until" value={validUntil} />}
            {area === "customer" && <InfoRow icon="info" label="Status" value={status} />}
          </View>

          {!!deal.terms_for_the_deal && (
            <View style={styles.section}>
              <Text variant="h3">Terms &amp; Conditions</Text>
              {splitLines(deal.terms_for_the_deal).map((line, i) => (
                <Text key={i} variant="bodySm" color="mutedForeground">
                  {line}
                </Text>
              ))}
            </View>
          )}

          {business && (
            <View style={styles.section}>
              <Text variant="h3">Business</Text>
              <Card style={styles.business}>
                <Avatar uri={business.image} name={business.business_name} />
                <View style={styles.flex}>
                  <Text variant="label">{business.business_name || "Business"}</Text>
                  {!!business.location && (
                    <Text variant="caption" color="mutedForeground" numberOfLines={1}>
                      {shortLocation(business.location)}
                    </Text>
                  )}
                  <TextLink onPress={() => openBusiness(business)}>View business</TextLink>
                </View>
              </Card>
            </View>
          )}
        </View>
      </Screen>

      <StickyActionBar>
        <View style={styles.flex}>
          <DealPrice deal={deal} />
          <Text variant="caption" color="mutedForeground">
            Tap to claim your exclusive offer
          </Text>
        </View>
        <Button
          title={redemption ? "Claimed" : "Claim deal"}
          fullWidth={false}
          disabled={!!redemption}
          onPress={claim}
        />
      </StickyActionBar>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { gap: theme.spacing[6], padding: theme.spacing[6] },
  titleBlock: { gap: theme.spacing[2] },
  section: { gap: theme.spacing[3] },
  business: { flexDirection: "row", alignItems: "flex-start", gap: theme.spacing[3] },
});
