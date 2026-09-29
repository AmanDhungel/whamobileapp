import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { theme, useTheme } from "@/theme";

/**
 * Screen-level bottom action bar (web: the md:hidden fixed "Buy · From $X" bar on
 * mobile event pages). Not a tab bar item.
 */
export function StickyActionBar({ children }: { children: ReactNode }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: t.colors.background,
          borderTopColor: t.colors.border,
          paddingBottom: insets.bottom + t.spacing[3],
        },
        t.shadows.md,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[4],
    paddingHorizontal: theme.spacing[6],
    paddingTop: theme.spacing[3],
    borderTopWidth: theme.sizes.hairline,
  },
});
