import { Feather } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { theme, useTheme } from "@/theme";

import { Text } from "./Text";

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Plain string, or rich content (e.g. text with inline links). */
  label?: ReactNode;
  error?: string;
  disabled?: boolean;
}

export function Checkbox({ checked, onChange, label, error, disabled = false }: CheckboxProps) {
  const t = useTheme();
  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => onChange(!checked)}
        disabled={disabled}
        accessibilityRole="checkbox"
        accessibilityState={{ checked, disabled }}
        hitSlop={t.spacing[1]}
        style={styles.row}
      >
        <View
          style={[
            styles.box,
            {
              borderColor: error
                ? t.colors.destructive
                : checked
                  ? t.colors.primary
                  : t.colors.borderStrong,
              backgroundColor: checked ? t.colors.primary : t.colors.background,
            },
            disabled && { opacity: t.opacity.disabled },
          ]}
        >
          {checked && (
            <Feather name="check" size={t.sizes.iconSm - 2} color={t.colors.primaryForeground} />
          )}
        </View>
        {typeof label === "string" ? (
          <Text variant="caption" color="mutedForeground" style={styles.label}>
            {label}
          </Text>
        ) : (
          <View style={styles.label}>{label}</View>
        )}
      </Pressable>
      {!!error && (
        <Text variant="caption" color="destructive">
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: theme.spacing[1.5] },
  row: { flexDirection: "row", alignItems: "flex-start", gap: theme.spacing[3] },
  box: {
    width: theme.sizes.checkbox,
    height: theme.sizes.checkbox,
    borderRadius: theme.radius.sm,
    borderWidth: theme.sizes.borderWidthThick,
    alignItems: "center",
    justifyContent: "center",
    marginTop: theme.spacing[0.5],
  },
  label: { flex: 1 },
});
