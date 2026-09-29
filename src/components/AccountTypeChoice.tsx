import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import { theme } from "@/theme";

import { ChoiceCard } from "./ChoiceCard";

/**
 * The website's /auth choice (components/Auth/AuthChoicePage.tsx): customers vs.
 * business, same copy. Used on Welcome and on the logged-out Profile tab.
 */
export function AccountTypeChoice() {
  return (
    <View style={styles.cards}>
      <ChoiceCard
        icon="users"
        title="WHA for Customers"
        description="Book services, manage appointments and discover local businesses."
        onPress={() => router.push({ pathname: "/login", params: { type: "user" } })}
      />
      <ChoiceCard
        icon="briefcase"
        title="WHA for Business"
        description="List your services, manage bookings and grow your customer base."
        onPress={() => router.push({ pathname: "/login", params: { type: "business" } })}
      />
    </View>
  );
}

const styles = StyleSheet.create({ cards: { gap: theme.spacing[4] } });
