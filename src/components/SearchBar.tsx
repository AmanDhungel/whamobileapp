import { Feather } from "@expo/vector-icons";
import { Pressable, TextInput as RNTextInput, StyleSheet, View } from "react-native";

import { theme, useTheme } from "@/theme";

export interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
  autoFocus?: boolean;
}

/** Rounded search field with a clear button. */
export function SearchBar({
  value,
  onChangeText,
  placeholder = "Search",
  onSubmit,
  autoFocus,
}: SearchBarProps) {
  const t = useTheme();
  return (
    <View style={[styles.bar, { backgroundColor: t.colors.muted }]}>
      <Feather name="search" size={t.sizes.iconMd} color={t.colors.mutedForeground} />
      <RNTextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={t.colors.mutedForeground}
        selectionColor={t.colors.secondary}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        autoFocus={autoFocus}
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="never"
        accessibilityLabel={placeholder}
        style={[styles.input, t.typography.variants.input, { color: t.colors.foreground }]}
      />
      {value.length > 0 && (
        <Pressable
          onPress={() => onChangeText("")}
          hitSlop={t.spacing[2]}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <Feather name="x-circle" size={t.sizes.iconMd} color={t.colors.mutedForeground} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: theme.sizes.searchBarHeight,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    paddingHorizontal: theme.spacing[4],
    borderRadius: theme.radius.full,
  },
  input: { flex: 1, paddingVertical: 0 },
});
