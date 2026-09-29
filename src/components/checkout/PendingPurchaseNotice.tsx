import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import { usePendingPurchaseStore } from "@/store/pendingPurchaseStore";
import { theme, useTheme } from "@/theme";

import { Button } from "../Button";
import { Text } from "../Text";

/**
 * Paid orders whose tickets haven't been issued yet (see pendingPurchaseStore). Offers
 * to finish them from the event's checkout screen (recovery panel — never a new payment).
 */
export function PendingPurchaseNotice() {
  const t = useTheme();
  const pending = usePendingPurchaseStore((s) => s.pending);
  if (!pending.length) return null;

  return (
    <View style={styles.list}>
      {pending.map((p) => (
        <View
          key={p.paymentIntentId}
          style={[
            styles.card,
            { backgroundColor: t.colors.warningMuted, borderColor: t.colors.warning },
          ]}
        >
          <Feather name="alert-circle" size={t.sizes.iconMd} color={t.colors.warning} />
          <View style={styles.text}>
            <Text variant="label">Payment received{p.eventTitle ? ` — ${p.eventTitle}` : ""}</Text>
            <Text variant="caption" color="mutedForeground">
              Your tickets haven&apos;t been issued yet. Don&apos;t pay again — finish here.
            </Text>
          </View>
          {!!p.eventSlug && (
            <Button
              title="Finish"
              size="sm"
              fullWidth={false}
              onPress={() =>
                router.push({
                  pathname: "/checkout/[slug]",
                  params: { slug: p.eventSlug ?? "", ...(p.guestInfo ? { guest: "1" } : {}) },
                })
              }
            />
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: theme.spacing[3] },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    padding: theme.spacing[3],
    borderWidth: theme.sizes.hairline,
    borderRadius: theme.radius.xl,
  },
  text: { flex: 1, gap: theme.spacing[0.5] },
});
