import { ActivityIndicator, Pressable, StyleSheet } from "react-native";

import { useGoogleSignIn } from "@/hooks/useGoogleSignIn";
import { theme, useTheme } from "@/theme";

import { GoogleLogo } from "./GoogleLogo";
import { Text } from "./Text";
import { showToast } from "./Toast";

const LABEL = "Continue with Google";

/**
 * "Continue with Google" — customer login / signup only (businesses have no Google
 * sign-in, same as the website). Styled per Google's branding guidelines: official
 * "G" mark, Roboto Medium, Google's neutral fill / stroke / text colours.
 */
export function GoogleButton() {
  const t = useTheme();
  const { availability, start, loading } = useGoogleSignIn();

  // Expo Go / a build without the native module: say so instead of crashing.
  if (availability === "expoGo" || availability === "missingNative") {
    return (
      <Text variant="caption" color="mutedForeground" align="center">
        Google sign-in needs the app build
      </Text>
    );
  }

  const onPress =
    availability === "available"
      ? start
      : () =>
          showToast({
            type: "info",
            message: "Google sign-in isn't set up yet. Please use email for now.",
          });

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={LABEL}
      accessibilityState={{ busy: loading, disabled: loading }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: t.colors.googleButton, borderColor: t.colors.googleButtonBorder },
        (pressed || loading) && { opacity: t.opacity.pressed },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={t.colors.googleButtonText} />
      ) : (
        <GoogleLogo size={t.sizes.iconMd} />
      )}
      <Text variant="googleButton" color="googleButtonText">
        {LABEL}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: theme.sizes.buttonHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    borderRadius: theme.radius.full,
    borderWidth: theme.sizes.borderWidth,
  },
});
