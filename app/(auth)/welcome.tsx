import { Image } from "expo-image";
import { router } from "expo-router";
import { StyleSheet, View, useWindowDimensions } from "react-native";

import { AccountTypeChoice, Button, Screen, Text } from "@/components";
import { theme, useTheme } from "@/theme";

/**
 * ~ web /auth (AuthChoicePage). The destination of every "Log in" entry point — not a
 * gate: logged-out users browse the public tabs first (see app/_layout.tsx).
 */
export default function WelcomeScreen() {
  const t = useTheme();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();

  // Show the whole illustration (people included): fit the width, but cap the height
  // so the choices stay on screen; contentFit="contain" never crops.
  const contentWidth = Math.min(windowWidth - t.spacing[6] * 2, t.sizes.contentMaxWidth);
  const heroHeight = Math.min(
    contentWidth / t.sizes.authHeroAspectRatio,
    windowHeight * t.sizes.authHeroMaxHeightRatio,
  );

  const close = () => (router.canGoBack() ? router.back() : router.replace("/"));

  return (
    <Screen>
      <View style={styles.topBar}>
        <Button variant="ghost" size="icon" icon="x" accessibilityLabel="Close" onPress={close} />
      </View>

      <Image
        source={require("../../assets/images/auth-hero.png")}
        style={[styles.hero, { height: heroHeight }]}
        contentFit="contain"
        accessibilityLabel="WH Australia — join us"
      />

      <Text variant="bodySm" color="mutedForeground" align="center" style={styles.prompt}>
        How would you like to continue?
      </Text>

      <AccountTypeChoice />
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { alignItems: "flex-start", marginLeft: -theme.spacing[2] },
  hero: { width: "100%" },
  prompt: { marginTop: theme.spacing[6], marginBottom: theme.spacing[4] },
});
