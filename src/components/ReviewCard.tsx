import { StyleSheet, View } from "react-native";

import type { Review } from "@/api/types";
import { theme, useTheme } from "@/theme";
import { formatDate } from "@/utils/format";
import { reviewAuthor } from "@/utils/rating";

import { Avatar } from "./Avatar";
import { RatingStars } from "./RatingStars";
import { Text } from "./Text";
import { TextLink } from "./TextLink";

export interface ReviewCardProps {
  review: Review;
  /** The signed-in user wrote this review → show Edit / Delete. */
  isOwn?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ReviewCard({ review, isOwn, onEdit, onDelete }: ReviewCardProps) {
  const t = useTheme();
  const author = reviewAuthor(review);
  const name = isOwn ? "You" : author?.name || author?.business_name || "User";

  return (
    <View style={[styles.card, { borderColor: t.colors.border }]}>
      <View style={styles.header}>
        <Avatar uri={author?.image} name={author?.name} />
        <View style={styles.headerText}>
          <Text variant="label">{name}</Text>
          <View style={styles.meta}>
            <RatingStars value={review.rating} size={t.sizes.starSm} />
            {!!formatDate(review.created_at) && (
              <Text variant="caption" color="mutedForeground">
                {formatDate(review.created_at)}
              </Text>
            )}
          </View>
        </View>
      </View>
      <Text variant="bodySm">{review.comment}</Text>
      {!!review.business_reply?.text && (
        <View style={[styles.reply, { backgroundColor: t.colors.muted }]}>
          <Text variant="captionMedium">Response from the business</Text>
          <Text variant="caption" color="mutedForeground">
            {review.business_reply.text}
          </Text>
        </View>
      )}
      {isOwn && (
        <View style={styles.actions}>
          {onEdit && <TextLink onPress={onEdit}>Edit</TextLink>}
          {onDelete && (
            <TextLink color="destructive" onPress={onDelete}>
              Delete
            </TextLink>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: theme.spacing[3],
    padding: theme.spacing[4],
    borderWidth: theme.sizes.hairline,
    borderRadius: theme.radius.tailwindLg,
  },
  header: { flexDirection: "row", alignItems: "center", gap: theme.spacing[3] },
  headerText: { flex: 1, gap: theme.spacing[0.5] },
  meta: { flexDirection: "row", alignItems: "center", gap: theme.spacing[2] },
  reply: { gap: theme.spacing[1], padding: theme.spacing[3], borderRadius: theme.radius.lg },
  actions: { flexDirection: "row", gap: theme.spacing[5] },
});
