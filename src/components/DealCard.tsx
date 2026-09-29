import { router } from "expo-router";
import { Pressable, StyleSheet, View, type DimensionValue } from "react-native";

import type { Deal, DealBusiness } from "@/api/types";
import { theme, useTheme } from "@/theme";
import { formatDate, formatPrice, shortLocation } from "@/utils/format";

import { Avatar } from "./Avatar";
import { Badge } from "./Badge";
import { FavoriteButton } from "./FavoriteButton";
import { RemoteImage } from "./RemoteImage";
import { Text } from "./Text";

export function dealBusiness(deal: Deal): DealBusiness | null {
  return typeof deal.user === "object" && deal.user ? deal.user : null;
}

/** Discounted price (web: price - price*pct/100). */
export function dealFinalPrice(deal: Pick<Deal, "price" | "discount_percentage">): number {
  const pct = deal.discount_percentage > 0 ? deal.discount_percentage : 0;
  return deal.price - (deal.price * pct) / 100;
}

export function openDeal(deal: Pick<Deal, "_id">) {
  router.push({ pathname: "/deals/[id]", params: { id: deal._id } });
}

/** Price line: struck-through original + discounted, "$X", or "Free" (web deal card). */
export function DealPrice({ deal, suffix = "" }: { deal: Deal; suffix?: string }) {
  if (deal.discount_percentage > 0 && deal.price > 0) {
    return (
      <View style={styles.priceRow}>
        <Text variant="caption" color="mutedForeground" style={styles.strike}>
          {formatPrice(deal.price)}
        </Text>
        <Text variant="label">
          {formatPrice(dealFinalPrice(deal))}
          {suffix}
        </Text>
      </View>
    );
  }
  return (
    <Text variant="label">{deal.price > 0 ? `${formatPrice(deal.price)}${suffix}` : "Free"}</Text>
  );
}

/** Mirrors components/cards/deal-card.tsx. */
export function DealCard({ deal, width }: { deal: Deal; width?: DimensionValue }) {
  const t = useTheme();
  const business = dealBusiness(deal);
  const expires = formatDate(deal.valid_till);
  const location = shortLocation(business?.location);

  return (
    <Pressable
      onPress={() => openDeal(deal)}
      accessibilityRole="button"
      accessibilityLabel={deal.title}
      style={({ pressed }) => [{ width }, pressed && { opacity: t.opacity.pressed }]}
    >
      <View>
        <RemoteImage
          uri={deal.image}
          style={[styles.image, { height: t.sizes.dealCardImageHeight }]}
          placeholderIcon="tag"
        />
        {deal.discount_percentage > 0 && (
          <Badge
            label={`${deal.discount_percentage}% OFF`}
            tone="onImage"
            style={styles.discount}
          />
        )}
        <View style={styles.heart}>
          <FavoriteButton target={{ type: "Deal", item: deal }} />
        </View>
      </View>
      <View style={styles.body}>
        <Text variant="title" numberOfLines={2}>
          {deal.title}
        </Text>
        {business && (
          <View style={styles.businessRow}>
            <Avatar uri={business.image} name={business.business_name} size={t.sizes.avatarXs} />
            <Text variant="caption" color="mutedForeground" numberOfLines={1} style={styles.flex}>
              {[business.business_name, location].filter(Boolean).join(" · ")}
            </Text>
          </View>
        )}
        <View style={styles.footer}>
          <DealPrice deal={deal} />
          {expires && (
            <Text variant="caption" color="mutedForeground">
              Expires {expires}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  image: { borderRadius: theme.radius.tailwindLg },
  discount: { position: "absolute", top: theme.spacing[3], left: theme.spacing[3] },
  heart: { position: "absolute", top: theme.spacing[3], right: theme.spacing[3] },
  body: { gap: theme.spacing[1.5], paddingTop: theme.spacing[3] },
  businessRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing[2] },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  priceRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing[1.5] },
  strike: { textDecorationLine: "line-through" },
  flex: { flex: 1 },
});
