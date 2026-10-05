import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { AccountActions, Avatar, Button, Card, EmptyState, Screen, Text } from "@/components";
import { useAuthStore } from "@/store/authStore";
import { theme, useTheme } from "@/theme";
import { WEBSITE_URL, openInAppBrowser } from "@/utils/links";

/**
 * Business area placeholder (~ web /dashboard for business accounts). The business
 * dashboard is desktop-oriented on the web and out of scope for v1 mobile.
 */
export default function BusinessDashboardScreen() {
  const t = useTheme();
  const user = useAuthStore((s) => s.user);

  return (
    <Screen>
      <Image
        source={require("../../assets/images/logo.png")}
        style={styles.logo}
        contentFit="contain"
        contentPosition="left"
        accessibilityLabel="WH Australia"
      />

      <Card style={styles.identity}>
        <Avatar
          uri={user?.image}
          name={user?.business_name ?? user?.name}
          fallback={user?.email}
          size={t.sizes.avatar}
        />
        <View style={styles.identityText}>
          <Text variant="h3" numberOfLines={2}>
            {user?.business_name || user?.name || "Your business"}
          </Text>
          <Text variant="bodySm" color="mutedForeground" numberOfLines={1}>
            {user?.email}
          </Text>
        </View>
      </Card>

      <EmptyState
        icon="briefcase"
        title="Business dashboard coming soon"
        message="Manage your business on whaustralia.com for now."
        action={
          <Button
            title="Open whaustralia.com"
            icon="external-link"
            onPress={() => void openInAppBrowser(WEBSITE_URL)}
          />
        }
      />

      <AccountActions />
    </Screen>
  );
}

const styles = StyleSheet.create({
  logo: {
    height: theme.sizes.logoHeight,
    aspectRatio: theme.sizes.logoAspectRatio,
    alignSelf: "flex-start",
    marginBottom: theme.spacing[6],
  },
  identity: { flexDirection: "row", alignItems: "center", gap: theme.spacing[4] },
  identityText: { flex: 1, gap: theme.spacing[1] },
});
