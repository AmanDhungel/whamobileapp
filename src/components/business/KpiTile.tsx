import { Feather } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

import { theme, useTheme, type ColorPalette } from "@/theme";

import { Card } from "../Card";
import { Text } from "../Text";

export interface KpiTileProps {
  label: string;
  value: string;
  icon: keyof typeof Feather.glyphMap;
  caption?: string;
  /** Icon colour (and its muted background). Default the brand blue. */
  tone?: "info" | "success" | "warning";
}

const TONES: Record<NonNullable<KpiTileProps["tone"]>, [keyof ColorPalette, keyof ColorPalette]> = {
  info: ["whaBlue", "accent"],
  success: ["success", "successMuted"],
  warning: ["warning", "warningMuted"],
};

/** Overview stat: icon, big value, label, optional caption. */
export function KpiTile({ label, value, icon, caption, tone = "info" }: KpiTileProps) {
  const t = useTheme();
  const [fg, bg] = TONES[tone];
  return (
    <Card style={styles.card}>
      <View style={[styles.icon, { backgroundColor: t.colors[bg] }]}>
        <Feather name={icon} size={t.sizes.iconMd} color={t.colors[fg]} />
      </View>
      <Text variant="h3" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text variant="captionMedium" color="mutedForeground" numberOfLines={1}>
        {label}
      </Text>
      {!!caption && (
        <Text variant="caption" color="mutedForeground" numberOfLines={1}>
          {caption}
        </Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: theme.spacing[1] },
  icon: {
    width: theme.sizes.iconButton,
    height: theme.sizes.iconButton,
    borderRadius: theme.radius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing[1],
  },
});
