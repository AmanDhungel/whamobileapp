import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, View } from "react-native";

import { getErrorMessage } from "@/api/errors";
import {
  AddressAutocomplete,
  Avatar,
  Button,
  Card,
  LoginPrompt,
  Screen,
  ScreenHeader,
  showToast,
  Text,
  TextInput,
} from "@/components";
import {
  NOT_AVAILABLE_YET,
  isNotAvailableYet,
  useEditContactDetails,
  useUpdateName,
  useUploadProfilePhoto,
} from "@/hooks/queries/profile";
import { useAuthStore, useIsCustomer } from "@/store/authStore";
import { theme, useTheme } from "@/theme";
import { pickImages } from "@/utils/imagePicker";
import {
  MAX_IMAGE_BYTES,
  contactDetailsSchema,
  profileNameSchema,
  type ContactDetailsValues,
  type ProfileNameValues,
} from "@/utils/validation";

/** Inline "not available yet" note for fields whose backend route is still cookie-only. */
function Unavailable() {
  return (
    <Text variant="caption" color="warning">
      {NOT_AVAILABLE_YET}
    </Text>
  );
}

/**
 * ~ web /dashboard/profile. Name → PATCH /api/user/update (works today). Photo →
 * /api/upload-profile-pic and phone/address → /api/edit-profile are still cookie-only
 * on the backend (a bearer swap is in progress); they're called anyway and a 401
 * shows "Not available yet" on that field instead of logging the user out.
 */
export default function EditProfileScreen() {
  const t = useTheme();
  const isCustomer = useIsCustomer();
  const user = useAuthStore((s) => s.user);

  const updateName = useUpdateName();
  const uploadPhoto = useUploadProfilePhoto();
  const editContact = useEditContactDetails();
  const [photoUnavailable, setPhotoUnavailable] = useState(false);
  const [contactUnavailable, setContactUnavailable] = useState(false);

  const nameForm = useForm<ProfileNameValues>({
    resolver: zodResolver(profileNameSchema),
    defaultValues: { name: user?.name ?? "" },
  });
  const contactForm = useForm<ContactDetailsValues>({
    resolver: zodResolver(contactDetailsSchema),
    defaultValues: { phone_number: user?.phone_number ?? "", location: user?.location ?? "" },
  });

  if (!isCustomer) {
    return (
      <Screen scroll={false} padded={false}>
        <ScreenHeader title="Edit profile" />
        <LoginPrompt icon="user" title="Log in to edit your profile" />
      </Screen>
    );
  }

  const changePhoto = async () => {
    const { files, skipped } = await pickImages({
      limit: 1,
      squareCrop: true,
      maxBytes: MAX_IMAGE_BYTES,
    });
    if (skipped.length) {
      showToast({
        type: "error",
        message: "That photo is larger than 5 MB — please pick another.",
      });
    }
    const file = files[0];
    if (!file) return;
    uploadPhoto.mutate(file, {
      onSuccess: () => {
        setPhotoUnavailable(false);
        showToast({ type: "success", message: "Profile picture updated successfully" });
      },
      onError: (err) => {
        if (isNotAvailableYet(err)) setPhotoUnavailable(true);
        else showToast({ type: "error", message: getErrorMessage(err, "Upload failed") });
      },
    });
  };

  const saveName = nameForm.handleSubmit(({ name }) =>
    updateName.mutate(
      { name, image: user?.image },
      {
        onSuccess: () => showToast({ type: "success", message: "Profile updated successfully" }),
        onError: (err) =>
          showToast({ type: "error", message: getErrorMessage(err, "Failed to update profile") }),
      },
    ),
  );

  const saveContact = contactForm.handleSubmit((values) => {
    // Only send what changed (web strips empties and says "No changes detected").
    const body: ContactDetailsValues = {};
    const phone = values.phone_number?.trim();
    if (phone && phone !== (user?.phone_number ?? "")) body.phone_number = phone;
    if (values.location && values.location !== (user?.location ?? "")) {
      body.location = values.location;
      body.latitude = values.latitude;
      body.longitude = values.longitude;
    }
    if (!Object.keys(body).length) {
      showToast({ type: "info", message: "No changes detected" });
      return;
    }
    editContact.mutate(body, {
      onSuccess: () => {
        setContactUnavailable(false);
        showToast({ type: "success", message: "Profile updated successfully" });
      },
      onError: (err) => {
        if (isNotAvailableYet(err)) setContactUnavailable(true);
        else showToast({ type: "error", message: getErrorMessage(err) });
      },
    });
  });

  return (
    <Screen padded={false}>
      <ScreenHeader title="Edit profile" />
      <View style={styles.body}>
        {/* Photo */}
        <View style={styles.photo}>
          <Avatar
            uri={user?.image}
            name={user?.name}
            fallback={user?.email}
            size={t.sizes.avatarLg}
          />
          <Button
            title="Change photo"
            icon="camera"
            variant="outline"
            size="sm"
            fullWidth={false}
            loading={uploadPhoto.isPending}
            onPress={() => void changePhoto()}
          />
          {photoUnavailable && <Unavailable />}
        </View>

        {/* Name + email */}
        <Card style={styles.card}>
          <Controller
            control={nameForm.control}
            name="name"
            render={({ field, fieldState }) => (
              <TextInput
                label="Full name"
                autoCapitalize="words"
                autoComplete="name"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
          <TextInput
            label="Email"
            value={user?.email ?? ""}
            editable={false}
            hint="Email can't be changed."
          />
          <Button title="Save name" loading={updateName.isPending} onPress={saveName} />
        </Card>

        {/* Phone + address */}
        <Card style={styles.card}>
          <Text variant="h3">Contact details</Text>
          <Controller
            control={contactForm.control}
            name="phone_number"
            render={({ field, fieldState }) => (
              <TextInput
                label="Phone number"
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                autoComplete="tel"
                placeholder="04xx xxx xxx"
                value={field.value ?? ""}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
          <AddressAutocomplete
            label="Address"
            value={user?.location ?? ""}
            onSelect={(s) => {
              contactForm.setValue("location", s?.label ?? "");
              contactForm.setValue("latitude", s?.latitude);
              contactForm.setValue("longitude", s?.longitude);
            }}
          />
          {contactUnavailable && <Unavailable />}
          <Button
            title="Save contact details"
            loading={editContact.isPending}
            onPress={saveContact}
          />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: theme.spacing[6],
    paddingHorizontal: theme.spacing[6],
    paddingBottom: theme.spacing[8],
  },
  photo: { alignItems: "center", gap: theme.spacing[3] },
  card: { gap: theme.spacing[4] },
});
