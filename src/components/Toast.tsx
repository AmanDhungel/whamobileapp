import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ToastMessage, { type ToastConfig, type ToastConfigParams } from "react-native-toast-message";

import { theme, useTheme, type ColorPalette } from "@/theme";

import { Text } from "./Text";

export type ToastKind = "success" | "error" | "info";

const KIND_STYLE: Record<
  ToastKind,
  { icon: keyof typeof Feather.glyphMap; color: keyof ColorPalette; bg: keyof ColorPalette }
> = {
  success: { icon: "check-circle", color: "success", bg: "successMuted" },
  error: { icon: "alert-circle", color: "destructive", bg: "destructiveMuted" },
  info: { icon: "info", color: "secondary", bg: "accent" },
};

/** Fire a toast from anywhere (components, hooks, stores). */
export function showToast({
  type = "info",
  message,
  title,
}: {
  type?: ToastKind;
  message: string;
  title?: string;
}) {
  ToastMessage.show({
    type,
    text1: title ?? message,
    text2: title ? message : undefined,
    visibilityTime: type === "error" ? 5000 : 3500,
  });
}

function ToastCard({ type, text1, text2, hide }: ToastConfigParams<unknown>) {
  const t = useTheme();
  const kind = KIND_STYLE[(type as ToastKind) in KIND_STYLE ? (type as ToastKind) : "info"];
  return (
    <Pressable
      onPress={() => hide()}
      accessibilityRole="alert"
      style={[
        styles.card,
        { backgroundColor: t.colors.card, borderColor: t.colors.border },
        t.shadows.lg,
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: t.colors[kind.bg] }]}>
        <Feather name={kind.icon} size={t.sizes.iconMd} color={t.colors[kind.color]} />
      </View>
      <View style={styles.textWrap}>
        {!!text1 && <Text variant={text2 ? "label" : "bodyMedium"}>{text1}</Text>}
        {!!text2 && (
          <Text variant="caption" color="mutedForeground">
            {text2}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const toastConfig: ToastConfig = {
  success: (params) => <ToastCard {...params} />,
  error: (params) => <ToastCard {...params} />,
  info: (params) => <ToastCard {...params} />,
};

/** Mount once at the root, after the navigator. */
export function ToastHost() {
  const insets = useSafeAreaInsets();
  return <ToastMessage config={toastConfig} topOffset={insets.top + theme.spacing[2]} />;
}

const styles = StyleSheet.create({
  card: {
    width: "92%",
    maxWidth: theme.sizes.contentMaxWidth,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    borderRadius: theme.radius.tailwindLg,
    borderWidth: theme.sizes.borderWidth,
  },
  iconWrap: {
    width: theme.spacing[8],
    height: theme.spacing[8],
    borderRadius: theme.radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: { flex: 1, gap: theme.spacing[0.5] },
});
