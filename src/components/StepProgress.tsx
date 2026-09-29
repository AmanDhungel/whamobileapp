import { StyleSheet, View } from "react-native";

import { theme, useTheme } from "@/theme";

/** Thin top progress bar (web business signup: gradient bar, width = (step-1)/(total-1)). */
export function StepProgress({ step, total }: { step: number; total: number }) {
  const t = useTheme();
  const fraction = total > 1 ? Math.min(1, Math.max(0, (step - 1) / (total - 1))) : 1;
  return (
    <View
      style={[styles.track, { backgroundColor: t.colors.muted }]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: total, now: step }}
    >
      <View
        style={[styles.fill, { width: `${fraction * 100}%`, backgroundColor: t.colors.secondary }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: theme.sizes.progressHeight, width: "100%" },
  fill: { height: "100%" },
});
