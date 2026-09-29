import { Feather } from "@expo/vector-icons";
import { forwardRef, useState, type ReactNode } from "react";
import {
  Pressable,
  TextInput as RNTextInput,
  StyleSheet,
  View,
  type StyleProp,
  type TextInputProps as RNTextInputProps,
  type ViewStyle,
} from "react-native";

import { theme, useTheme } from "@/theme";

import { Text } from "./Text";

export interface TextInputProps extends RNTextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  /** Renders the eye / eye-off visibility toggle and hides the text by default. */
  password?: boolean;
  /** Trailing element inside the field (e.g. a spinner or check mark). */
  accessory?: ReactNode;
  /** Leading element inside the field (e.g. a "+61" prefix). */
  prefix?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}

/** Web LoginPage/Signup input: 1.5px border, focus → primary, error text below. */
export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput(
  {
    label,
    error,
    hint,
    password = false,
    accessory,
    prefix,
    containerStyle,
    editable = true,
    onFocus,
    onBlur,
    style,
    ...rest
  },
  ref,
) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const borderColor = error ? t.colors.destructive : focused ? t.colors.primary : t.colors.border;

  return (
    <View style={[styles.container, containerStyle]}>
      {!!label && <Text variant="label">{label}</Text>}
      <View
        style={[
          styles.field,
          {
            borderColor,
            backgroundColor: editable ? t.colors.background : t.colors.muted,
          },
        ]}
      >
        {prefix}
        <RNTextInput
          ref={ref}
          editable={editable}
          placeholderTextColor={t.colors.mutedForeground}
          selectionColor={t.colors.secondary}
          secureTextEntry={password && !revealed}
          autoCorrect={password ? false : rest.autoCorrect}
          accessibilityLabel={label ?? rest.accessibilityLabel}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, t.typography.variants.input, { color: t.colors.foreground }, style]}
          {...rest}
        />
        {password && (
          <Pressable
            onPress={() => setRevealed((v) => !v)}
            hitSlop={t.spacing[3]}
            accessibilityRole="button"
            accessibilityLabel={revealed ? "Hide password" : "Show password"}
            style={styles.toggle}
          >
            <Feather
              name={revealed ? "eye-off" : "eye"}
              size={t.sizes.iconMd}
              color={t.colors.mutedForeground}
            />
          </Pressable>
        )}
        {accessory}
      </View>
      {error ? (
        <Text variant="caption" color="destructive" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" color="mutedForeground">
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: theme.spacing[1.5], alignSelf: "stretch" },
  field: {
    minHeight: theme.sizes.inputHeight,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: theme.sizes.borderWidthThick,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing[4],
  },
  input: { flex: 1, paddingVertical: theme.spacing[3] },
  toggle: { paddingLeft: theme.spacing[3] },
});
