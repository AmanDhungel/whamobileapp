import { useEffect, useState } from "react";
import {
  Animated,
  StyleSheet,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { theme, useTheme } from "@/theme";

export interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/** Pulsing placeholder block (web: shadcn Skeleton). */
export function Skeleton({
  width = "100%",
  height = theme.spacing[4],
  radius,
  style,
}: SkeletonProps) {
  const t = useTheme();
  const [pulse] = useState(() => new Animated.Value(0.5));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: t.animation.pulse, useNativeDriver: true }),
        Animated.timing(pulse, {
          toValue: 0.5,
          duration: t.animation.pulse,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, t.animation.pulse]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width,
          height,
          borderRadius: radius ?? t.radius.md,
          backgroundColor: t.colors.muted,
          opacity: pulse,
        },
        style,
      ]}
    />
  );
}

export type CardSkeletonVariant = "event" | "business" | "deal" | "row";

/** Card-shaped loading placeholders matching EventCard / BusinessCard / DealCard / rows. */
export function CardSkeleton({
  variant,
  width,
}: {
  variant: CardSkeletonVariant;
  width?: DimensionValue;
}) {
  const t = useTheme();
  if (variant === "row") {
    return (
      <View style={[styles.row, { width }]}>
        <Skeleton width={t.sizes.thumbMd} height={t.sizes.thumbMd} radius={t.radius.lg} />
        <View style={styles.rowText}>
          <Skeleton width="70%" height={t.spacing[4]} />
          <Skeleton width="45%" height={t.spacing[3]} />
        </View>
      </View>
    );
  }
  const imageHeight =
    variant === "event"
      ? t.sizes.cardImageHeight
      : variant === "business"
        ? t.sizes.businessCardImageHeight
        : t.sizes.dealCardImageHeight;
  return (
    <View style={[styles.card, { width }]}>
      <Skeleton height={imageHeight} radius={t.radius.tailwindLg} />
      <Skeleton width="40%" height={t.spacing[3]} />
      <Skeleton width="85%" height={t.spacing[5]} />
      <Skeleton width="60%" height={t.spacing[3]} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: theme.spacing[2] },
  row: { flexDirection: "row", alignItems: "center", gap: theme.spacing[3] },
  rowText: { flex: 1, gap: theme.spacing[2] },
});
