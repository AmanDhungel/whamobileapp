import { zodResolver } from "@hookform/resolvers/zod";
import { router, useLocalSearchParams } from "expo-router";
import { useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, View, type TextInput as RNTextInput } from "react-native";

import { AuthHeader, Button, ErrorState, Screen, TextInput } from "@/components";
import { useResetPassword } from "@/hooks/useAuthActions";
import { theme } from "@/theme";
import { newPasswordSchema, type NewPasswordValues } from "@/utils/validation";

/** Step 3/3 of password reset — ~ web /reset-password. Mobile /auth/reset-password. */
export default function ResetPasswordScreen() {
  const { email, code, type } = useLocalSearchParams<{
    email?: string;
    code?: string;
    type?: string;
  }>();
  const reset = useResetPassword();
  const confirmRef = useRef<RNTextInput>(null);

  const { control, handleSubmit } = useForm<NewPasswordValues>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: "", cpassword: "" },
  });

  if (!email || !code) {
    return (
      <Screen scroll={false}>
        <ErrorState
          title="Reset link incomplete"
          message="Please start the password reset again."
          onRetry={() => router.replace("/forgot-password")}
        />
      </Screen>
    );
  }

  const onSubmit = handleSubmit(({ password }) =>
    reset.mutate(
      { email, code, password },
      // Back to Login (dropping the reset screens), with the email prefilled.
      { onSuccess: () => router.dismissTo({ pathname: "/login", params: { email, type } }) },
    ),
  );

  return (
    <Screen>
      <AuthHeader heading="New Password" subheading="Choose a new password for your account." />
      <View style={styles.form}>
        <Controller
          control={control}
          name="password"
          render={({ field, fieldState }) => (
            <TextInput
              label="New Password"
              placeholder="••••••••"
              password
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="next"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              onSubmitEditing={() => confirmRef.current?.focus()}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="cpassword"
          render={({ field, fieldState }) => (
            <TextInput
              ref={confirmRef}
              label="Confirm New Password"
              placeholder="••••••••"
              password
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="done"
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
        title="Update password"
        loadingTitle="Updating…"
        loading={reset.isPending}
        onPress={onSubmit}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: theme.spacing[4], marginBottom: theme.spacing[6] },
});
