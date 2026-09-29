import { useRef, useState } from "react";
import { Pressable, TextInput as RNTextInput, StyleSheet, View } from "react-native";

import { theme, useTheme } from "@/theme";

import { Text } from "./Text";

export interface CodeInputProps {
  value: string;
  onChange: (code: string) => void;
  length?: number;
  error?: string;
  autoFocus?: boolean;
  editable?: boolean;
  /** Called once the last digit is entered. */
  onComplete?: (code: string) => void;
}

/**
 * Segmented one-time-code field (the web's InputOTP) for the 6-digit email codes.
 * One hidden TextInput drives the visible cells so paste + SMS/email autofill work.
 */
export function CodeInput({
  value,
  onChange,
  length = 6,
  error,
  autoFocus = false,
  editable = true,
  onComplete,
}: CodeInputProps) {
  const t = useTheme();
  const inputRef = useRef<RNTextInput>(null);
  const [focused, setFocused] = useState(autoFocus);

  const handleChange = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, length);
    onChange(digits);
    if (digits.length === length) onComplete?.(digits);
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => inputRef.current?.focus()}
        style={styles.cells}
        accessibilityLabel={`${length}-digit code`}
        accessibilityHint="Double tap to type the code"
      >
        {Array.from({ length }, (_, i) => {
          const char = value[i] ?? "";
          const isActive = focused && editable && i === Math.min(value.length, length - 1);
          const borderColor = error
            ? t.colors.destructive
            : isActive
              ? t.colors.primary
              : char
                ? t.colors.borderStrong
                : t.colors.border;
          return (
            <View
              key={i}
              style={[
                styles.cell,
                { borderColor, backgroundColor: editable ? t.colors.background : t.colors.muted },
              ]}
            >
              <Text variant="code">{char}</Text>
            </View>
          );
        })}
      </Pressable>
      <RNTextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        maxLength={length}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        autoFocus={autoFocus}
        editable={editable}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        caretHidden
        style={styles.hiddenInput}
      />
      {!!error && (
        <Text variant="caption" color="destructive" align="center">
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: theme.spacing[2], alignSelf: "stretch" },
  cells: { flexDirection: "row", justifyContent: "space-between", gap: theme.spacing[2] },
  cell: {
    flex: 1,
    maxWidth: theme.sizes.codeCellWidth,
    height: theme.sizes.codeCellHeight,
    borderWidth: theme.sizes.borderWidthThick,
    borderRadius: theme.radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  // Kept in the tree (focusable, receives autofill) but visually invisible.
  hiddenInput: {
    position: "absolute",
    width: theme.sizes.hairline,
    height: theme.sizes.hairline,
    opacity: 0,
  },
});
