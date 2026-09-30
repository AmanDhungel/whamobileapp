import { StyleSheet, View } from "react-native";

import { theme } from "@/theme";

import { BottomSheet } from "../BottomSheet";
import { Button } from "../Button";
import { Text } from "../Text";

export interface CheckoutChoiceSheetProps {
  visible: boolean;
  onClose: () => void;
  onLogin: () => void;
  onGuest: () => void;
}

/**
 * Logged-out "Get tickets": log in, or check out as a guest (the web lets guests buy;
 * tickets are emailed and there's no account/sign-in involved).
 */
export function CheckoutChoiceSheet({
  visible,
  onClose,
  onLogin,
  onGuest,
}: CheckoutChoiceSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Get tickets">
      <View style={styles.body}>
        <Text variant="bodySm" color="mutedForeground">
          Log in to keep your tickets in My tickets, or continue as a guest — we&apos;ll email your
          tickets to you.
        </Text>
        <View style={styles.actions}>
          <Button title="Log in" onPress={onLogin} />
          <Button title="Continue as guest" variant="outline" onPress={onGuest} />
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: theme.spacing[5], paddingBottom: theme.spacing[2] },
  actions: { gap: theme.spacing[3] },
});
