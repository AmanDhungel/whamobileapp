import { StyleSheet, View } from "react-native";

import { theme, useTheme } from "@/theme";

import { Text } from "./Text";

export function OrDivider({ label = "OR" }: { label?: string }) {
  const t = useTheme();
  return (
    <View style={styles.row} accessibilityRole="none">
      <View style={[styles.line, { backgroundColor: t.colors.border }]} />
      <Text variant="captionMedium" color="mutedForeground">
        {label}
      </Text>
      <View style={[styles.line, { backgroundColor: t.colors.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: theme.spacing[3] },
  line: { flex: 1, height: theme.sizes.hairline },
});
