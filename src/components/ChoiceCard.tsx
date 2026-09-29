import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { theme, useTheme } from "@/theme";

import { Text } from "./Text";

export interface ChoiceCardProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
}

/** The web AuthChoicePage card: icon tile, title + description, chevron. */
export function ChoiceCard({ icon, title, description, onPress }: ChoiceCardProps) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={description}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: t.colors.card,
          borderColor: pressed ? t.colors.primary : t.colors.border,
        },
        pressed && t.shadows.md,
      ]}
    >
      <View style={[styles.iconTile, { backgroundColor: t.colors.muted }]}>
        <Feather name={icon} size={t.sizes.iconXl} color={t.colors.primary} />
      </View>
      <View style={styles.text}>
        <Text variant="title">{title}</Text>
        <Text variant="caption" color="mutedForeground">
          {description}
        </Text>
      </View>
      <Feather name="chevron-right" size={t.sizes.iconMd} color={t.colors.mutedForeground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[4],
    padding: theme.spacing[6],
    borderRadius: theme.radius.tailwindLg,
    borderWidth: theme.sizes.borderWidthThick,
  },
  iconTile: {
    width: theme.sizes.choiceIcon,
    height: theme.sizes.choiceIcon,
    borderRadius: theme.radius.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { flex: 1, gap: theme.spacing[1] },
});
