import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet } from "react-native";

import { theme, useTheme } from "@/theme";

import { SelectSheet, type SelectOption } from "./SelectSheet";
import { Text } from "./Text";

export interface SelectFieldProps<T> {
  /** Sheet title / accessibility label. */
  title: string;
  options: readonly SelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
  flex?: boolean;
}

/** Dropdown-style field that opens a SelectSheet (web: native <select>). */
export function SelectField<T>({ title, options, value, onChange, flex }: SelectFieldProps<T>) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${title}: ${current?.label ?? "not set"}`}
        style={({ pressed }) => [
          styles.field,
          flex && styles.flex,
          { borderColor: t.colors.border, backgroundColor: t.colors.background },
          pressed && { backgroundColor: t.colors.muted },
        ]}
      >
        <Text variant="bodyMedium" style={styles.flex} numberOfLines={1}>
          {current?.label ?? "Select"}
        </Text>
        <Feather name="chevron-down" size={t.sizes.iconSm} color={t.colors.mutedForeground} />
      </Pressable>
      <SelectSheet
        visible={open}
        onClose={() => setOpen(false)}
        title={title}
        options={options}
        value={value}
        onSelect={onChange}
      />
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: theme.sizes.selectFieldHeight,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    paddingHorizontal: theme.spacing[3],
    borderWidth: theme.sizes.borderWidthThick,
    borderRadius: theme.radius.lg,
  },
  flex: { flex: 1 },
});
