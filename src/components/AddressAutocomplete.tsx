import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { useAddressSearch } from "@/hooks/useAddressSearch";
import type { AddressSuggestion } from "@/services/geocoding";
import { theme, useTheme } from "@/theme";

import { Text } from "./Text";
import { TextInput } from "./TextInput";

export interface AddressAutocompleteProps {
  label: string;
  /** The currently selected address label (if any). */
  value?: string;
  onSelect: (suggestion: AddressSuggestion | null) => void;
  error?: string;
  placeholder?: string;
}

/**
 * Search-and-pick address field (Australia only). Typing clears the previous pick —
 * the address only counts once chosen from the list, like the website.
 * Provider calls go through src/services/geocoding (debounced, ≥3 chars, cancellable).
 */
export function AddressAutocomplete({
  label,
  value = "",
  onSelect,
  error,
  placeholder = "e.g. 115 George Street, Sydney NSW",
}: AddressAutocompleteProps) {
  const t = useTheme();
  const [query, setQuery] = useState(value);
  const [picked, setPicked] = useState(!!value);
  const [touched, setTouched] = useState(false);
  const search = useAddressSearch(query, !picked);

  const onChangeText = (text: string) => {
    setQuery(text);
    setTouched(true);
    if (picked) {
      setPicked(false);
      onSelect(null);
    }
  };

  const choose = (s: AddressSuggestion) => {
    setQuery(s.label);
    setPicked(true);
    onSelect(s);
  };

  const shownError =
    touched && query.trim().length > 0 && !picked && !search.loading && !search.pending
      ? "Please select an address from the dropdown"
      : error;

  return (
    <View style={styles.container}>
      <TextInput
        label={label}
        value={query}
        onChangeText={onChangeText}
        placeholder={placeholder}
        autoCorrect={false}
        error={shownError}
        hint={
          picked
            ? undefined
            : search.tooShort
              ? "Keep typing — at least 3 characters."
              : "Search and select from the dropdown — Australia only."
        }
        accessory={
          search.loading ? (
            <ActivityIndicator size="small" color={t.colors.primary} />
          ) : picked ? (
            <Feather name="check" size={t.sizes.iconSm} color={t.colors.success} />
          ) : null
        }
      />
      {!picked && search.error && (
        <Text variant="caption" color="destructive">
          {search.error}
        </Text>
      )}
      {!picked && search.suggestions.length > 0 && (
        <View
          style={[
            styles.list,
            { borderColor: t.colors.border, backgroundColor: t.colors.popover },
            t.shadows.md,
          ]}
        >
          {search.suggestions.map((s, i) => (
            <Pressable
              key={s.id}
              onPress={() => choose(s)}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.item,
                i > 0 && { borderTopWidth: t.sizes.hairline, borderTopColor: t.colors.divider },
                pressed && { backgroundColor: t.colors.accent },
              ]}
            >
              <Feather name="map-pin" size={t.sizes.iconSm} color={t.colors.mutedForeground} />
              <Text variant="bodySm" style={styles.itemText}>
                {s.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: theme.spacing[2] },
  list: {
    borderWidth: theme.sizes.hairline,
    borderRadius: theme.radius.xl,
    overflow: "hidden",
  },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing[2],
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
  },
  itemText: { flex: 1 },
});
