import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import type { UploadFile } from "@/api/types";
import { theme, useTheme } from "@/theme";
import { pickImages } from "@/utils/imagePicker";

import { Badge } from "./Badge";
import { RemoteImage } from "./RemoteImage";
import { Text } from "./Text";
import { showToast } from "./Toast";

export interface ImagePickerGridProps {
  images: UploadFile[];
  onChange: (images: UploadFile[]) => void;
  min: number;
  max: number;
  maxBytes: number;
  error?: string | null;
}

const COLUMNS = 3;

/** Venue images step: pick from the library, first = "Cover", remove, count vs. min/max. */
export function ImagePickerGrid({
  images,
  onChange,
  min,
  max,
  maxBytes,
  error,
}: ImagePickerGridProps) {
  const t = useTheme();
  const [width, setWidth] = useState(0);
  const gap = t.spacing[2];
  const cell = width ? (width - gap * (COLUMNS - 1)) / COLUMNS : 0;
  const count = images.length;

  const add = async () => {
    const { files, skipped } = await pickImages({ limit: max - count, maxBytes });
    skipped.forEach((name) =>
      showToast({ type: "error", message: `"${name}" is larger than 5 MB — skipped` }),
    );
    if (files.length) onChange([...images, ...files].slice(0, max));
  };

  const status =
    count === 0
      ? `${count} / ${max} images`
      : count < min
        ? `${count} / ${max} images — ${min - count} more required`
        : `${count} / ${max} images — minimum reached ✓`;

  return (
    <View style={styles.container}>
      <Text
        variant="captionMedium"
        color={count === 0 ? "mutedForeground" : count < min ? "warning" : "success"}
      >
        {status}
      </Text>
      {!!error && (
        <Text variant="caption" color="destructive">
          {error}
        </Text>
      )}
      <View style={[styles.grid, { gap }]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {images.map((img, i) => (
          <View
            key={`${img.uri}-${i}`}
            style={{ width: cell, height: cell / t.sizes.imageTileAspectRatio }}
          >
            <RemoteImage uri={img.uri} style={[styles.fill, { borderRadius: t.radius.lg }]} />
            <Pressable
              onPress={() => onChange(images.filter((_, j) => j !== i))}
              hitSlop={t.spacing[2]}
              accessibilityRole="button"
              accessibilityLabel={`Remove image ${i + 1}`}
              style={[styles.remove, { backgroundColor: t.colors.imageScrim }]}
            >
              <Feather name="x" size={t.sizes.starSm} color={t.colors.onImage} />
            </Pressable>
            {i === 0 && <Badge label="Cover" tone="primary" style={styles.cover} />}
          </View>
        ))}
        {count < max && (
          <Pressable
            onPress={() => void add()}
            accessibilityRole="button"
            accessibilityLabel="Add images"
            style={[
              styles.add,
              {
                width: cell,
                height: cell / t.sizes.imageTileAspectRatio,
                borderColor: t.colors.borderStrong,
                backgroundColor: t.colors.muted,
              },
            ]}
          >
            <Feather name="plus" size={t.sizes.iconLg} color={t.colors.mutedForeground} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: theme.spacing[3] },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  fill: { width: "100%", height: "100%" },
  remove: {
    position: "absolute",
    top: theme.spacing[1.5],
    right: theme.spacing[1.5],
    width: theme.spacing[6],
    height: theme.spacing[6],
    borderRadius: theme.radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  cover: { position: "absolute", bottom: theme.spacing[1.5], left: theme.spacing[1.5] },
  add: {
    borderRadius: theme.radius.lg,
    borderWidth: theme.sizes.borderWidthThick,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
});
