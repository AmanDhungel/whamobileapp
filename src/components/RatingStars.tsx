import { FontAwesome } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { theme, useTheme } from "@/theme";

export interface RatingStarsProps {
  /** 0–5; fractional values show a half star. */
  value: number;
  size?: number;
  /** When set, the stars become a 1–5 input. */
  onChange?: (value: number) => void;
}

const STARS = [1, 2, 3, 4, 5] as const;

/** Read-only or interactive 5-star rating (FontAwesome has filled/half/outline stars). */
export function RatingStars({ value, size, onChange }: RatingStarsProps) {
  const t = useTheme();
  const dim = size ?? t.sizes.starMd;

  if (!onChange) {
    return (
      <View
        style={styles.row}
        accessible
        accessibilityRole="image"
        accessibilityLabel={`${value.toFixed(1)} out of 5 stars`}
      >
        {STARS.map((s) => {
          const name = value >= s ? "star" : value >= s - 0.5 ? "star-half-o" : "star-o";
          return <FontAwesome key={s} name={name} size={dim} color={t.colors.rating} />;
        })}
      </View>
    );
  }

  return (
    <View style={[styles.row, styles.inputRow]} accessibilityRole="adjustable">
      {STARS.map((s) => (
        <Pressable
          key={s}
          onPress={() => onChange(s)}
          hitSlop={t.spacing[1]}
          accessibilityRole="button"
          accessibilityLabel={`${s} star${s > 1 ? "s" : ""}`}
          accessibilityState={{ selected: value === s }}
        >
          <FontAwesome name={value >= s ? "star" : "star-o"} size={dim} color={t.colors.rating} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: theme.spacing[0.5] },
  inputRow: { gap: theme.spacing[2] },
});
