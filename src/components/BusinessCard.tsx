import { Feather, FontAwesome } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, View, type DimensionValue } from "react-native";

import type { BusinessSummary } from "@/api/types";
import { theme, useTheme } from "@/theme";
import { categoryLabel } from "@/utils/catalog";
import { formatDistance } from "@/utils/format";
import { averageRating, formatRating } from "@/utils/rating";
import { businessSlug } from "@/utils/slug";

import { FavoriteButton } from "./FavoriteButton";
import { RemoteImage } from "./RemoteImage";
import { Text } from "./Text";

export function businessDisplayName(business: Pick<BusinessSummary, "business_name" | "name">) {
  return business.business_name ?? business.name ?? "Business";
}

export function openBusiness(business: Pick<BusinessSummary, "business_name" | "name">) {
  const slug = businessSlug(business);
  if (slug) router.push({ pathname: "/businesses/[slug]", params: { slug } });
}

/** Mirrors components/cards/business-card.tsx (rating/review count computed client-side, as on web). */
export function BusinessCard({
  business,
  width,
}: {
  business: BusinessSummary;
  width?: DimensionValue;
}) {
  const t = useTheme();
  const name = businessDisplayName(business);
  const rating = formatRating(averageRating(business.reviews));
  const reviewCount = business.reviews?.length ?? 0;
  const city = business.city_name || business.city || "";
  const distance = formatDistance(business.distance);
  const verified = business.verified ?? business.isSponsor ?? false;
  const locationLine = [distance, city].filter(Boolean).join(" • ");
  const categoryLine = [
    categoryLabel(business.business_category),
    reviewCount ? `${reviewCount} review${reviewCount === 1 ? "" : "s"}` : null,
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <Pressable
      onPress={() => openBusiness(business)}
      accessibilityRole="button"
      accessibilityLabel={name}
      style={({ pressed }) => [{ width }, pressed && { opacity: t.opacity.pressed }]}
    >
      <View>
        <RemoteImage
          uri={business.image || business.venue_images?.[0]}
          style={[styles.image, { height: t.sizes.businessCardImageHeight }]}
          placeholderIcon="briefcase"
        />
        <View style={styles.heart}>
          <FavoriteButton target={{ type: "User", item: business }} />
        </View>
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text variant="title" numberOfLines={1} style={styles.flexShrink}>
            {name}
          </Text>
          {verified && (
            <Feather
              name="check-circle"
              size={t.sizes.iconSm}
              color={t.colors.secondary}
              accessibilityLabel="Verified"
            />
          )}
          <View style={styles.flex} />
          {rating && (
            <View style={styles.rating}>
              <FontAwesome name="star" size={t.sizes.starSm} color={t.colors.rating} />
              <Text variant="captionMedium">{rating}</Text>
            </View>
          )}
        </View>
        {!!locationLine && (
          <Text variant="caption" color="mutedForeground" numberOfLines={1}>
            {locationLine}
          </Text>
        )}
        {!!categoryLine && (
          <Text variant="caption" color="mutedForeground" numberOfLines={1}>
            {categoryLine}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  image: { borderRadius: theme.radius["2xl"] },
  heart: { position: "absolute", top: theme.spacing[3], right: theme.spacing[3] },
  body: { gap: theme.spacing[1], paddingTop: theme.spacing[3] },
  titleRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing[1.5] },
  rating: { flexDirection: "row", alignItems: "center", gap: theme.spacing[1] },
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1 },
});
