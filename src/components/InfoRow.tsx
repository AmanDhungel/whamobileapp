import { Feather } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { theme, useTheme } from "@/theme";

import { Text } from "./Text";
import { TextLink } from "./TextLink";

export interface InfoRowProps {
  icon: keyof typeof Feather.glyphMap;
  /** Small label above the value, e.g. "Valid Until". */
  label?: string;
  value: ReactNode;
  action?: { label: string; onPress: () => void };
}

/** Icon + (label) + value line used on detail screens (date, time, venue, …). */
export function InfoRow({ icon, label, value, action }: InfoRowProps) {
  const t = useTheme();
  return (
    <View style={styles.row}>
      <View style={[styles.icon, { backgroundColor: t.colors.accent }]}>
        <Feather name={icon} size={t.sizes.iconSm} color={t.colors.accentForeground} />
      </View>
      <View style={styles.text}>
        {!!label && (
          <Text variant="caption" color="mutedForeground">
            {label}
          </Text>
        )}
        {typeof value === "string" ? <Text variant="bodySm">{value}</Text> : value}
        {action && <TextLink onPress={action.onPress}>{action.label}</TextLink>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: theme.spacing[3] },
  icon: {
    width: theme.sizes.iconButtonSm,
    height: theme.sizes.iconButtonSm,
    borderRadius: theme.radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { flex: 1, gap: theme.spacing[0.5], paddingTop: theme.spacing[1] },
});
