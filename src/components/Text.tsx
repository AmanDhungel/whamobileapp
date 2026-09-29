import { Text as RNText, type TextProps as RNTextProps } from "react-native";

import { useTheme, type ColorPalette, type TextVariant } from "@/theme";

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: keyof ColorPalette;
  align?: "left" | "center" | "right";
}

/** The only way screens render text — sizes/fonts always come from the theme. */
export function Text({ variant = "body", color = "foreground", align, style, ...rest }: TextProps) {
  const theme = useTheme();
  return (
    <RNText
      style={[
        theme.typography.variants[variant],
        { color: theme.colors[color] },
        align && { textAlign: align },
        style,
      ]}
      {...rest}
    />
  );
}
