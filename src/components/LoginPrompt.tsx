import type { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import { useLoginPromptStore } from "@/store/loginPromptStore";
import { theme } from "@/theme";

import { BottomSheet } from "./BottomSheet";
import { Button } from "./Button";
import { EmptyState } from "./EmptyState";
import { Text } from "./Text";

export interface LoginPromptProps {
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  message?: string;
}

function LoginButtons({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <View style={styles.actions}>
      <Button
        title="Log in"
        onPress={() => {
          onNavigate?.();
          router.push({ pathname: "/login", params: { type: "user" } });
        }}
      />
      <Button
        title="Create an account"
        variant="outline"
        onPress={() => {
          onNavigate?.();
          router.push("/signup");
        }}
      />
    </View>
  );
}

/**
 * Inline logged-out state for account-only screens (My tickets, Favorites…). These are
 * customer features, so it goes straight to the customer login/signup.
 */
export function LoginPrompt({ icon = "lock", title, message }: LoginPromptProps) {
  return <EmptyState icon={icon} title={title} message={message} action={<LoginButtons />} />;
}

/**
 * Global sheet shown when a logged-out user taps a protected action (heart, write a
 * review…). Mounted once in app/_layout.tsx; opened via `requestLogin(message)`.
 */
export function LoginPromptSheet() {
  const { visible, message, dismiss } = useLoginPromptStore();
  return (
    <BottomSheet visible={visible} onClose={dismiss} title={message || "Log in to continue"}>
      <View style={styles.sheet}>
        <Text variant="bodySm" color="mutedForeground">
          Log in or create a free WHA account to save favorites, write reviews and keep your tickets
          in one place.
        </Text>
        <LoginButtons onNavigate={dismiss} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  actions: { gap: theme.spacing[3] },
  sheet: { gap: theme.spacing[5], paddingBottom: theme.spacing[2] },
});
