import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type RefreshControlProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { theme, useTheme } from "@/theme";

export interface ScreenProps {
  children: ReactNode;
  /** Wrap content in a ScrollView (default true). */
  scroll?: boolean;
  /** Safe-area edges to pad. Tab screens drop "bottom" (the tab bar handles it). */
  edges?: Edge[];
  /** Horizontal + vertical content padding (default true). */
  padded?: boolean;
  /** Vertically centre content that is shorter than the screen. */
  centered?: boolean;
  /** Pinned below the scroll area, above the keyboard (e.g. a primary action). */
  footer?: ReactNode;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  contentStyle?: StyleProp<ViewStyle>;
}

/** Safe area + keyboard avoidance + optional scrolling, used by every screen. */
export function Screen({
  children,
  scroll = true,
  edges = ["top", "bottom"],
  padded = true,
  centered = false,
  footer,
  refreshControl,
  contentStyle,
}: ScreenProps) {
  const t = useTheme();

  const content = [
    styles.content,
    padded && styles.padded,
    centered && styles.centered,
    contentStyle,
  ];

  return (
    <SafeAreaView edges={edges} style={[styles.flex, { backgroundColor: t.colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {scroll ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.grow, content]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
            refreshControl={refreshControl}
          >
            <View style={styles.maxWidth}>{children}</View>
          </ScrollView>
        ) : (
          <View style={[styles.flex, content]}>
            <View style={[styles.maxWidth, styles.flex]}>{children}</View>
          </View>
        )}
        {footer && (
          <View style={[styles.footer, styles.padded]}>
            <View style={styles.maxWidth}>{footer}</View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grow: { flexGrow: 1 },
  content: { alignItems: "center" },
  padded: { paddingHorizontal: theme.spacing[6], paddingVertical: theme.spacing[4] },
  centered: { justifyContent: "center" },
  maxWidth: { width: "100%", maxWidth: theme.sizes.contentMaxWidth },
  footer: { alignItems: "center" },
});
