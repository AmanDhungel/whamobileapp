import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import { theme } from "@/theme";

import { Button } from "./Button";
import { Text } from "./Text";

export interface AuthHeaderProps {
  heading: string;
  subheading?: string;
  /** Show the back arrow (default true). Falls back to Welcome if there is no history. */
  showBack?: boolean;
  align?: "left" | "center";
}

/** Mobile version of the web's AuthShell header: back arrow, 28px heading, subtitle. */
export function AuthHeader({
  heading,
  subheading,
  showBack = true,
  align = "left",
}: AuthHeaderProps) {
  return (
    <View style={styles.container}>
      {showBack && (
        <Button
          variant="ghost"
          size="icon"
          icon="arrow-left"
          accessibilityLabel="Go back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/welcome"))}
          style={styles.back}
        />
      )}
      <View style={styles.text}>
        <Text variant="h1" align={align}>
          {heading}
        </Text>
        {!!subheading && (
          <Text variant="bodySm" color="mutedForeground" align={align}>
            {subheading}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: theme.spacing[6], marginBottom: theme.spacing[8] },
  back: { marginLeft: -theme.spacing[2] },
  text: { gap: theme.spacing[2] },
});
