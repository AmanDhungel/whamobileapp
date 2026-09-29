import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, View } from "react-native";

import type { GuestInfo } from "@/api/types";
import { theme } from "@/theme";
import { guestDetailsSchema, type GuestDetailsValues } from "@/utils/validation";

import { Button } from "../Button";
import { TextInput } from "../TextInput";

export interface GuestDetailsFormProps {
  initial?: Partial<GuestInfo> | null;
  submitLabel: string;
  submitting: boolean;
  onSubmit: (info: GuestInfo) => void;
}

/**
 * Name / email / phone, with the web's exact rules and copy. Used by the guest
 * Details step and the "Confirm your details" recovery form.
 */
export function GuestDetailsForm({
  initial,
  submitLabel,
  submitting,
  onSubmit,
}: GuestDetailsFormProps) {
  const { control, handleSubmit } = useForm<GuestDetailsValues>({
    resolver: zodResolver(guestDetailsSchema),
    defaultValues: {
      name: initial?.name ?? "",
      email: initial?.email ?? "",
      phone: initial?.phone ?? "",
    },
  });

  const submit = handleSubmit((v) =>
    onSubmit({ name: v.name.trim(), email: v.email.trim().toLowerCase(), phone: v.phone.trim() }),
  );

  return (
    <View style={styles.form}>
      <Controller
        control={control}
        name="name"
        render={({ field, fieldState }) => (
          <TextInput
            label="Full name"
            autoComplete="name"
            textContentType="name"
            autoCapitalize="words"
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
            label="Email address"
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
      <Controller
        control={control}
        name="phone"
        render={({ field, fieldState }) => (
          <TextInput
            label="Phone number"
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
          />
        )}
      />
      <Button title={submitLabel} loading={submitting} onPress={submit} />
    </View>
  );
}

const styles = StyleSheet.create({ form: { gap: theme.spacing[4] } });
