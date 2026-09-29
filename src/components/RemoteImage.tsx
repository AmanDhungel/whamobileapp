import { Feather } from "@expo/vector-icons";
import { Image, type ImageContentFit } from "expo-image";
import { useState } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "@/theme";

export interface RemoteImageProps {
  uri?: string | null;
  style?: StyleProp<ViewStyle>;
  contentFit?: ImageContentFit;
  /** Shown when there's no URL or loading fails. */
  placeholderIcon?: keyof typeof Feather.glyphMap;
  accessibilityLabel?: string;
  /** Extra request headers (e.g. map tile providers). */
  headers?: Record<string, string>;
}

/**
 * The one way screens show a remote image: expo-image with memory+disk caching, a
 * fade-in, and a themed placeholder for missing/broken images.
 */
export function RemoteImage({
  uri,
  style,
  contentFit = "cover",
  placeholderIcon = "image",
  accessibilityLabel,
  headers,
}: RemoteImageProps) {
  const t = useTheme();
  // Track the failing URL (not a boolean) so recycled list cells recover.
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const showPlaceholder = !uri || failedUri === uri;

  return (
    <View
      style={[styles.base, { backgroundColor: t.colors.muted }, style]}
      accessible={!!accessibilityLabel}
      accessibilityRole={accessibilityLabel ? "image" : undefined}
      accessibilityLabel={accessibilityLabel}
    >
      {showPlaceholder ? (
        <Feather name={placeholderIcon} size={t.sizes.iconXl} color={t.colors.mutedForeground} />
      ) : (
        <Image
          source={{ uri, headers }}
          style={StyleSheet.absoluteFill}
          contentFit={contentFit}
          cachePolicy="memory-disk"
          transition={t.animation.fast}
          recyclingKey={uri}
          onError={() => setFailedUri(uri)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { overflow: "hidden", alignItems: "center", justifyContent: "center" },
});
