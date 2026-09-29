import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { theme, useTheme } from "@/theme";

import { Text } from "./Text";

export interface SegmentOption<T extends string> {
  label: string;
  value: T;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}

/** Tab-style switcher (web: shadcn Tabs — Upcoming/Past, Events/Services, …). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  style,
}: SegmentedControlProps<T>) {
  const t = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={[styles.track, { backgroundColor: t.colors.muted }, style]}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={[
              styles.segment,
              selected && [{ backgroundColor: t.colors.background }, t.shadows.sm],
            ]}
          >
            <Text
              variant={selected ? "label" : "bodyMedium"}
              color={selected ? "foreground" : "mutedForeground"}
              numberOfLines={1}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    padding: theme.spacing[1],
    borderRadius: theme.radius.full,
    gap: theme.spacing[1],
  },
  segment: {
    flex: 1,
    height: theme.sizes.segmentHeight - theme.spacing[2],
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing[2],
  },
});
