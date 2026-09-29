import { Feather } from "@expo/vector-icons";
import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { theme, useTheme, type ColorPalette } from "@/theme";

import { Text } from "./Text";

export type ButtonVariant = "default" | "outline" | "ghost" | "destructive" | "secondary";
export type ButtonSize = "default" | "sm" | "lg" | "icon";

export interface ButtonProps extends Omit<PressableProps, "style" | "children"> {
  title?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** Label shown while loading (web pattern: "Signing in…"). Defaults to `title`. */
  loadingTitle?: string;
  icon?: keyof typeof Feather.glyphMap;
  /** Custom leading element (e.g. the Google "G"), used instead of `icon`. */
  leading?: ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const VARIANTS: Record<
  ButtonVariant,
  {
    bg: keyof ColorPalette;
    fg: keyof ColorPalette;
    border: keyof ColorPalette;
    pressed: keyof ColorPalette;
  }
> = {
  default: { bg: "primary", fg: "primaryForeground", border: "primary", pressed: "whaBlueDark" },
  secondary: {
    bg: "secondary",
    fg: "secondaryForeground",
    border: "secondary",
    pressed: "whaBlueDark",
  },
  outline: { bg: "background", fg: "primary", border: "border", pressed: "muted" },
  ghost: { bg: "transparent", fg: "primary", border: "transparent", pressed: "muted" },
  destructive: {
    bg: "destructive",
    fg: "destructiveForeground",
    border: "destructive",
    pressed: "destructive",
  },
};

const HEIGHTS: Record<ButtonSize, number> = {
  default: theme.sizes.buttonHeight,
  sm: theme.sizes.buttonHeightSm,
  lg: theme.sizes.buttonHeightLg,
  icon: theme.sizes.buttonHeightSm,
};

/**
 * The website's one Button (components/ui/button.tsx): pill-shaped, scales to 0.95
 * on press, 50% opacity when disabled. Hover-invert becomes the pressed colour.
 */
export function Button({
  title,
  variant = "default",
  size = "default",
  loading = false,
  loadingTitle,
  icon,
  leading,
  fullWidth = true,
  disabled,
  style,
  onPressIn,
  onPressOut,
  accessibilityLabel,
  ...rest
}: ButtonProps) {
  const t = useTheme();
  const [scale] = useState(() => new Animated.Value(1));
  const v = VARIANTS[variant];
  const isDisabled = disabled || loading;
  const isIcon = size === "icon";
  const label = loading && loadingTitle ? loadingTitle : title;

  const animateTo = (toValue: number) =>
    Animated.timing(scale, {
      toValue,
      duration: t.animation.pressDuration,
      useNativeDriver: true,
    }).start();

  return (
    <Animated.View
      style={[
        { transform: [{ scale }] },
        fullWidth && !isIcon && styles.fullWidth,
        isDisabled && { opacity: t.opacity.disabled },
        style,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityState={{ disabled: !!isDisabled, busy: loading }}
        disabled={isDisabled}
        onPressIn={(e) => {
          animateTo(t.animation.pressScale);
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          animateTo(1);
          onPressOut?.(e);
        }}
        style={({ pressed }) => [
          styles.base,
          {
            height: HEIGHTS[size],
            backgroundColor: t.colors[pressed ? v.pressed : v.bg],
            borderColor: t.colors[v.border],
            paddingHorizontal: isIcon ? 0 : size === "sm" ? t.spacing[4] : t.spacing[6],
          },
          isIcon && { width: HEIGHTS.icon },
        ]}
        {...rest}
      >
        <View style={styles.content}>
          {loading ? (
            <ActivityIndicator size="small" color={t.colors[v.fg]} />
          ) : leading ? (
            leading
          ) : icon ? (
            <Feather
              name={icon}
              size={isIcon ? t.sizes.iconLg : t.sizes.iconMd}
              color={t.colors[v.fg]}
            />
          ) : null}
          {!!label && !isIcon && (
            <Text variant={size === "sm" ? "buttonSm" : "button"} color={v.fg} numberOfLines={1}>
              {label}
            </Text>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fullWidth: { alignSelf: "stretch" },
  base: {
    borderRadius: theme.radius.full,
    borderWidth: theme.sizes.borderWidthThick,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing[3],
  },
});
