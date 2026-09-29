import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, View, type DimensionValue } from "react-native";

import { theme, useTheme } from "@/theme";

import { Text } from "./Text";

export interface SelectableTileProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: keyof typeof Feather.glyphMap;
  disabled?: boolean;
  width?: DimensionValue;
  /** "stacked" = icon above label (category grid); "inline" = label + check (community list). */
  layout?: "stacked" | "inline";
}

/** Selectable option card with a check badge (web signup category / community buttons). */
export function SelectableTile({
  label,
  selected,
  onPress,
  icon,
  disabled = false,
  width,
  layout = "stacked",
}: SelectableTileProps) {
  const t = useTheme();
  const tint = selected ? t.colors.primary : t.colors.mutedForeground;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        layout === "stacked" ? styles.stacked : styles.inline,
        {
          width,
          borderColor: selected ? t.colors.primary : t.colors.border,
          backgroundColor: selected ? t.colors.accent : t.colors.background,
        },
        (disabled || pressed) && { opacity: disabled ? t.opacity.disabled : t.opacity.pressed },
      ]}
    >
      {icon && layout === "stacked" && <Feather name={icon} size={t.sizes.iconXl} color={tint} />}
      <Text
        variant={selected ? "label" : "bodyMedium"}
        color={selected ? "primary" : "foreground"}
        align={layout === "stacked" ? "center" : "left"}
        style={layout === "inline" && styles.flex}
        numberOfLines={2}
      >
        {label}
      </Text>
      {selected && (
        <View
          style={[
            layout === "stacked" ? styles.checkCorner : undefined,
            styles.check,
            { backgroundColor: t.colors.primary },
          ]}
        >
          <Feather name="check" size={t.sizes.iconXs} color={t.colors.primaryForeground} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stacked: {
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing[2],
    minHeight: theme.sizes.categoryTile,
    padding: theme.spacing[3],
    borderWidth: theme.sizes.borderWidthBold,
    borderRadius: theme.radius.tailwindLg,
  },
  inline: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    padding: theme.spacing[3],
    borderWidth: theme.sizes.borderWidthBold,
    borderRadius: theme.radius.xl,
  },
  checkCorner: { position: "absolute", top: theme.spacing[2], right: theme.spacing[2] },
  check: {
    width: theme.sizes.checkBadge,
    height: theme.sizes.checkBadge,
    borderRadius: theme.radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  flex: { flex: 1 },
});
