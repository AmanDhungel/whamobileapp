import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { theme, useTheme, type ColorPalette } from "@/theme";

import { Text } from "./Text";

export interface ListRowProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  /** Secondary text under the label. */
  detail?: string;
  color?: keyof ColorPalette;
  onPress: () => void;
  disabled?: boolean;
  /** Show the trailing chevron (default true). */
  chevron?: boolean;
}

/** Tappable settings-style row: icon · label (+detail) · chevron. */
export function ListRow({
  icon,
  label,
  detail,
  color = "foreground",
  onPress,
  disabled,
  chevron = true,
}: ListRowProps) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.row,
        pressed && { backgroundColor: t.colors.muted },
        disabled && { opacity: t.opacity.disabled },
      ]}
    >
      <Feather name={icon} size={t.sizes.iconMd} color={t.colors[color]} />
      <View style={styles.text}>
        <Text variant="bodyMedium" color={color}>
          {label}
        </Text>
        {!!detail && (
          <Text variant="caption" color="mutedForeground" numberOfLines={1}>
            {detail}
          </Text>
        )}
      </View>
      {chevron && (
        <Feather name="chevron-right" size={t.sizes.iconMd} color={t.colors.mutedForeground} />
      )}
    </Pressable>
  );
}

export function ListDivider() {
  const t = useTheme();
  return <View style={[styles.divider, { backgroundColor: t.colors.divider }]} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    paddingVertical: theme.spacing[4],
    paddingHorizontal: theme.spacing[5],
  },
  text: { flex: 1, gap: theme.spacing[0.5] },
  divider: { height: theme.sizes.hairline, marginLeft: theme.spacing[5] },
});
