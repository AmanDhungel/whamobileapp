import { StyleSheet, View } from "react-native";

import { theme } from "@/theme";

import { Text } from "./Text";

/** Wizard step heading (web business signup SectionHeader): tag · title · subtitle. */
export function StepHeader({ tag, title, sub }: { tag?: string; title: string; sub: string }) {
  return (
    <View style={styles.container}>
      {!!tag && (
        <Text variant="captionMedium" color="secondary">
          {tag.toUpperCase()}
        </Text>
      )}
      <Text variant="h2" accessibilityRole="header">
        {title}
      </Text>
      <Text variant="bodySm" color="mutedForeground">
        {sub}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: theme.spacing[2], marginBottom: theme.spacing[6] },
});
