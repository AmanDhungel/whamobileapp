import { zodResolver } from "@hookform/resolvers/zod";
import { router, useLocalSearchParams } from "expo-router";
import { useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, View, type TextInput as RNTextInput } from "react-native";

import {
  AuthHeader,
  Button,
  GoogleButton,
  OrDivider,
  Screen,
  Text,
  TextInput,
  TextLink,
} from "@/components";
import { useLogin, type LoginType } from "@/hooks/useAuthActions";
import { theme } from "@/theme";
import { loginSchema, type LoginValues } from "@/utils/validation";

// Copy per mode, verbatim from app/auth/user/login and app/auth/business/login.
const COPY: Record<LoginType, { heading: string; subheading: string }> = {
  user: {
    heading: "WHA for Customers",
    subheading: "Log in to book and manage your appointments.",
  },
  business: {
    heading: "WHA for Business",
    subheading: "Log in to manage your bookings, services and team.",
  },
};

/**
 * ~ web /auth/user/login and /auth/business/login (shared LoginPage, `loginType`).
 * Business login has no Google button — business accounts can't originate from Google.
 */
export default function LoginScreen() {
  const params = useLocalSearchParams<{ email?: string; type?: string }>();
  const type: LoginType = params.type === "business" ? "business" : "user";
  const copy = COPY[type];
  const login = useLogin(type);
  const passwordRef = useRef<RNTextInput>(null);

  const { control, handleSubmit, getValues } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: params.email ?? "", password: "" },
  });

  // On success the root layout routes by account category (customer tabs / business area).
  const onSubmit = handleSubmit((values) => login.mutate(values));

  const switchMode = () => router.setParams({ type: type === "business" ? "user" : "business" });

  return (
    <Screen>
      <AuthHeader heading={copy.heading} subheading={copy.subheading} />

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
              returnKeyType="next"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              onSubmitEditing={() => passwordRef.current?.focus()}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field, fieldState }) => (
            <TextInput
              ref={passwordRef}
              label="Password"
              placeholder="••••••••"
              password
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              onSubmitEditing={onSubmit}
              error={fieldState.error?.message}
            />
          )}
        />
        <TextLink
          style={styles.forgot}
          onPress={() =>
            router.push({
              pathname: "/forgot-password",
              params: { email: getValues("email"), type },
            })
          }
        >
          Forgot password?
        </TextLink>
      </View>

      <Button
        title="Continue"
        loadingTitle="Signing in…"
        loading={login.isPending}
        onPress={onSubmit}
      />

      <Text variant="bodySm" color="mutedForeground" align="center" style={styles.line}>
        Don&apos;t have an account?{" "}
        <TextLink
          variant="label"
          color="primary"
          onPress={() => router.push(type === "business" ? "/business-signup" : "/signup")}
        >
          Sign up
        </TextLink>
      </Text>

      {type === "user" && (
        <View style={styles.social}>
          <OrDivider />
          <GoogleButton />
        </View>
      )}

      <View style={[styles.switch, { borderTopColor: theme.colors.border }]}>
        <Text variant="bodySm" color="mutedForeground" align="center">
          {type === "business" ? "Not a business? " : "Own a business? "}
          <TextLink variant="label" onPress={switchMode}>
            {type === "business" ? "Log in as a customer" : "Log in here"}
          </TextLink>
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: theme.spacing[4], marginBottom: theme.spacing[6] },
  forgot: { alignSelf: "flex-end" },
  line: { marginTop: theme.spacing[4], marginBottom: theme.spacing[6] },
  social: { gap: theme.spacing[5] },
  switch: {
    marginTop: theme.spacing[8],
    paddingTop: theme.spacing[5],
    borderTopWidth: theme.sizes.hairline,
  },
});
