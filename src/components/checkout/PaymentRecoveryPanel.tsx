import { StyleSheet, View } from "react-native";

import type { GuestInfo } from "@/api/types";
import type { RecoveryState } from "@/hooks/useCheckout";
import { theme } from "@/theme";

import { Button } from "../Button";
import { Card } from "../Card";
import { EmptyState } from "../EmptyState";
import { Text } from "../Text";
import { GuestDetailsForm } from "./GuestDetailsForm";

export interface PaymentRecoveryPanelProps {
  recovery: RecoveryState;
  retrying: boolean;
  initialDetails?: Partial<GuestInfo> | null;
  onRetry: (details?: GuestInfo) => void;
}

/**
 * Shown after a successful payment whose tickets couldn't be issued yet. It only ever
 * retries finalizing the SAME PaymentIntent — it never offers to pay again.
 * GUEST_INFO_REQUIRED → the web's "Confirm your details" dialog.
 */
export function PaymentRecoveryPanel({
  recovery,
  retrying,
  initialDetails,
  onRetry,
}: PaymentRecoveryPanelProps) {
  if (recovery.needsGuestInfo) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="check-circle"
          title="Confirm your details"
          message="Your payment went through successfully — we just need your details to send your tickets."
        />
        <GuestDetailsForm
          initial={initialDetails}
          submitLabel="Get my tickets"
          submitting={retrying}
          onSubmit={(d) => onRetry(d)}
        />
        {!!recovery.message && (
          <Text variant="caption" color="destructive">
            {recovery.message}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <EmptyState
        icon="check-circle"
        title="Your payment went through"
        message={
          recovery.refundable
            ? "We couldn't issue these tickets. You won't be charged twice — our support team will refund this payment."
            : "We're issuing your tickets now. If this keeps failing, don't pay again: your tickets will also arrive by email once they're issued."
        }
      />
      {!!recovery.message && (
        <Card elevated={false}>
          <Text variant="bodySm" color={recovery.refundable ? "destructive" : "mutedForeground"}>
            {recovery.message}
          </Text>
        </Card>
      )}
      {!recovery.refundable && (
        <Button
          title="Retry issuing my tickets"
          icon="refresh-cw"
          loading={retrying}
          onPress={() => onRetry()}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({ container: { gap: theme.spacing[5] } });
