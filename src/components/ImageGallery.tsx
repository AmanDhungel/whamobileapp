import { useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { theme, useTheme } from "@/theme";

import { Button } from "./Button";
import { RemoteImage } from "./RemoteImage";
import { Text } from "./Text";

function usePageIndex(pageWidth: number) {
  const [index, setIndex] = useState(0);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!pageWidth) return;
    setIndex(Math.round(e.nativeEvent.contentOffset.x / pageWidth));
  };
  return { index, onScroll };
}

function Dots({ count, index }: { count: number; index: number }) {
  const t = useTheme();
  if (count < 2) return null;
  return (
    <View style={styles.dots} accessibilityLabel={`Image ${index + 1} of ${count}`}>
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            { backgroundColor: i === index ? t.colors.onImage : t.colors.imageScrim },
          ]}
        />
      ))}
    </View>
  );
}

/** Full-screen, swipeable image viewer. */
export function ImageViewer({
  images,
  initialIndex,
  visible,
  onClose,
}: {
  images: string[];
  initialIndex: number;
  visible: boolean;
  onClose: () => void;
}) {
  const t = useTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { index, onScroll } = usePageIndex(width);

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.viewer, { backgroundColor: t.colors.primary }]}>
        <FlatList
          horizontal
          pagingEnabled
          data={images}
          keyExtractor={(uri, i) => `${uri}-${i}`}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <RemoteImage
              uri={item}
              contentFit="contain"
              style={{ width, height, backgroundColor: t.colors.transparent }}
            />
          )}
        />
        <View style={[styles.viewerTop, { top: insets.top + t.spacing[2] }]}>
          <Text variant="label" color="onImage">
            {Math.min(index, images.length - 1) + 1} / {images.length}
          </Text>
          <Button
            variant="secondary"
            size="icon"
            icon="x"
            accessibilityLabel="Close"
            onPress={onClose}
          />
        </View>
      </View>
    </Modal>
  );
}

/** Swipeable hero gallery with page dots; tap opens the full-screen viewer. */
export function ImageGallery({ images, height }: { images: string[]; height?: number }) {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const { index, onScroll } = usePageIndex(width);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const galleryHeight = height ?? t.sizes.detailHeroHeight;
  const list = images.length ? images : [""];

  return (
    <View>
      <FlatList
        horizontal
        pagingEnabled
        data={list}
        keyExtractor={(uri, i) => `${uri}-${i}`}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item, index: i }) => (
          <Pressable
            disabled={!item}
            onPress={() => setViewerIndex(i)}
            accessibilityRole="imagebutton"
            accessibilityLabel={`Open photo ${i + 1}`}
          >
            <RemoteImage uri={item || null} style={{ width, height: galleryHeight }} />
          </Pressable>
        )}
      />
      <Dots count={images.length} index={index} />
      {viewerIndex !== null && (
        <ImageViewer
          images={images}
          initialIndex={viewerIndex}
          visible
          onClose={() => setViewerIndex(null)}
        />
      )}
    </View>
  );
}

/** 3-column photo grid: shows `max` then "+N" (web Venue Photos / Portfolio). */
const GRID_COLUMNS = 3;

export function PhotoGrid({ images, max = 9 }: { images: string[]; max?: number }) {
  const t = useTheme();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [gridWidth, setGridWidth] = useState(0);
  const shown = images.slice(0, max);
  const extra = images.length - shown.length;
  const gap = t.spacing[2];
  const cell = gridWidth ? (gridWidth - gap * (GRID_COLUMNS - 1)) / GRID_COLUMNS : 0;

  return (
    <View style={[styles.grid, { gap }]} onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}>
      {shown.map((uri, i) => {
        const isLast = i === shown.length - 1 && extra > 0;
        return (
          <Pressable
            key={`${uri}-${i}`}
            style={{ width: cell, height: cell }}
            onPress={() => setViewerIndex(i)}
            accessibilityRole="imagebutton"
            accessibilityLabel={`Open photo ${i + 1} of ${images.length}`}
          >
            <RemoteImage uri={uri} style={[styles.gridImage, { borderRadius: t.radius.lg }]} />
            {isLast && (
              <View
                style={[
                  StyleSheet.absoluteFill,
                  styles.more,
                  { backgroundColor: t.colors.imageScrim, borderRadius: t.radius.lg },
                ]}
              >
                <Text variant="h3" color="onImage">
                  +{extra}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
      {viewerIndex !== null && (
        <ImageViewer
          images={images}
          initialIndex={viewerIndex}
          visible
          onClose={() => setViewerIndex(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dots: {
    position: "absolute",
    bottom: theme.spacing[3],
    alignSelf: "center",
    flexDirection: "row",
    gap: theme.spacing[1.5],
  },
  dot: {
    width: theme.sizes.badgeDot,
    height: theme.sizes.badgeDot,
    borderRadius: theme.radius.full,
  },
  viewer: { flex: 1 },
  viewerTop: {
    position: "absolute",
    left: theme.spacing[4],
    right: theme.spacing[4],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  gridImage: { width: "100%", height: "100%" },
  more: { alignItems: "center", justifyContent: "center" },
});
