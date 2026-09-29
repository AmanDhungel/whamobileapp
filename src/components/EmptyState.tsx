import { Feather } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { theme, useTheme, type ColorPalette } from "@/theme";

import { Text } from "./Text";

export interface EmptyStateProps {
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  message?: string;
  /** Usually one or two <Button>s. */
  action?: ReactNode;
  tone?: "default" | "error";
}

export function EmptyState({
  icon = "inbox",
  title,
  message,
  action,
  tone = "default",
}: EmptyStateProps) {
  const t = useTheme();
  const iconColor: keyof ColorPalette = tone === "error" ? "destructive" : "whaBlue";
  const iconBg: keyof ColorPalette = tone === "error" ? "destructiveMuted" : "accent";
  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: t.colors[iconBg] }]}>
        <Feather name={icon} size={t.sizes.iconXl} color={t.colors[iconColor]} />
      </View>
      <View style={styles.text}>
        <Text variant="h3" align="center">
          {title}
        </Text>
        {!!message && (
          <Text variant="bodySm" color="mutedForeground" align="center">
            {message}
          </Text>
        )}
      </View>
      {action && <View style={styles.action}>{action}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing[4],
    paddingHorizontal: theme.spacing[6],
    paddingVertical: theme.spacing[10],
  },
  iconWrap: {
    width: theme.spacing[16],
    height: theme.spacing[16],
    borderRadius: theme.radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { gap: theme.spacing[2], alignItems: "center" },
  action: { alignSelf: "stretch", gap: theme.spacing[3], marginTop: theme.spacing[2] },
});
