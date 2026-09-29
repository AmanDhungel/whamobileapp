import { router } from "expo-router";
import { useState } from "react";
import { RefreshControl, StyleSheet, View } from "react-native";

import { getErrorMessage } from "@/api/errors";
import {
  AccountActions,
  AccountTypeChoice,
  Avatar,
  Card,
  ListDivider,
  ListRow,
  Screen,
  showToast,
  Text,
} from "@/components";
import { useAuthStore, useIsCustomer } from "@/store/authStore";
import { theme, useTheme } from "@/theme";
import { legalLinks, openInAppBrowser } from "@/utils/links";

/**
 * ~ web /dashboard (consumer). Logged out it shows the web's /auth choice
 * (Customers / Business) — this tab is the main "Log in" entry point.
 */
export default function ProfileScreen() {
  const t = useTheme();
  const isCustomer = useIsCustomer();
  const user = useAuthStore((s) => s.user);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const [refreshing, setRefreshing] = useState(false);

  if (!isCustomer) {
    return (
      <Screen edges={["top"]}>
        <Text variant="h2" style={styles.title} accessibilityRole="header">
          Profile
        </Text>
        <Text variant="bodySm" color="mutedForeground" style={styles.intro}>
          Log in or create an account to save favorites, write reviews and keep your tickets in one
          place.
        </Text>
        <AccountTypeChoice />
        <View style={styles.legal}>
          <ListRow
            icon="shield"
            label="Privacy Policy"
            onPress={() => void openInAppBrowser(legalLinks.privacy)}
          />
          <ListRow
            icon="file-text"
            label="Terms of Service"
            onPress={() => void openInAppBrowser(legalLinks.termsOfService)}
          />
        </View>
      </Screen>
    );
  }

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshUser();
    } catch (err) {
      showToast({ type: "error", message: getErrorMessage(err) });
    } finally {
      setRefreshing(false);
    }
  };

  const details = [user?.phone_number, user?.location].filter(Boolean).join(" · ");

  return (
    <Screen
      edges={["top"]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void onRefresh()}
          tintColor={t.colors.primary}
        />
      }
    >
      <Text variant="h2" style={styles.title} accessibilityRole="header">
        Profile
      </Text>

      <View style={styles.identity}>
        <Avatar uri={user?.image} name={user?.name} fallback={user?.email} size={t.sizes.avatar} />
        <View style={styles.identityText}>
          <Text variant="h3" numberOfLines={1}>
            {user?.name || "WHA member"}
          </Text>
          <Text variant="bodySm" color="mutedForeground" numberOfLines={1}>
            {user?.email}
          </Text>
          {!!details && (
            <Text variant="caption" color="mutedForeground" numberOfLines={2}>
              {details}
            </Text>
          )}
        </View>
      </View>

      <Card padded={false} style={styles.block}>
        <ListRow icon="edit-2" label="Edit profile" onPress={() => router.push("/profile/edit")} />
        <ListDivider />
        <ListRow icon="heart" label="Favorites" onPress={() => router.push("/favorites")} />
        <ListDivider />
        <ListRow icon="calendar" label="My tickets" onPress={() => router.navigate("/activity")} />
      </Card>

      <Card padded={false} style={styles.block}>
        <ListRow
          icon="shield"
          label="Privacy Policy"
          onPress={() => void openInAppBrowser(legalLinks.privacy)}
        />
        <ListDivider />
        <ListRow
          icon="file-text"
          label="Terms of Service"
          onPress={() => void openInAppBrowser(legalLinks.termsOfService)}
        />
      </Card>

      <AccountActions />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: theme.spacing[4] },
  intro: { marginBottom: theme.spacing[6] },
  legal: { marginTop: theme.spacing[8] },
  identity: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[4],
    marginBottom: theme.spacing[6],
  },
  identityText: { flex: 1, gap: theme.spacing[1] },
  block: { marginBottom: theme.spacing[4] },
});
