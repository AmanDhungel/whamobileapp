import type { ReactElement } from "react";
import { FlatList, StyleSheet, View, useWindowDimensions } from "react-native";

import { theme, useTheme } from "@/theme";

export interface HorizontalCarouselProps<T> {
  data: T[];
  keyExtractor: (item: T) => string;
  /** Receives the computed card width (82% of the screen, like the web CardSlider). */
  renderItem: (item: T, width: number) => ReactElement;
  loading?: boolean;
  /** Placeholder card (given the same width) shown while loading. */
  renderSkeleton?: (width: number) => ReactElement;
  skeletonCount?: number;
}

/** Snap-scrolling card row (web: components/ui/card-slider.tsx on mobile). */
export function HorizontalCarousel<T>({
  data,
  keyExtractor,
  renderItem,
  loading,
  renderSkeleton,
  skeletonCount = 2,
}: HorizontalCarouselProps<T>) {
  const t = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = Math.min(screenWidth * t.sizes.carouselCardWidthRatio, t.sizes.contentMaxWidth);
  const interval = cardWidth + t.spacing[4];

  if (loading && renderSkeleton) {
    return (
      <View style={[styles.row, styles.content]}>
        {Array.from({ length: skeletonCount }, (_, i) => (
          <View key={i}>{renderSkeleton(cardWidth)}</View>
        ))}
      </View>
    );
  }

  return (
    <FlatList
      horizontal
      data={data}
      keyExtractor={keyExtractor}
      renderItem={({ item }) => renderItem(item, cardWidth)}
      showsHorizontalScrollIndicator={false}
      snapToInterval={interval}
      decelerationRate="fast"
      contentContainerStyle={[styles.content, { gap: t.spacing[4] }]}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: theme.spacing[4], overflow: "hidden" },
  content: { paddingHorizontal: theme.spacing[6] },
});
