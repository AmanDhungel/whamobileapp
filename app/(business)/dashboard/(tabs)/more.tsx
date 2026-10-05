import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { AccountActions, Avatar, Card, ListDivider, ListRow, Screen, Text } from "@/components";
import { useAuthStore } from "@/store/authStore";
import { theme, useTheme } from "@/theme";
import { WEBSITE_URL, openInAppBrowser } from "@/utils/links";

/**
 * More: business identity, links for the sections still to come in the app (they open
 * the website dashboard meanwhile), account actions.
 */
export default function BusinessMoreScreen() {
  const t = useTheme();
  const user = useAuthStore((s) => s.user);

  return (
    <Screen edges={["top"]}>
      <Image
        source={require("../../../../assets/images/logo.png")}
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

      <View style={styles.section}>
        <Text variant="captionMedium" color="mutedForeground">
          On the website for now
        </Text>
        <Card padded={false}>
          <ListRow
            icon="calendar"
            label="Bookings & calendar"
            onPress={() => void openInAppBrowser(`${WEBSITE_URL}/dashboard/calendar`)}
          />
          <ListDivider />
          <ListRow
            icon="tag"
            label="Deals"
            onPress={() => void openInAppBrowser(`${WEBSITE_URL}/dashboard/deals`)}
          />
          <ListDivider />
          <ListRow
            icon="book-open"
            label="Services, team & resources"
            onPress={() => void openInAppBrowser(`${WEBSITE_URL}/dashboard/services`)}
          />
          <ListDivider />
          <ListRow
            icon="settings"
            label="Business settings"
            onPress={() => void openInAppBrowser(`${WEBSITE_URL}/dashboard/settings`)}
          />
        </Card>
      </View>

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
  section: { gap: theme.spacing[2], marginTop: theme.spacing[6] },
});
