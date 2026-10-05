import { zodResolver } from "@hookform/resolvers/zod";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch, type FieldErrors } from "react-hook-form";
import { Pressable, StyleSheet, View } from "react-native";

import { getErrorMessage } from "@/api/errors";
import {
  Button,
  Card,
  Checkbox,
  Chip,
  DateTimeField,
  EmptyState,
  ErrorState,
  Loader,
  LocationPicker,
  RemoteImage,
  Screen,
  ScreenHeader,
  StepTabs,
  Text,
  TextInput,
  ToggleRow,
  showToast,
} from "@/components";
import { useEventForForm, useSaveEvent } from "@/hooks/queries/businessEvents";
import { theme, useTheme } from "@/theme";
import {
  EMPTY_OPTION,
  EMPTY_PROMO,
  END_DATE_EARLIER_MESSAGE,
  EVENT_CATEGORIES,
  EVENT_FORM_STEPS,
  MAX_PROMO_CODES,
  MAX_TICKET_OPTIONS,
  PRICE_CATEGORY_OPTIONS,
  emptyEventForm,
  eventFormSchema,
  eventToForm,
  type EventFormStep,
  type EventFormValues,
} from "@/utils/eventForm";
import { pickImages } from "@/utils/imagePicker";

const firstErrorStep = (errors: FieldErrors<EventFormValues>): EventFormStep | null =>
  EVENT_FORM_STEPS.find((s) => s.fields.some((f) => !!errors[f]))?.key ?? null;

const fieldError = (e: unknown): string | undefined => {
  if (!e || typeof e !== "object") return undefined;
  const err = e as { message?: unknown; root?: { message?: unknown } };
  if (typeof err.message === "string") return err.message;
  if (typeof err.root?.message === "string") return err.root.message;
  return undefined;
};

/** ~ web /dashboard/events/add-event (EventsForm.tsx) — create, or edit with ?id=. */
export default function EventFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;
  const existing = useEventForForm(id);

  if (isEdit && existing.isPending) {
    return (
      <Screen scroll={false} padded={false}>
        <ScreenHeader title="Edit event" />
        <Loader fullScreen message="Loading event..." />
      </Screen>
    );
  }
  if (isEdit && !existing.data) {
    return (
      <Screen scroll={false} padded={false}>
        <ScreenHeader title="Edit event" />
        {existing.isError ? (
          <ErrorState
            title="Couldn't load this event"
            error={existing.error}
            onRetry={() => void existing.refetch()}
          />
        ) : (
          <EmptyState icon="calendar" title="Event not found" />
        )}
      </Screen>
    );
  }
  return (
    <EventForm
      key={id ?? "new"}
      id={id}
      initial={existing.data ? eventToForm(existing.data) : emptyEventForm()}
      originalEnd={existing.data?.dateRange?.to || existing.data?.dateRange?.from || ""}
    />
  );
}

function EventForm({
  id,
  initial,
  originalEnd,
}: {
  id?: string;
  initial: EventFormValues;
  originalEnd: string;
}) {
  const t = useTheme();
  const isEdit = !!id;
  const save = useSaveEvent(id);
  const [step, setStep] = useState<EventFormStep>("basic");

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: initial,
  });
  const { control, handleSubmit, setValue, setError, formState } = form;
  const errors = formState.errors;
  useEffect(() => form.reset(initial), [form, initial]);

  const options = useFieldArray({ control, name: "options" });
  const promos = useFieldArray({ control, name: "promo_codes" });
  const [category, priceCategory, locationTba, image, dateFrom, dateTo, optionValues] = useWatch({
    control,
    name: ["category", "price_category", "location_tba", "image", "dateFrom", "dateTo", "options"],
  });
  const [venueAddress, latitude, longitude] = useWatch({
    control,
    name: ["location", "latitude", "longitude"],
  });

  const stepIndex = EVENT_FORM_STEPS.findIndex((s) => s.key === step);
  const steps = EVENT_FORM_STEPS.map((s) => ({
    key: s.key,
    label: s.label,
    hasError: s.fields.some((f) => !!errors[f]),
  }));
  const namedOptions = (optionValues ?? []).map((o) => o.name.trim()).filter(Boolean);

  const pickPhoto = async () => {
    const { files } = await pickImages({ limit: 1 });
    if (files[0]) setValue("image", files[0], { shouldDirty: true, shouldValidate: true });
  };

  const onInvalid = (errs: FieldErrors<EventFormValues>) => {
    const target = firstErrorStep(errs);
    if (target) setStep(target);
    showToast({ type: "error", message: "Please fix the highlighted errors before saving." });
  };

  const onValid = async (values: EventFormValues) => {
    // Edit rule (web L418-436): the end date may never move earlier.
    const newEnd = values.dateTo || values.dateFrom;
    if (isEdit && originalEnd && newEnd && newEnd < originalEnd) {
      setError("dateTo", { type: "manual", message: END_DATE_EARLIER_MESSAGE });
      setStep("location");
      showToast({ type: "error", message: END_DATE_EARLIER_MESSAGE });
      return;
    }
    try {
      const saved = await save.mutateAsync(values);
      showToast({
        type: "success",
        message: isEdit ? "Event updated successfully" : "Event created successfully!",
      });
      if (isEdit) router.back();
      else
        router.replace({ pathname: "/dashboard/events/[id]", params: { id: String(saved._id) } });
    } catch (err) {
      showToast({
        type: "error",
        message: getErrorMessage(err, isEdit ? "Failed to update event" : "Failed to create event"),
      });
    }
  };

  const submit = handleSubmit((v) => void onValid(v), onInvalid);
  const busy = save.isPending;
  const minEnd = [dateFrom, isEdit ? originalEnd : ""].filter(Boolean).sort().pop();

  const nav = (
    <View style={styles.stepNav}>
      {stepIndex > 0 && (
        <Button
          title="Back"
          icon="chevron-left"
          variant="ghost"
          size="sm"
          fullWidth={false}
          onPress={() => setStep(EVENT_FORM_STEPS[stepIndex - 1]!.key)}
        />
      )}
      <View style={styles.flex} />
      {stepIndex < EVENT_FORM_STEPS.length - 1 && (
        <Button
          title={`Next: ${EVENT_FORM_STEPS[stepIndex + 1]!.label}`}
          variant="outline"
          size="sm"
          fullWidth={false}
          onPress={() => setStep(EVENT_FORM_STEPS[stepIndex + 1]!.key)}
        />
      )}
    </View>
  );

  return (
    <Screen
      padded={false}
      footer={
        <Button
          title={isEdit ? "Update Event" : "Create Event"}
          loadingTitle="Saving Event..."
          loading={busy}
          disabled={isEdit && !formState.isDirty}
          onPress={submit}
        />
      }
    >
      <ScreenHeader title={isEdit ? "Edit event" : "Add new event"} />
      <StepTabs steps={steps} active={step} onChange={setStep} />

      <View style={styles.body}>
        {step === "basic" && (
          <>
            <Controller
              control={control}
              name="title"
              render={({ field, fieldState }) => (
                <TextInput
                  label="Title"
                  placeholder="Event Name"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={fieldState.error?.message}
                />
              )}
            />
            <View style={styles.field}>
              <Text variant="label">Event Image</Text>
              {image ? (
                <View style={styles.imageRow}>
                  <RemoteImage
                    uri={typeof image === "string" ? image : image.uri}
                    style={[styles.preview, { borderRadius: t.radius.lg }]}
                  />
                  <View style={styles.flex}>
                    <Button
                      title="Change photo"
                      variant="outline"
                      size="sm"
                      icon="image"
                      onPress={() => void pickPhoto()}
                    />
                  </View>
                </View>
              ) : (
                <Button
                  title="Choose a photo"
                  variant="outline"
                  icon="image"
                  onPress={() => void pickPhoto()}
                />
              )}
              {!!errors.image && (
                <Text variant="caption" color="destructive">
                  {fieldError(errors.image)}
                </Text>
              )}
            </View>
            <View style={styles.field}>
              <Text variant="label">Category</Text>
              <View style={styles.chipWrap}>
                {EVENT_CATEGORIES.map((c) => (
                  <Chip
                    key={c}
                    label={c}
                    selected={category === c}
                    onPress={() =>
                      setValue("category", c, {
                        shouldDirty: true,
                        shouldValidate: !!errors.category,
                      })
                    }
                  />
                ))}
              </View>
              {!!errors.category && (
                <Text variant="caption" color="destructive">
                  {errors.category.message}
                </Text>
              )}
            </View>
            {category === "Others" && (
              <Controller
                control={control}
                name="category_name"
                render={({ field }) => (
                  <TextInput
                    label="Category Name"
                    value={field.value}
                    onChangeText={field.onChange}
                  />
                )}
              />
            )}
            <Controller
              control={control}
              name="description"
              render={({ field, fieldState }) => (
                <TextInput
                  label="Description"
                  multiline
                  style={styles.textArea}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={fieldState.error?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="event_rules"
              render={({ field }) => (
                <TextInput
                  label="Event Rule & Policy"
                  multiline
                  style={styles.textArea}
                  value={field.value}
                  onChangeText={field.onChange}
                />
              )}
            />
            <Controller
              control={control}
              name="refund_policy"
              render={({ field }) => (
                <TextInput
                  label="Refund"
                  multiline
                  style={styles.textArea}
                  value={field.value}
                  onChangeText={field.onChange}
                />
              )}
            />
          </>
        )}

        {step === "location" && (
          <>
            <Controller
              control={control}
              name="dateFrom"
              render={({ field, fieldState }) => (
                <DateTimeField
                  label="From date"
                  mode="date"
                  value={field.value}
                  onChange={(v) => field.onChange(v)}
                  error={fieldState.error?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="dateTo"
              render={({ field, fieldState }) => (
                <DateTimeField
                  label="To date"
                  mode="date"
                  value={field.value}
                  onChange={(v) => field.onChange(v)}
                  minimumDate={minEnd}
                  clearable
                  hint={dateTo ? undefined : "Leave empty for a one-day event."}
                  error={fieldState.error?.message}
                />
              )}
            />
            <View style={styles.row}>
              <View style={styles.flex}>
                <Controller
                  control={control}
                  name="startTime"
                  render={({ field, fieldState }) => (
                    <DateTimeField
                      label="Time From"
                      mode="time"
                      value={field.value}
                      onChange={(v) => field.onChange(v)}
                      error={fieldState.error?.message}
                    />
                  )}
                />
              </View>
              <View style={styles.flex}>
                <Controller
                  control={control}
                  name="endTime"
                  render={({ field }) => (
                    <DateTimeField
                      label="Time To"
                      mode="time"
                      value={field.value}
                      onChange={(v) => field.onChange(v)}
                      clearable
                    />
                  )}
                />
              </View>
            </View>
            <View style={styles.field}>
              <Text variant="label">Location</Text>
              <View style={styles.chipWrap}>
                <Chip
                  label="Set Location"
                  selected={!locationTba}
                  onPress={() => setValue("location_tba", false, { shouldDirty: true })}
                />
                <Chip
                  label="To Be Announced"
                  selected={!!locationTba}
                  onPress={() => setValue("location_tba", true, { shouldDirty: true })}
                />
              </View>
            </View>
            {!locationTba && (
              <>
                <Controller
                  control={control}
                  name="venue"
                  render={({ field, fieldState }) => (
                    <TextInput
                      label="Venue"
                      placeholder="e.g. Grand Ballroom"
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      error={fieldState.error?.message}
                    />
                  )}
                />
                <LocationPicker
                  label="Pick Location"
                  value={{ address: venueAddress ?? "", latitude, longitude }}
                  addressError={errors.location?.message}
                  onChange={(patch) => {
                    if (patch.address !== undefined)
                      setValue("location", patch.address, {
                        shouldDirty: true,
                        shouldValidate: !!errors.location,
                      });
                    if (patch.latitude !== undefined && patch.longitude !== undefined) {
                      setValue("latitude", patch.latitude, { shouldDirty: true });
                      setValue("longitude", patch.longitude, { shouldDirty: true });
                    }
                  }}
                />
              </>
            )}
          </>
        )}

        {step === "pricing" && (
          <>
            <View style={styles.field}>
              <Text variant="label">Price Category</Text>
              <View style={styles.chipWrap}>
                {PRICE_CATEGORY_OPTIONS.map((o) => (
                  <Chip
                    key={o.value}
                    label={o.label}
                    selected={priceCategory === o.value}
                    onPress={() => setValue("price_category", o.value, { shouldDirty: true })}
                  />
                ))}
              </View>
            </View>
            {priceCategory === "registration" && (
              <Controller
                control={control}
                name="registration_capacity"
                render={({ field }) => (
                  <TextInput
                    label="Capacity"
                    keyboardType="number-pad"
                    placeholder="Leave blank for unlimited"
                    value={field.value}
                    onChangeText={(v) => field.onChange(v.replace(/[^0-9]/g, ""))}
                  />
                )}
              />
            )}
            {priceCategory === "external" && (
              <Controller
                control={control}
                name="ticket_link"
                render={({ field, fieldState }) => (
                  <TextInput
                    label="Ticket Link"
                    placeholder="https://example.com/tickets"
                    autoCapitalize="none"
                    keyboardType="url"
                    value={field.value}
                    onChangeText={field.onChange}
                    error={fieldState.error?.message}
                  />
                )}
              />
            )}
            {priceCategory === "paid" && (
              <View style={styles.field}>
                <Text variant="label">Ticket Options</Text>
                {options.fields.map((f, i) => (
                  <Card key={f.id} style={styles.subCard}>
                    <View style={styles.row}>
                      <Text variant="captionMedium" style={styles.flex}>
                        Option {i + 1}
                      </Text>
                      {options.fields.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          icon="trash-2"
                          accessibilityLabel={`Remove option ${i + 1}`}
                          onPress={() => options.remove(i)}
                        />
                      )}
                    </View>
                    <Controller
                      control={control}
                      name={`options.${i}.name`}
                      render={({ field }) => (
                        <TextInput
                          label="Name"
                          placeholder="e.g. Early Bird"
                          value={field.value}
                          onChangeText={field.onChange}
                        />
                      )}
                    />
                    <View style={styles.row}>
                      <View style={styles.flex}>
                        <Controller
                          control={control}
                          name={`options.${i}.release_date`}
                          render={({ field }) => (
                            <DateTimeField
                              label="Release Date"
                              mode="date"
                              value={field.value}
                              onChange={(v) => field.onChange(v)}
                            />
                          )}
                        />
                      </View>
                      <View style={styles.flex}>
                        <Controller
                          control={control}
                          name={`options.${i}.close_date`}
                          render={({ field }) => (
                            <DateTimeField
                              label="Close Date"
                              mode="date"
                              value={field.value}
                              onChange={(v) => field.onChange(v)}
                              clearable
                            />
                          )}
                        />
                      </View>
                    </View>
                    <View style={styles.row}>
                      <View style={styles.flex}>
                        <Controller
                          control={control}
                          name={`options.${i}.price`}
                          render={({ field }) => (
                            <TextInput
                              label="Price (AUD)"
                              keyboardType="decimal-pad"
                              value={field.value}
                              onChangeText={(v) => field.onChange(v.replace(/[^0-9.]/g, ""))}
                            />
                          )}
                        />
                      </View>
                      <View style={styles.flex}>
                        <Controller
                          control={control}
                          name={`options.${i}.capacity`}
                          render={({ field }) => (
                            <TextInput
                              label="Capacity"
                              keyboardType="number-pad"
                              value={field.value}
                              onChangeText={(v) => field.onChange(v.replace(/[^0-9]/g, ""))}
                            />
                          )}
                        />
                      </View>
                    </View>
                  </Card>
                ))}
                {!!fieldError(errors.options) && (
                  <Text variant="caption" color="destructive">
                    {fieldError(errors.options)}
                  </Text>
                )}
                {options.fields.length < MAX_TICKET_OPTIONS && (
                  <Button
                    title="Add Option"
                    icon="plus"
                    variant="outline"
                    size="sm"
                    onPress={() => options.append({ ...EMPTY_OPTION })}
                  />
                )}
              </View>
            )}
          </>
        )}

        {step === "promo" &&
          (priceCategory !== "paid" ? (
            <Text variant="bodySm" color="mutedForeground">
              Promo codes are only available for Paid events.
            </Text>
          ) : (
            <View style={styles.field}>
              <Text variant="label">Promo Codes</Text>
              {promos.fields.map((f, i) => (
                <Card key={f.id} style={styles.subCard}>
                  <View style={styles.row}>
                    <Text variant="captionMedium" style={styles.flex}>
                      Promo code {i + 1}
                    </Text>
                    <Button
                      variant="ghost"
                      size="icon"
                      icon="trash-2"
                      accessibilityLabel={`Remove promo code ${i + 1}`}
                      onPress={() => promos.remove(i)}
                    />
                  </View>
                  <Controller
                    control={control}
                    name={`promo_codes.${i}.code`}
                    render={({ field }) => (
                      <TextInput
                        label="Code"
                        placeholder="e.g. EARLYBIRD10"
                        autoCapitalize="characters"
                        value={field.value}
                        onChangeText={field.onChange}
                      />
                    )}
                  />
                  <View style={styles.row}>
                    <View style={styles.flex}>
                      <Controller
                        control={control}
                        name={`promo_codes.${i}.discount_percentage`}
                        render={({ field }) => (
                          <TextInput
                            label="Discount Percentage"
                            keyboardType="number-pad"
                            value={field.value}
                            onChangeText={(v) =>
                              field.onChange(v.replace(/[^0-9]/g, "").slice(0, 3))
                            }
                          />
                        )}
                      />
                    </View>
                    <View style={styles.flex}>
                      <Controller
                        control={control}
                        name={`promo_codes.${i}.limit`}
                        render={({ field }) => (
                          <TextInput
                            label="Limit"
                            keyboardType="number-pad"
                            value={field.value}
                            onChangeText={(v) => field.onChange(v.replace(/[^0-9]/g, ""))}
                          />
                        )}
                      />
                    </View>
                  </View>
                  <Text variant="captionMedium">Applies to (leave empty for all tickets)</Text>
                  {namedOptions.length === 0 ? (
                    <Text variant="caption" color="mutedForeground">
                      Add ticket options in the Pricing tab first.
                    </Text>
                  ) : (
                    <Controller
                      control={control}
                      name={`promo_codes.${i}.applicable_options`}
                      render={({ field }) => (
                        <View style={styles.field}>
                          {namedOptions.map((name) => (
                            <Checkbox
                              key={name}
                              label={name}
                              checked={field.value.includes(name)}
                              onChange={(on) =>
                                field.onChange(
                                  on
                                    ? [...field.value, name]
                                    : field.value.filter((n) => n !== name),
                                )
                              }
                            />
                          ))}
                        </View>
                      )}
                    />
                  )}
                </Card>
              ))}
              {promos.fields.length < MAX_PROMO_CODES && (
                <Button
                  title="Add Promo Code"
                  icon="plus"
                  variant="outline"
                  size="sm"
                  onPress={() => promos.append({ ...EMPTY_PROMO })}
                />
              )}
            </View>
          ))}

        {step === "host" && (
          <>
            <Controller
              control={control}
              name="host_name"
              render={({ field }) => (
                <TextInput
                  label="Name"
                  placeholder="Host name"
                  value={field.value}
                  onChangeText={field.onChange}
                />
              )}
            />
            <Controller
              control={control}
              name="email"
              render={({ field, fieldState }) => (
                <TextInput
                  label="Email"
                  placeholder="e.g. hello@gmail.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={field.value}
                  onChangeText={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="phone_number"
              render={({ field }) => (
                <TextInput
                  label="Phone Number"
                  placeholder="e.g. +61 234 567 890"
                  keyboardType="phone-pad"
                  value={field.value}
                  onChangeText={field.onChange}
                />
              )}
            />
            <Controller
              control={control}
              name="website_link"
              render={({ field }) => (
                <TextInput
                  label="Website Link"
                  placeholder="e.g. example.com"
                  autoCapitalize="none"
                  keyboardType="url"
                  value={field.value}
                  onChangeText={field.onChange}
                />
              )}
            />
            <Controller
              control={control}
              name="support_details"
              render={({ field }) => (
                <TextInput
                  label="Support"
                  multiline
                  style={styles.textArea}
                  value={field.value}
                  onChangeText={field.onChange}
                />
              )}
            />
          </>
        )}

        {step === "settings" && (
          <>
            <Controller
              control={control}
              name="max_tickets_per_request"
              render={({ field }) => (
                <TextInput
                  label="Maximum tickets per booking request"
                  keyboardType="number-pad"
                  value={field.value}
                  onChangeText={(v) => field.onChange(v.replace(/[^0-9]/g, ""))}
                />
              )}
            />
            <Controller
              control={control}
              name="show_remaining_tickets"
              render={({ field }) => (
                <ToggleRow
                  label="Show remaining tickets"
                  description="Display how many tickets are left to buyers."
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </>
        )}

        {nav}
        {Object.keys(errors).length > 0 && (
          <Pressable
            onPress={() => {
              const s = firstErrorStep(errors);
              if (s) setStep(s);
            }}
            accessibilityRole="button"
          >
            <Text variant="caption" color="destructive" align="center">
              Some steps have errors (marked with a red dot). Tap to go to the first one.
            </Text>
          </Pressable>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: {
    gap: theme.spacing[4],
    paddingHorizontal: theme.spacing[6],
    paddingVertical: theme.spacing[4],
  },
  field: { gap: theme.spacing[2] },
  row: { flexDirection: "row", alignItems: "flex-start", gap: theme.spacing[3] },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing[2] },
  imageRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing[3] },
  preview: { width: theme.sizes.thumbLg, height: theme.sizes.thumbLg },
  textArea: { minHeight: theme.sizes.textAreaMinHeight, textAlignVertical: "top" },
  subCard: { gap: theme.spacing[3] },
  stepNav: { flexDirection: "row", alignItems: "center", gap: theme.spacing[2] },
});
