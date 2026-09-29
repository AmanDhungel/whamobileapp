import { zodResolver } from "@hookform/resolvers/zod";
import { router, useLocalSearchParams } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, View } from "react-native";

import { AuthHeader, Button, CodeInput, ErrorState, Screen, Text } from "@/components";
import { useForgotPassword, useVerifyResetCode } from "@/hooks/useAuthActions";
import { useCountdown } from "@/hooks/useCountdown";
import { theme } from "@/theme";
import { codeSchema, type CodeValues } from "@/utils/validation";

const RESEND_COOLDOWN_S = 60;

/**
 * Step 2/3 of password reset — ~ web /verify-code. Pre-checks the code with the
 * legacy /api/auth/verify-code (the mobile API has no separate verify step).
 */
export default function VerifyCodeScreen() {
  const { email, type } = useLocalSearchParams<{ email?: string; type?: string }>();
  const verify = useVerifyResetCode();
  const resend = useForgotPassword();
  const cooldown = useCountdown();

  const { control, handleSubmit } = useForm<CodeValues>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: "" },
  });

  if (!email) {
    return (
      <Screen scroll={false}>
        <ErrorState
          title="Email is missing"
          message="Please start the process again."
          onRetry={() => router.replace("/forgot-password")}
        />
      </Screen>
    );
  }

  const onSubmit = handleSubmit(({ code }) => {
    if (verify.isPending) return;
    verify.mutate(
      { email, code },
      {
        onSuccess: () =>
          router.push({ pathname: "/reset-password", params: { email, code, type } }),
      },
    );
  });

  return (
    <Screen>
      <AuthHeader heading="Verify Code" />
      <Text variant="bodySm" color="mutedForeground" style={styles.subtitle}>
        Enter the 6-digit code sent to <Text variant="bodyMedium">{email}</Text>
      </Text>

      <View style={styles.form}>
        <Controller
          control={control}
          name="code"
          render={({ field, fieldState }) => (
            <CodeInput
              value={field.value}
              onChange={field.onChange}
              autoFocus
              editable={!verify.isPending}
              error={fieldState.error?.message}
              onComplete={() => void onSubmit()}
            />
          )}
        />
      </View>

      <Button
        title="Verify Code"
        loadingTitle="Verifying…"
        loading={verify.isPending}
        onPress={onSubmit}
      />
      <Button
        title={cooldown.active ? `Resend code in ${cooldown.seconds}s` : "Resend code"}
        variant="ghost"
        style={styles.resend}
        disabled={cooldown.active}
        loading={resend.isPending}
        onPress={() => resend.mutate(email, { onSuccess: () => cooldown.start(RESEND_COOLDOWN_S) })}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: { marginTop: -theme.spacing[6], marginBottom: theme.spacing[8] },
  form: { marginBottom: theme.spacing[6] },
  resend: { marginTop: theme.spacing[3] },
});
