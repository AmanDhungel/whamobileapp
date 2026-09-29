import { ActivityIndicator, StyleSheet, View } from "react-native";

import { theme, useTheme } from "@/theme";

import { Text } from "./Text";

export interface LoaderProps {
  /** Fill the parent and centre the spinner (default true). */
  fullScreen?: boolean;
  message?: string;
  size?: "small" | "large";
}

export function Loader({ fullScreen = true, message, size = "large" }: LoaderProps) {
  const t = useTheme();
  return (
    <View
      style={[styles.base, fullScreen && [styles.full, { backgroundColor: t.colors.background }]]}
      accessibilityRole="progressbar"
      accessibilityLabel={message ?? "Loading"}
    >
      <ActivityIndicator size={size} color={t.colors.primary} />
      {!!message && (
        <Text variant="bodySm" color="mutedForeground" align="center">
          {message}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing[3],
    padding: theme.spacing[4],
  },
  full: { flex: 1 },
});
