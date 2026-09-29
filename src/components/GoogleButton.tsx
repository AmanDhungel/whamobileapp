import { FontAwesome } from "@expo/vector-icons";

import { useGoogleSignInMutation } from "@/hooks/useAuthActions";
import { isGoogleSignInConfigured, useGoogleIdToken } from "@/hooks/useGoogleSignIn";
import { useTheme } from "@/theme";

import { Button } from "./Button";
import { showToast } from "./Toast";

const LABEL = "Continue with Google";

function GoogleIcon() {
  const t = useTheme();
  return <FontAwesome name="google" size={t.sizes.iconMd} color={t.colors.primary} />;
}

/** Mounted only when a client id exists — expo-auth-session's hook throws otherwise. */
function ConfiguredGoogleButton() {
  const mutation = useGoogleSignInMutation();
  const { ready, prompt } = useGoogleIdToken(
    (idToken) => mutation.mutate(idToken),
    (message) => showToast({ type: "error", message }),
  );
  return (
    <Button
      title={LABEL}
      variant="outline"
      leading={<GoogleIcon />}
      disabled={!ready}
      loading={mutation.isPending}
      onPress={() => void prompt()}
    />
  );
}

export function GoogleButton() {
  if (isGoogleSignInConfigured()) return <ConfiguredGoogleButton />;
  return (
    <Button
      title={LABEL}
      variant="outline"
      leading={<GoogleIcon />}
      onPress={() =>
        showToast({
          type: "info",
          message: "Google sign-in isn't set up yet. Please use email for now.",
        })
      }
    />
  );
}
