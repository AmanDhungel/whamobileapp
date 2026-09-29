import { Text, type TextProps } from "./Text";

export interface TextLinkProps extends Omit<TextProps, "onPress"> {
  onPress: () => void;
}

/** Inline tappable text (web: blue 500/600-weight links, e.g. "Forgot password?"). */
export function TextLink({
  variant = "captionMedium",
  color = "secondary",
  ...rest
}: TextLinkProps) {
  return (
    <Text
      accessibilityRole="link"
      suppressHighlighting={false}
      variant={variant}
      color={color}
      {...rest}
    />
  );
}
