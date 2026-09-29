import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, View } from "react-native";

import { theme, useTheme } from "@/theme";
import { reviewSchema, type ReviewValues } from "@/utils/validation";

import { BottomSheet } from "./BottomSheet";
import { Button } from "./Button";
import { RatingStars } from "./RatingStars";
import { Text } from "./Text";
import { TextInput } from "./TextInput";

export interface ReviewFormProps {
  visible: boolean;
  onClose: () => void;
  /** Present when editing an existing review. */
  initial?: ReviewValues;
  submitting: boolean;
  onSubmit: (values: ReviewValues) => void;
}

const MAX_COMMENT = 500;

/** Write / edit a review — the web Comment.tsx form, in a bottom sheet. */
export function ReviewForm({ visible, onClose, initial, submitting, onSubmit }: ReviewFormProps) {
  const t = useTheme();
  const { control, handleSubmit, reset, watch } = useForm<ReviewValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: initial ?? { rating: 0, comment: "" },
  });

  // Re-seed the form each time it opens (new review vs. editing a different one).
  useEffect(() => {
    if (visible) reset(initial ?? { rating: 0, comment: "" });
  }, [visible, initial, reset]);

  // eslint-disable-next-line react-hooks/incompatible-library -- RHF watch() for the live counter
  const commentLength = watch("comment")?.length ?? 0;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={initial ? "Edit your review" : "Write a review"}
      footer={
        <Button
          title={initial ? "Update Review" : "Post Review"}
          loading={submitting}
          onPress={handleSubmit(onSubmit)}
        />
      }
    >
      <View style={styles.form}>
        <Controller
          control={control}
          name="rating"
          render={({ field, fieldState }) => (
            <View style={styles.field}>
              <Text variant="label">How would you rate your experience? *</Text>
              <RatingStars value={field.value} onChange={field.onChange} size={t.sizes.starLg} />
              {!!fieldState.error && (
                <Text variant="caption" color="destructive">
                  {fieldState.error.message}
                </Text>
              )}
            </View>
          )}
        />
        <Controller
          control={control}
          name="comment"
          render={({ field, fieldState }) => (
            <TextInput
              label="Your Feedback *"
              placeholder="Write your thoughts here..."
              multiline
              maxLength={MAX_COMMENT}
              textAlignVertical="top"
              style={styles.multiline}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              hint={`${commentLength}/${MAX_COMMENT}`}
            />
          )}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  form: { gap: theme.spacing[5] },
  field: { gap: theme.spacing[2] },
  multiline: { minHeight: theme.sizes.textAreaMinHeight },
});
