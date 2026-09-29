import { StyleSheet, View } from "react-native";

import { theme } from "@/theme";

import { Button } from "../Button";
import { Text } from "../Text";
import { TextInput } from "../TextInput";

export interface PromoCodeFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  onApply: () => void;
  loading: boolean;
  disabled?: boolean;
  message: { type: "success" | "error"; text: string } | null;
}

/**
 * Web promo field (Checkout step): label "Promo code" + Apply. The server applies the
 * code on re-pricing. Clearing the field and pressing Apply removes the promo.
 */
export function PromoCodeField({
  value,
  onChangeText,
  onApply,
  loading,
  disabled,
  message,
}: PromoCodeFieldProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <TextInput
          label="Promo code"
          placeholder="Promo code"
          autoCapitalize="characters"
          autoCorrect={false}
          value={value}
          onChangeText={onChangeText}
          returnKeyType="done"
          onSubmitEditing={onApply}
          editable={!disabled}
          containerStyle={styles.input}
        />
        <Button
          title="Apply"
          variant="outline"
          fullWidth={false}
          loading={loading}
          disabled={disabled}
          onPress={onApply}
        />
      </View>
      {message && (
        <Text
          variant="captionMedium"
          color={message.type === "success" ? "success" : "destructive"}
          accessibilityLiveRegion="polite"
        >
          {message.text}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: theme.spacing[1.5] },
  row: { flexDirection: "row", alignItems: "flex-end", gap: theme.spacing[3] },
  input: { flex: 1 },
});
