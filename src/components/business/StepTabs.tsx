import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { theme, useTheme } from "@/theme";

import { Text } from "../Text";

export interface StepTab<K extends string> {
  key: K;
  label: string;
  /** Red dot — this step has a validation error. */
  hasError?: boolean;
}

export interface StepTabsProps<K extends string> {
  steps: readonly StepTab<K>[];
  active: K;
  onChange: (key: K) => void;
}

/**
 * Wizard step chips with free navigation and a red dot on every step that has an error
 * (web EventsForm section tabs, L538-558).
 */
export function StepTabs<K extends string>({ steps, active, onChange }: StepTabsProps<K>) {
  const t = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.row}
    >
      {steps.map((s, i) => {
        const selected = s.key === active;
        return (
          <Pressable
            key={s.key}
            onPress={() => onChange(s.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={`Step ${i + 1}: ${s.label}${s.hasError ? ", has errors" : ""}`}
            style={[
              styles.tab,
              {
                backgroundColor: selected ? t.colors.primary : t.colors.muted,
                borderColor: s.hasError ? t.colors.destructive : t.colors.transparent,
              },
            ]}
          >
            <Text variant="captionMedium" color={selected ? "primaryForeground" : "foreground"}>
              {i + 1}. {s.label}
            </Text>
            {s.hasError && <View style={[styles.dot, { backgroundColor: t.colors.destructive }]} />}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0, flexShrink: 0 },
  row: {
    gap: theme.spacing[2],
    paddingHorizontal: theme.spacing[6],
    paddingVertical: theme.spacing[2],
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1.5],
    height: theme.sizes.chipHeight,
    paddingHorizontal: theme.spacing[3],
    borderRadius: theme.radius.full,
    borderWidth: theme.sizes.borderWidthThick,
  },
  dot: {
    width: theme.sizes.badgeDot,
    height: theme.sizes.badgeDot,
    borderRadius: theme.radius.full,
  },
});
