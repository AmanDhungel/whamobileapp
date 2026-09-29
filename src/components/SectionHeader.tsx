import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { theme, useTheme } from "@/theme";

import { Text } from "./Text";

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Section title with an optional "View all ›" action (web: SectionHeading + CardSlider). */
export function SectionHeader({
  title,
  subtitle,
  actionLabel = "View all",
  onAction,
  style,
}: SectionHeaderProps) {
  const t = useTheme();
  return (
    <View style={[styles.row, style]}>
      <View style={styles.text}>
        <Text variant="h3" accessibilityRole="header">
          {title}
        </Text>
        {!!subtitle && (
          <Text variant="caption" color="mutedForeground">
            {subtitle}
          </Text>
        )}
      </View>
      {onAction && (
        <Pressable
          onPress={onAction}
          hitSlop={t.spacing[2]}
          accessibilityRole="link"
          accessibilityLabel={`${actionLabel}: ${title}`}
          style={styles.action}
        >
          <Text variant="captionMedium" color="secondary">
            {actionLabel}
          </Text>
          <Feather name="chevron-right" size={t.sizes.iconSm} color={t.colors.secondary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", gap: theme.spacing[3] },
  text: { flex: 1, gap: theme.spacing[0.5] },
  action: { flexDirection: "row", alignItems: "center", gap: theme.spacing[0.5] },
});
