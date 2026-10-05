import { Feather } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, type StyleProp, type ViewStyle } from "react-native";

import { theme, useTheme } from "@/theme";

import { Text } from "./Text";

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: keyof typeof Feather.glyphMap;
  /** Trailing chevron — for chips that open a picker. */
  dropdown?: boolean;
  /** Tighter padding, for chips that share a row with other controls (e.g. a header). */
  compact?: boolean;
  /** Outer style — e.g. { flexShrink: 1 } to let a long label truncate with an ellipsis. */
  style?: StyleProp<ViewStyle>;
}

/** Filter / choice pill. Selected = navy fill (web active chip). */
export function Chip({
  label,
  selected = false,
  onPress,
  icon,
  dropdown,
  compact = false,
  style,
}: ChipProps) {
  const t = useTheme();
  const fg = selected ? t.colors.primaryForeground : t.colors.foreground;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.chip,
        compact && styles.compact,
        {
          backgroundColor: selected ? t.colors.primary : t.colors.background,
          borderColor: selected ? t.colors.primary : t.colors.border,
        },
        pressed && { opacity: t.opacity.pressed },
        style,
      ]}
    >
      {icon && <Feather name={icon} size={t.sizes.iconSm} color={fg} />}
      <Text variant="captionMedium" style={[styles.label, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
      {dropdown && <Feather name="chevron-down" size={t.sizes.iconSm} color={fg} />}
    </Pressable>
  );
}

/**
 * Horizontally scrolling row of chips that bleeds to the screen edges, with the screen's
 * side padding at the start and end so the first and last chips line up with content.
 */
export function ChipRow({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <ScrollView
      horizontal
      style={styles.scroll}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.row, style]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: theme.sizes.chipHeight,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1.5],
    paddingHorizontal: theme.spacing[4],
    borderRadius: theme.radius.full,
    borderWidth: theme.sizes.borderWidthThick,
    // Never squeezed inside a ChipRow; opt in to shrinking via `style`.
    flexShrink: 0,
  },
  compact: { gap: theme.spacing[1], paddingHorizontal: theme.spacing[3] },
  label: { flexShrink: 1 },
  // ScrollView defaults to flexGrow: 1 — in a column it would take a share of the
  // screen's height and push the content below it down.
  scroll: { flexGrow: 0, flexShrink: 0 },
  row: { gap: theme.spacing[2], paddingHorizontal: theme.spacing[6] },
});
