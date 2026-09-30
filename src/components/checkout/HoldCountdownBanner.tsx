import { Feather } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

import { theme, useTheme } from "@/theme";
import { formatCountdown } from "@/utils/format";

import { Text } from "../Text";

/** Web hold banner (amber): "Your tickets are on hold for MM:SS — complete payment…". */
export function HoldCountdownBanner({ secondsLeft }: { secondsLeft: number }) {
  const t = useTheme();
  return (
    <View
      style={[
        styles.banner,
        { backgroundColor: t.colors.warningMuted, borderColor: t.colors.warning },
      ]}
      accessibilityRole="timer"
      accessibilityLiveRegion="polite"
    >
      <Feather name="clock" size={t.sizes.iconMd} color={t.colors.warning} />
      <Text variant="caption" style={styles.text}>
        Your tickets are on hold for <Text variant="label">{formatCountdown(secondsLeft)}</Text> —
        complete payment before time runs out.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    padding: theme.spacing[3],
    borderWidth: theme.sizes.hairline,
    borderRadius: theme.radius.xl,
  },
  text: { flex: 1 },
});
