import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { theme } from "@/theme";

import { BottomSheet } from "./BottomSheet";
import { Button } from "./Button";

export interface ConfirmSheetProps {
  visible: boolean;
  title: string;
  /** Rich body (bold names etc.) — plain strings are fine too. */
  children: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** "Are you sure?" dialog with Cancel / Confirm (web AlertDialog). */
export function ConfirmSheet({
  visible,
  title,
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmSheetProps) {
  return (
    <BottomSheet
      visible={visible}
      onClose={onCancel}
      title={title}
      footer={
        <View style={styles.buttons}>
          <Button
            title={cancelLabel}
            variant="outline"
            fullWidth={false}
            style={styles.flex}
            disabled={loading}
            onPress={onCancel}
          />
          <Button
            title={confirmLabel}
            variant={destructive ? "destructive" : "default"}
            fullWidth={false}
            style={styles.flex}
            loading={loading}
            onPress={onConfirm}
          />
        </View>
      }
    >
      {children}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  buttons: { flexDirection: "row", gap: theme.spacing[3] },
  flex: { flex: 1 },
});
