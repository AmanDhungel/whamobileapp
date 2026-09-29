import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, Share, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { theme, useTheme } from "@/theme";

import { ImageGallery } from "./ImageGallery";

/** Round white button drawn over a photo (back / share). */
export function OverlayIconButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={t.spacing[2]}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: t.colors.imageButton },
        t.shadows.sm,
        pressed && { opacity: t.opacity.pressed },
      ]}
    >
      <Feather name={icon} size={t.sizes.iconMd} color={t.colors.primary} />
    </Pressable>
  );
}

/** Opens the OS share sheet with the website URL for this item. */
export function shareLink(title: string, url: string) {
  return Share.share({ title, message: `${title}\n${url}`, url }).catch(() => undefined);
}

export interface DetailHeroProps {
  images: string[];
  /** Extra buttons on the right (share, favourite …). */
  actions?: ReactNode;
  height?: number;
}

/** Full-bleed photo header with back + actions overlaid (web mobile detail pages). */
export function DetailHero({ images, actions, height }: DetailHeroProps) {
  const insets = useSafeAreaInsets();
  const t = useTheme();
  return (
    <View>
      <ImageGallery images={images} height={height ?? t.sizes.detailHeroHeight + insets.top} />
      <View style={[styles.bar, { top: insets.top + t.spacing[2] }]} pointerEvents="box-none">
        <OverlayIconButton
          icon="arrow-left"
          label="Go back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
        />
        <View style={styles.actions}>{actions}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    width: theme.sizes.iconButton,
    height: theme.sizes.iconButton,
    borderRadius: theme.radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  bar: {
    position: "absolute",
    left: theme.spacing[4],
    right: theme.spacing[4],
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actions: { flexDirection: "row", gap: theme.spacing[2] },
});
