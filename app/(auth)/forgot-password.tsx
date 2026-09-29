import { zodResolver } from "@hookform/resolvers/zod";
import { router, useLocalSearchParams } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, View } from "react-native";

import { normalizeEmail } from "@/api/auth";
import { AuthHeader, Button, Screen, TextInput } from "@/components";
import { useForgotPassword } from "@/hooks/useAuthActions";
import { theme } from "@/theme";
import { forgotPasswordSchema, type ForgotPasswordValues } from "@/utils/validation";

/** Step 1/3 of password reset — ~ web /forgot-password. */
export default function ForgotPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string; type?: string }>();
  const forgot = useForgotPassword();

  const { control, handleSubmit } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: params.email ?? "" },
  });

  const onSubmit = handleSubmit(({ email }) =>
    forgot.mutate(email, {
      onSuccess: () =>
        router.push({
          pathname: "/verify-code",
          params: { email: normalizeEmail(email), type: params.type },
        }),
    }),
  );

  return (
    <Screen>
      <AuthHeader
        heading="Forgot Password"
        subheading="Enter your email and we'll send you a 6-digit verification code."
      />
      <View style={styles.form}>
        <Controller
          control={control}
          name="email"
          render={({ field, fieldState }) => (
            <TextInput
              label="Email"
              placeholder="your@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="send"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              onSubmitEditing={onSubmit}
              error={fieldState.error?.message}
            />
          )}
        />
      </View>
      <Button
        title="Send Reset Code"
        loadingTitle="Sending…"
        loading={forgot.isPending}
        onPress={onSubmit}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({ form: { marginBottom: theme.spacing[6] } });
