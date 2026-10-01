import { FontAwesome } from "@expo/vector-icons";

import { useGoogleSignIn } from "@/hooks/useGoogleSignIn";
import { useTheme } from "@/theme";

import { Button } from "./Button";
import { Text } from "./Text";
import { showToast } from "./Toast";

const LABEL = "Continue with Google";

function GoogleIcon() {
  const t = useTheme();
  return <FontAwesome name="google" size={t.sizes.iconMd} color={t.colors.primary} />;
}

/** "Continue with Google" — customer login / signup only (no Google for businesses). */
export function GoogleButton() {
  const { availability, start, loading } = useGoogleSignIn();

  // Expo Go / a build without the native module: say so instead of crashing.
  if (availability === "expoGo" || availability === "missingNative") {
    return (
      <Text variant="caption" color="mutedForeground" align="center">
        Google sign-in needs the app build
      </Text>
    );
  }

  return (
    <Button
      title={LABEL}
      variant="outline"
      leading={<GoogleIcon />}
      loading={loading}
      onPress={
        availability === "available"
          ? start
          : () =>
              showToast({
                type: "info",
                message: "Google sign-in isn't set up yet. Please use email for now.",
              })
      }
    />
  );
}
