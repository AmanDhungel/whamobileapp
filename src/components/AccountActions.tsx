import { Alert } from "react-native";

import { useDeleteAccount, useLogout } from "@/hooks/useAuthActions";

import { Card } from "./Card";
import { ListDivider, ListRow } from "./ListRow";

/** Log out + Delete account (App Store requirement) — shared by Profile and the business area. */
export function AccountActions() {
  const logout = useLogout();
  const deleteAccount = useDeleteAccount();

  const confirmLogout = () =>
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: () => logout.mutate() },
    ]);

  const confirmDelete = () =>
    Alert.alert(
      "Delete account?",
      "This permanently deletes your account and personal data. Your past tickets and bookings will no longer be linked to you. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete account", style: "destructive", onPress: () => deleteAccount.mutate() },
      ],
    );

  return (
    <Card padded={false}>
      <ListRow icon="log-out" label="Log out" onPress={confirmLogout} disabled={logout.isPending} />
      <ListDivider />
      <ListRow
        icon="trash-2"
        label={deleteAccount.isPending ? "Deleting account…" : "Delete account"}
        color="destructive"
        onPress={confirmDelete}
        disabled={deleteAccount.isPending}
      />
    </Card>
  );
}
