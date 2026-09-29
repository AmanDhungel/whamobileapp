import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { useState } from "react";
import { Controller, useForm, useWatch, type FieldPath } from "react-hook-form";
import { StyleSheet, View } from "react-native";

import { normalizeEmail } from "@/api/auth";
import type { UploadFile, WeekSchedule, WeekdayKey } from "@/api/types";
import {
  AddressAutocomplete,
  Button,
  Card,
  Checkbox,
  Chip,
  ChipRow,
  EmailVerifyGate,
  Grid,
  ImagePickerGrid,
  Screen,
  SelectField,
  SelectableTile,
  showToast,
  StaticMap,
  StepHeader,
  StepProgress,
  Text,
  TextInput,
  TextLink,
  ToggleRow,
} from "@/components";
import { useRegisterBusiness } from "@/hooks/useAuthActions";
import { theme, useTheme } from "@/theme";
import {
  BUSINESS_CATEGORIES,
  MAX_SIGNUP_COMMUNITIES,
  NOT_SPECIFIED,
  SIGNUP_COMMUNITIES,
} from "@/utils/catalog";
import { legalLinks, openInAppBrowser } from "@/utils/links";
import {
  MAX_SHIFTS_PER_DAY,
  TIME_OPTIONS,
  WEEK_DAYS,
  addShift,
  defaultSchedule,
  removeShift,
  toggleDay,
  updateShift,
} from "@/utils/schedule";
import {
  MAX_IMAGE_BYTES,
  MAX_VENUE_IMAGES,
  MIN_VENUE_IMAGES,
  businessSignupSchema,
  type BusinessSignupValues,
} from "@/utils/validation";

/** Steps 1 (intro) … 8 (login info) — web TOTAL_STEPS = 8, shown as "Step n of 7". */
const TOTAL_STEPS = 8;

// Web STEP_FIELDS (city is optional/unused — the web city picker is commented out).
const STEP_FIELDS: Partial<Record<number, FieldPath<BusinessSignupValues>[]>> = {
  2: ["business_name", "phone_number"],
  3: ["business_category"],
  4: ["location"],
  8: ["name", "email", "password", "confirmPassword", "accpetalltermsandcondition"],
};

const INTRO_POINTS = [
  {
    n: 1,
    t: "Tell us about your business",
    d: "Share some basic info, like your venue name, location and opening hours",
  },
  {
    n: 2,
    t: "Stand out online",
    d: "Add images of your location, select some venue highlights and craft a compelling description",
  },
  {
    n: 3,
    t: "Accept online bookings",
    d: "With a complete profile you're ready to start taking online bookings on the WHA marketplace",
  },
];

/**
 * ~ web /auth/business/signup (components/Auth/BusinessSignupPage.tsx): the same 8-step
 * wizard, copy, per-step validation and FormData. Mobile differences: the draggable
 * map pin is a static map preview (no native maps in Expo Go), and images come from
 * the photo library.
 */
export default function BusinessSignupScreen() {
  const t = useTheme();
  const register = useRegisterBusiness();
  const [step, setStep] = useState(1);
  const [schedule, setSchedule] = useState<WeekSchedule>(defaultSchedule);
  const [selectedDay, setSelectedDay] = useState<WeekdayKey>("mon");
  const [community, setCommunity] = useState<string[]>([]);
  const [images, setImages] = useState<UploadFile[]>([]);
  const [imagesError, setImagesError] = useState<string | null>(null);
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);

  const { control, handleSubmit, trigger, setValue } = useForm<BusinessSignupValues>({
    resolver: zodResolver(businessSignupSchema),
    mode: "onChange",
    defaultValues: {
      business_name: "",
      phone_number: "",
      business_category: "",
      location: "",
      is24_7: false,
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      accpetalltermsandcondition: false,
    },
  });
  const [email, is24_7, location, latitude, longitude] = useWatch({
    control,
    name: ["email", "is24_7", "location", "latitude", "longitude"],
  });
  const isEmailVerified = !!verifiedEmail && verifiedEmail === normalizeEmail(email ?? "");

  const goNext = async () => {
    const fields = STEP_FIELDS[step];
    if (fields?.length && !(await trigger(fields))) return;
    if (step === 7) {
      if (images.length < MIN_VENUE_IMAGES) {
        setImagesError("Please upload at least 3 images (up to 10)");
        return;
      }
      setImagesError(null);
    }
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  };

  const goBack = () => {
    if (step <= 1) {
      if (router.canGoBack()) router.back();
      else router.replace({ pathname: "/login", params: { type: "business" } });
      return;
    }
    setStep((s) => s - 1);
  };

  const toggleCommunity = (c: string) =>
    setCommunity((prev) => {
      if (prev.includes(c)) return prev.filter((x) => x !== c);
      if (c === NOT_SPECIFIED) return [NOT_SPECIFIED];
      if (prev.includes(NOT_SPECIFIED) || prev.length >= MAX_SIGNUP_COMMUNITIES) return prev;
      return [...prev, c];
    });

  const onSubmit = handleSubmit((values) => {
    if (!isEmailVerified) {
      showToast({ type: "error", message: "Please verify your email address first" });
      return;
    }
    register.mutate(
      {
        business_name: values.business_name,
        phone_number: values.phone_number,
        business_category: values.business_category,
        location: values.location,
        latitude: values.latitude,
        longitude: values.longitude,
        is24_7: values.is24_7,
        schedule,
        community,
        images,
        name: values.name,
        email: values.email,
        password: values.password,
        accpetalltermsandcondition: values.accpetalltermsandcondition,
      },
      {
        onSuccess: (outcome) => {
          showToast({ type: "success", message: "Business registered successfully!" });
          // signedIn: the root layout moves the user into the business area.
          if (!outcome.signedIn) {
            router.replace({
              pathname: "/login",
              params: { email: normalizeEmail(values.email), type: "business" },
            });
          }
        },
      },
    );
  });

  // ── Step 1: intro ─────────────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <Screen footer={<Button title="Get started" icon="arrow-right" onPress={() => setStep(2)} />}>
        <Button
          variant="ghost"
          size="icon"
          icon="arrow-left"
          accessibilityLabel="Go back"
          onPress={goBack}
          style={styles.back}
        />
        <Text variant="display" style={styles.introTitle}>
          Get published on the{" "}
          <Text variant="display" color="secondary">
            most popular marketplace
          </Text>{" "}
          to grow your business
        </Text>
        <View style={styles.introPoints}>
          {INTRO_POINTS.map((p) => (
            <View key={p.n} style={styles.introPoint}>
              <View style={[styles.introNumber, { backgroundColor: t.colors.accent }]}>
                <Text variant="label" color="primary">
                  {p.n}
                </Text>
              </View>
              <View style={styles.flex}>
                <Text variant="title">{p.t}</Text>
                <Text variant="bodySm" color="mutedForeground">
                  {p.d}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </Screen>
    );
  }

  const day = schedule[selectedDay];
  const isLast = step === TOTAL_STEPS;

  return (
    <View style={styles.flex}>
      <StepProgress step={step} total={TOTAL_STEPS} />
      <Screen
        footer={
          isLast ? (
            <Button
              title={isEmailVerified ? "Complete setup" : "Verify your email"}
              loadingTitle="Submitting…"
              icon={isEmailVerified ? "arrow-right" : undefined}
              disabled={!isEmailVerified}
              loading={register.isPending}
              onPress={onSubmit}
            />
          ) : (
            <Button title="Continue" icon="arrow-right" onPress={() => void goNext()} />
          )
        }
      >
        <View style={styles.topBar}>
          <Button
            variant="outline"
            size="icon"
            icon="chevron-left"
            accessibilityLabel="Previous step"
            onPress={goBack}
          />
          <Text variant="captionMedium" color="mutedForeground">
            Step {step - 1} of {TOTAL_STEPS - 1}
          </Text>
        </View>

        {step === 2 && (
          <>
            <StepHeader
              tag="Account setup"
              title="Venue essentials"
              sub="Add the display name you'd like to be known by and how clients can get in touch with you"
            />
            <View style={styles.fields}>
              <Controller
                control={control}
                name="business_name"
                render={({ field, fieldState }) => (
                  <TextInput
                    label="Location display name"
                    placeholder="E.g. Trendy Salon Sydney"
                    hint="Public name visible to your clients when booking online. E.g. Trendy Salon Sydney"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={fieldState.error?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name="phone_number"
                render={({ field, fieldState }) => (
                  <TextInput
                    label="Business phone number"
                    placeholder="4xx xxx xxx"
                    keyboardType="phone-pad"
                    textContentType="telephoneNumber"
                    prefix={
                      <Text variant="label" color="mutedForeground" style={styles.prefix}>
                        +61
                      </Text>
                    }
                    hint="The contact number provided for clients to call if there is a problem"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={fieldState.error?.message}
                  />
                )}
              />
            </View>
          </>
        )}

        {step === 3 && (
          <>
            <StepHeader
              tag="Account setup"
              title="Select your business category"
              sub="Choose the category that best describes your business"
            />
            <Controller
              control={control}
              name="business_category"
              render={({ field, fieldState }) => (
                <View style={styles.fields}>
                  <Grid
                    items={BUSINESS_CATEGORIES}
                    columns={2}
                    keyExtractor={(c) => c.value}
                    renderItem={(c, width) => (
                      <SelectableTile
                        width={width}
                        label={c.label}
                        icon={c.icon}
                        selected={field.value === c.value}
                        onPress={() => field.onChange(c.value)}
                      />
                    )}
                  />
                  {!!fieldState.error && (
                    <Text variant="caption" color="destructive">
                      {fieldState.error.message}
                    </Text>
                  )}
                </View>
              )}
            />
          </>
        )}

        {step === 4 && (
          <>
            <StepHeader
              title="Where is your business located?"
              sub="Search and select your address. The pin shows the exact location we'll display."
            />
            <Controller
              control={control}
              name="location"
              render={({ fieldState }) => (
                <AddressAutocomplete
                  label="Location address"
                  value={location}
                  error={fieldState.error?.message}
                  onSelect={(s) => {
                    setValue("location", s?.label ?? "", { shouldValidate: !!s });
                    setValue("latitude", s?.latitude);
                    setValue("longitude", s?.longitude);
                  }}
                />
              )}
            />
            {typeof latitude === "number" && typeof longitude === "number" && (
              <View style={styles.mapPreview}>
                <StaticMap latitude={latitude} longitude={longitude} label={location} />
              </View>
            )}
          </>
        )}

        {step === 5 && (
          <>
            <StepHeader
              title="Add your opening hours"
              sub="Let clients know your standard opening hours. These will be displayed on your profile."
            />
            <View style={styles.fields}>
              <ToggleRow
                label="Open 24/7"
                description="Your business is open all day, every day"
                value={!!is24_7}
                onChange={(v) => setValue("is24_7", v)}
                highlighted
              />
              {!is24_7 && (
                <>
                  <ChipRow style={styles.dayChips}>
                    {WEEK_DAYS.map((d) => (
                      <Chip
                        key={d.key}
                        label={d.short}
                        selected={selectedDay === d.key}
                        icon={schedule[d.key].open ? undefined : "moon"}
                        onPress={() => setSelectedDay(d.key)}
                      />
                    ))}
                  </ChipRow>
                  <Card elevated={false} style={styles.fields}>
                    <ToggleRow
                      label={WEEK_DAYS.find((d) => d.key === selectedDay)?.long ?? ""}
                      description={day.open ? "Open" : "Closed"}
                      value={day.open}
                      onChange={() => setSchedule((s) => toggleDay(s, selectedDay))}
                    />
                    {day.open &&
                      day.slots.map((slot, i) => (
                        <View key={i} style={styles.shiftRow}>
                          <SelectField
                            flex
                            title="Opens at"
                            options={TIME_OPTIONS}
                            value={slot.from}
                            onChange={(v) =>
                              setSchedule((s) => updateShift(s, selectedDay, i, "from", v))
                            }
                          />
                          <Text variant="captionMedium" color="mutedForeground">
                            To
                          </Text>
                          <SelectField
                            flex
                            title="Closes at"
                            options={TIME_OPTIONS}
                            value={slot.to}
                            onChange={(v) =>
                              setSchedule((s) => updateShift(s, selectedDay, i, "to", v))
                            }
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            icon="x"
                            accessibilityLabel={`Remove shift ${i + 1}`}
                            onPress={() => setSchedule((s) => removeShift(s, selectedDay, i))}
                          />
                        </View>
                      ))}
                    {day.open && day.slots.length < MAX_SHIFTS_PER_DAY && (
                      <TextLink onPress={() => setSchedule((s) => addShift(s, selectedDay))}>
                        + Add another shift
                      </TextLink>
                    )}
                  </Card>
                </>
              )}
            </View>
          </>
        )}

        {step === 6 && (
          <>
            <StepHeader
              tag="WHA Communities"
              title="Select your community"
              sub="Help customers from your community find you. Select up to 3 communities."
            />
            <View style={styles.fields}>
              <Grid
                items={SIGNUP_COMMUNITIES}
                columns={2}
                keyExtractor={(c) => c}
                renderItem={(c, width) => {
                  const active = community.includes(c);
                  const disabled =
                    community.includes(NOT_SPECIFIED) ||
                    (community.length >= MAX_SIGNUP_COMMUNITIES && !active);
                  return (
                    <SelectableTile
                      layout="inline"
                      width={width}
                      label={c}
                      selected={active}
                      disabled={disabled}
                      onPress={() => toggleCommunity(c)}
                    />
                  );
                }}
              />
              <Text variant="captionMedium" color="mutedForeground">
                OR
              </Text>
              <SelectableTile
                layout="inline"
                label={NOT_SPECIFIED}
                selected={community.includes(NOT_SPECIFIED)}
                disabled={community.some((c) => c !== NOT_SPECIFIED)}
                onPress={() => toggleCommunity(NOT_SPECIFIED)}
              />
              <Text variant="caption" color="mutedForeground">
                {community.length}/{community.includes(NOT_SPECIFIED) ? 1 : MAX_SIGNUP_COMMUNITIES}{" "}
                selected
              </Text>
            </View>
          </>
        )}

        {step === 7 && (
          <>
            <StepHeader
              title="Add venue images"
              sub="Quality images help attract clients. Add at least 3 images (up to 10, max 5 MB each). The first image becomes your cover."
            />
            <Card elevated={false} style={styles.guidelines}>
              <Text variant="label">Venue image guidelines</Text>
              {[
                "✅ Clear interior images of your space",
                "✅ At least 3 images required (up to 10)",
                "✅ High resolution (916 × 500 px)",
                "❌ Stock images",
                "❌ Logos and brand images",
                "❌ Max 5 MB per image",
              ].map((line) => (
                <Text key={line} variant="caption" color="mutedForeground">
                  {line}
                </Text>
              ))}
            </Card>
            <ImagePickerGrid
              images={images}
              onChange={(next) => {
                setImages(next);
                if (next.length >= MIN_VENUE_IMAGES) setImagesError(null);
              }}
              min={MIN_VENUE_IMAGES}
              max={MAX_VENUE_IMAGES}
              maxBytes={MAX_IMAGE_BYTES}
              error={imagesError}
            />
          </>
        )}

        {step === 8 && (
          <>
            <StepHeader
              tag="Almost done"
              title="Login information"
              sub="Set up your contact details and account credentials to complete registration"
            />
            <View style={styles.fields}>
              <Controller
                control={control}
                name="name"
                render={({ field, fieldState }) => (
                  <TextInput
                    label="Contact name"
                    placeholder="Full name"
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
                    hint="This will be your login email address"
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
                email={email ?? ""}
                verifiedEmail={verifiedEmail}
                onVerified={setVerifiedEmail}
              />
              <Controller
                control={control}
                name="password"
                render={({ field, fieldState }) => (
                  <TextInput
                    label="Password"
                    placeholder="Minimum 6 characters"
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
                name="confirmPassword"
                render={({ field, fieldState }) => (
                  <TextInput
                    label="Confirm password"
                    placeholder="Re-enter your password"
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
                        <TextLink onPress={() => openInAppBrowser(legalLinks.termsOfBusiness)}>
                          Terms & Conditions
                        </TextLink>{" "}
                        and{" "}
                        <TextLink onPress={() => openInAppBrowser(legalLinks.privacy)}>
                          Privacy Policy
                        </TextLink>
                      </Text>
                    }
                  />
                )}
              />
            </View>
          </>
        )}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  back: { marginLeft: -theme.spacing[2], marginBottom: theme.spacing[6] },
  introTitle: { marginBottom: theme.spacing[8] },
  introPoints: { gap: theme.spacing[6] },
  introPoint: { flexDirection: "row", gap: theme.spacing[4] },
  introNumber: {
    width: theme.sizes.iconButtonSm,
    height: theme.sizes.iconButtonSm,
    borderRadius: theme.radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing[6],
  },
  fields: { gap: theme.spacing[4] },
  prefix: { marginRight: theme.spacing[2] },
  mapPreview: { marginTop: theme.spacing[4] },
  dayChips: { paddingHorizontal: 0 },
  shiftRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing[2] },
  guidelines: { gap: theme.spacing[1.5], marginBottom: theme.spacing[5] },
});
