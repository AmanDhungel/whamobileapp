import { Feather } from "@expo/vector-icons";
import { Fragment } from "react";
import { StyleSheet, View } from "react-native";

import { theme, useTheme } from "@/theme";

import { Text } from "../Text";

export interface CheckoutStepDef {
  key: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
}

/**
 * Web StepIndicator (EventCheckOut.tsx): icon circles, navy = current, green check =
 * done, grey outline = upcoming, joined by a line that turns green as steps complete.
 */
export function StepIndicator({ steps, current }: { steps: CheckoutStepDef[]; current: string }) {
  const t = useTheme();
  const currentIndex = Math.max(
    0,
    steps.findIndex((s) => s.key === current),
  );

  return (
    <View style={styles.row} accessibilityLabel={`Step ${currentIndex + 1} of ${steps.length}`}>
      {steps.map((s, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        const bg = done ? t.colors.success : active ? t.colors.primary : t.colors.background;
        const border = done ? t.colors.success : active ? t.colors.primary : t.colors.borderStrong;
        const fg = done || active ? t.colors.primaryForeground : t.colors.mutedForeground;
        return (
          <Fragment key={s.key}>
            {i > 0 && (
              <View
                style={[
                  styles.line,
                  { backgroundColor: i <= currentIndex ? t.colors.success : t.colors.border },
                ]}
              />
            )}
            <View style={styles.step}>
              <View style={[styles.circle, { backgroundColor: bg, borderColor: border }]}>
                <Feather name={done ? "check" : s.icon} size={t.sizes.iconSm} color={fg} />
              </View>
              <Text variant="captionMedium" color={active ? "foreground" : "mutedForeground"}>
                {s.label}
              </Text>
            </View>
          </Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start" },
  step: { alignItems: "center", gap: theme.spacing[1] },
  circle: {
    width: theme.sizes.iconButtonSm,
    height: theme.sizes.iconButtonSm,
    borderRadius: theme.radius.full,
    borderWidth: theme.sizes.borderWidthThick,
    alignItems: "center",
    justifyContent: "center",
  },
  line: {
    flex: 1,
    height: theme.sizes.borderWidthBold,
    marginTop: theme.sizes.iconButtonSm / 2,
    marginHorizontal: theme.spacing[1],
  },
});
