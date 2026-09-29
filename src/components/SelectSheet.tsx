import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { theme, useTheme } from "@/theme";

import { BottomSheet } from "./BottomSheet";
import { Text } from "./Text";

export interface SelectOption<T> {
  label: string;
  value: T;
  icon?: keyof typeof Feather.glyphMap;
  description?: string;
}

export interface SelectSheetProps<T> {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: readonly SelectOption<T>[];
  value: T;
  onSelect: (value: T) => void;
}

/** Single-choice picker in a bottom sheet (city, category, time, sort …). */
export function SelectSheet<T>({
  visible,
  onClose,
  title,
  options,
  value,
  onSelect,
}: SelectSheetProps<T>) {
  const t = useTheme();
  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      <View accessibilityRole="radiogroup">
        {options.map((opt, i) => {
          const selected = opt.value === value;
          return (
            <Pressable
              key={`${opt.label}-${i}`}
              onPress={() => {
                onSelect(opt.value);
                onClose();
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              style={({ pressed }) => [
                styles.option,
                { borderBottomColor: t.colors.divider },
                pressed && { backgroundColor: t.colors.muted },
              ]}
            >
              {opt.icon && (
                <Feather
                  name={opt.icon}
                  size={t.sizes.iconMd}
                  color={selected ? t.colors.primary : t.colors.mutedForeground}
                />
              )}
              <View style={styles.text}>
                <Text variant={selected ? "label" : "bodyMedium"}>{opt.label}</Text>
                {!!opt.description && (
                  <Text variant="caption" color="mutedForeground">
                    {opt.description}
                  </Text>
                )}
              </View>
              {selected && <Feather name="check" size={t.sizes.iconMd} color={t.colors.primary} />}
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    paddingVertical: theme.spacing[4],
    borderBottomWidth: theme.sizes.hairline,
  },
  text: { flex: 1, gap: theme.spacing[0.5] },
});
