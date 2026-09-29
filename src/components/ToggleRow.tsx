import { StyleSheet, Switch, View } from "react-native";

import { theme, useTheme } from "@/theme";

import { Text } from "./Text";

export interface ToggleRowProps {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  /** Highlight the row when on (web: "Open 24/7" card). */
  highlighted?: boolean;
}

/** Label + themed switch (web: shadcn Switch). */
export function ToggleRow({ label, description, value, onChange, highlighted }: ToggleRowProps) {
  const t = useTheme();
  const active = highlighted && value;
  return (
    <View
      style={[
        styles.row,
        {
          borderColor: active ? t.colors.primary : t.colors.border,
          backgroundColor: active ? t.colors.accent : t.colors.background,
        },
      ]}
    >
      <View style={styles.text}>
        <Text variant="label">{label}</Text>
        {!!description && (
          <Text variant="caption" color="mutedForeground">
            {description}
          </Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ false: t.colors.borderStrong, true: t.colors.primary }}
        thumbColor={t.colors.background}
        ios_backgroundColor={t.colors.borderStrong}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    padding: theme.spacing[4],
    borderWidth: theme.sizes.borderWidthThick,
    borderRadius: theme.radius.xl,
  },
  text: { flex: 1, gap: theme.spacing[0.5] },
});
