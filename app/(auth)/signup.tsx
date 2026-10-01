import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { StyleSheet, View } from "react-native";

import { normalizeEmail } from "@/api/auth";
import {
  AuthHeader,
  Button,
  Checkbox,
  EmailVerifyGate,
  GoogleButton,
  OrDivider,
  Screen,
  showToast,
  Text,
  TextInput,
  TextLink,
} from "@/components";
import { useRegister } from "@/hooks/useAuthActions";
import { theme } from "@/theme";
import { legalLinks, openInAppBrowser } from "@/utils/links";
import { signupSchema, type SignupValues } from "@/utils/validation";

/**
 * ~ web /auth/user/signup (components/Auth/Signup.tsx). The email must be verified
 * with a 6-digit code BEFORE the account can be created (the backend re-checks this).
 * Like the web (after its fix), the verify step sits under the email field and the
 * submit button is always shown, disabled until the email is verified.
 */
export default function SignupScreen() {
  const register = useRegister();
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);

  const { control, handleSubmit } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      cpassword: "",
      accpetalltermsandcondition: false,
    },
  });

  const email = useWatch({ control, name: "email" }) ?? "";
  const isEmailVerified = !!verifiedEmail && verifiedEmail === normalizeEmail(email);

  const onSubmit = handleSubmit((values) => {
    if (!isEmailVerified) {
      showToast({ type: "error", message: "Please verify your email address first" });
      return;
    }
    register.mutate(
      {
        name: values.name,
        email: values.email,
        password: values.password,
        accpetalltermsandcondition: values.accpetalltermsandcondition,
      },
      {
        onSuccess: (outcome) => {
          // signedIn: the root layout moves the user to the customer tabs by itself.
          if (!outcome.signedIn) {
            showToast({ type: "info", message: outcome.message });
            router.replace({
              pathname: "/login",
              params: { email: normalizeEmail(values.email), type: "user" },
            });
          }
        },
      },
    );
  });

  return (
    <Screen>
      <AuthHeader
        heading="Signup as customers"
        subheading="Create an account to discover local events and book services near you."
      />

      <View style={styles.form}>
        <Controller
          control={control}
          name="name"
          render={({ field, fieldState }) => (
            <TextInput
              label="Full name"
              placeholder="Jane Smith"
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />

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
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />
        <EmailVerifyGate
          email={email}
          verifiedEmail={verifiedEmail}
          onVerified={setVerifiedEmail}
        />

        <Controller
          control={control}
          name="password"
          render={({ field, fieldState }) => (
            <TextInput
              label="Password"
              placeholder="••••••••"
              password
              autoComplete="new-password"
              textContentType="newPassword"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="cpassword"
          render={({ field, fieldState }) => (
            <TextInput
              label="Confirm password"
              placeholder="••••••••"
              password
              autoComplete="new-password"
              textContentType="newPassword"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="accpetalltermsandcondition"
          render={({ field, fieldState }) => (
            <Checkbox
              checked={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
              label={
                <Text variant="caption" color="mutedForeground">
                  I agree to the{" "}
                  <TextLink onPress={() => openInAppBrowser(legalLinks.privacy)}>
                    Privacy Policy
                  </TextLink>
                  ,{" "}
                  <TextLink onPress={() => openInAppBrowser(legalLinks.termsOfService)}>
                    Terms of Service
                  </TextLink>{" "}
                  and{" "}
                  <TextLink onPress={() => openInAppBrowser(legalLinks.termsOfBusiness)}>
                    Terms of Business
                  </TextLink>
                </Text>
              }
            />
          )}
        />
      </View>

      <Button
        title={isEmailVerified ? "Create account" : "Verify your email to continue"}
        loadingTitle="Creating account…"
        disabled={!isEmailVerified}
        loading={register.isPending}
        onPress={onSubmit}
      />

      <View style={styles.social}>
        <OrDivider />
        <GoogleButton />
      </View>

      <Text variant="bodySm" color="mutedForeground" align="center" style={styles.switch}>
        Already have an account?{" "}
        <TextLink
          variant="label"
          onPress={() => router.replace({ pathname: "/login", params: { type: "user" } })}
        >
          Log in
        </TextLink>
      </Text>
      <Text variant="bodySm" color="mutedForeground" align="center" style={styles.business}>
        Own a business?{" "}
        <TextLink variant="label" onPress={() => router.replace("/business-signup")}>
          List your business
        </TextLink>
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: theme.spacing[4], marginBottom: theme.spacing[6] },
  social: { gap: theme.spacing[5], marginTop: theme.spacing[6] },
  switch: { marginTop: theme.spacing[6] },
  business: { marginTop: theme.spacing[3] },
});
