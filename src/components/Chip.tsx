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
}

/** Filter / choice pill. Selected = navy fill (web active chip). */
export function Chip({ label, selected = false, onPress, icon, dropdown }: ChipProps) {
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
        {
          backgroundColor: selected ? t.colors.primary : t.colors.background,
          borderColor: selected ? t.colors.primary : t.colors.border,
        },
        pressed && { opacity: t.opacity.pressed },
      ]}
    >
      {icon && <Feather name={icon} size={t.sizes.iconSm} color={fg} />}
      <Text variant="captionMedium" style={{ color: fg }} numberOfLines={1}>
        {label}
      </Text>
      {dropdown && <Feather name="chevron-down" size={t.sizes.iconSm} color={fg} />}
    </Pressable>
  );
}

/** Horizontally scrolling row of chips that bleeds to the screen edges. */
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
  },
  row: { gap: theme.spacing[2], paddingHorizontal: theme.spacing[6] },
});
