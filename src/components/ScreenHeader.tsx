import { router } from "expo-router";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { theme } from "@/theme";

import { Button } from "./Button";
import { Text } from "./Text";

export interface ScreenHeaderProps {
  title?: string;
  /** Right-side actions (e.g. share / favourite buttons). */
  right?: ReactNode;
  /** Defaults to router.back(), or Home when there's no history (deep links). */
  onBack?: () => void;
  showBack?: boolean;
}

/** Compact stack-screen header: back · title · actions. */
export function ScreenHeader({ title, right, onBack, showBack = true }: ScreenHeaderProps) {
  const goBack = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace("/")));
  return (
    <View style={styles.row}>
      {showBack ? (
        <Button
          variant="ghost"
          size="icon"
          icon="arrow-left"
          accessibilityLabel="Go back"
          onPress={goBack}
        />
      ) : (
        <View style={styles.spacer} />
      )}
      <Text variant="title" numberOfLines={1} style={styles.title} accessibilityRole="header">
        {title ?? ""}
      </Text>
      <View style={styles.right}>{right ?? <View style={styles.spacer} />}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
  },
  title: { flex: 1, textAlign: "center" },
  right: { flexDirection: "row", alignItems: "center", gap: theme.spacing[1] },
  spacer: { width: theme.sizes.buttonHeightSm },
});
