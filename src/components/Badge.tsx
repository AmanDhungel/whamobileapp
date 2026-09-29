import { Feather } from "@expo/vector-icons";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { theme, useTheme, type ColorPalette } from "@/theme";

import { Text } from "./Text";

export type BadgeTone =
  "default" | "primary" | "info" | "success" | "warning" | "destructive" | "onImage";

const TONES: Record<BadgeTone, { bg: keyof ColorPalette; fg: keyof ColorPalette }> = {
  default: { bg: "muted", fg: "foreground" },
  primary: { bg: "primary", fg: "primaryForeground" },
  info: { bg: "accent", fg: "accentForeground" },
  success: { bg: "successMuted", fg: "success" },
  warning: { bg: "warningMuted", fg: "warning" },
  destructive: { bg: "destructiveMuted", fg: "destructive" },
  onImage: { bg: "secondary", fg: "secondaryForeground" },
};

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  icon?: keyof typeof Feather.glyphMap;
  style?: StyleProp<ViewStyle>;
}

/** Small status/label pill (web: shadcn Badge). */
export function Badge({ label, tone = "default", icon, style }: BadgeProps) {
  const t = useTheme();
  const c = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.colors[c.bg] }, style]}>
      {icon && <Feather name={icon} size={t.sizes.starSm} color={t.colors[c.fg]} />}
      <Text variant="captionMedium" color={c.fg} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: theme.spacing[1],
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[0.5],
    borderRadius: theme.radius.full,
  },
});
