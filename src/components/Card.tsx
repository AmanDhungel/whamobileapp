import { StyleSheet, View, type ViewProps } from "react-native";

import { theme, useTheme } from "@/theme";

export interface CardProps extends ViewProps {
  /** Adds the resting card shadow (shadows.card). Default true. */
  elevated?: boolean;
  padded?: boolean;
}

export function Card({ elevated = true, padded = true, style, ...rest }: CardProps) {
  const t = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: t.colors.card, borderColor: t.colors.border },
        elevated && t.shadows.card,
        padded && styles.padded,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.radius.tailwindLg,
    borderWidth: theme.sizes.borderWidth,
  },
  padded: { padding: theme.spacing[5] },
});
