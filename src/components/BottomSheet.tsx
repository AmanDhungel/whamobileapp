import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { theme, useTheme } from "@/theme";

import { Button } from "./Button";
import { Text } from "./Text";

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Pinned below the scrollable content (primary actions). */
  footer?: ReactNode;
  /** Wrap content in a ScrollView (default true). */
  scroll?: boolean;
}

/**
 * Modal bottom sheet (web: vaul Drawer / Dialog on mobile). Built on RN Modal so it
 * works in Expo Go without a native bottom-sheet library.
 */
export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  footer,
  scroll = true,
}: BottomSheetProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable
          style={[styles.flex, { backgroundColor: t.colors.overlay }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
        <View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {
              backgroundColor: t.colors.background,
              maxHeight: height * t.sizes.sheetMaxHeightRatio,
              paddingBottom: insets.bottom + t.spacing[4],
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: t.colors.borderStrong }]} />
          <View style={styles.header}>
            <Text variant="h3" style={styles.title} accessibilityRole="header">
              {title ?? ""}
            </Text>
            <Button
              variant="ghost"
              size="icon"
              icon="x"
              accessibilityLabel="Close"
              onPress={onClose}
            />
          </View>
          {scroll ? (
            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          ) : (
            <View style={styles.content}>{children}</View>
          )}
          {footer && <View style={styles.footer}>{footer}</View>}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  sheet: {
    borderTopLeftRadius: theme.radius.tailwindXl,
    borderTopRightRadius: theme.radius.tailwindXl,
    paddingTop: theme.spacing[2],
  },
  handle: {
    alignSelf: "center",
    width: theme.sizes.sheetHandleWidth,
    height: theme.sizes.sheetHandleHeight,
    borderRadius: theme.radius.full,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: theme.spacing[6],
    paddingRight: theme.spacing[3],
    paddingTop: theme.spacing[2],
  },
  title: { flex: 1 },
  content: { paddingHorizontal: theme.spacing[6], paddingVertical: theme.spacing[3] },
  footer: {
    paddingHorizontal: theme.spacing[6],
    paddingTop: theme.spacing[3],
    gap: theme.spacing[3],
  },
});
