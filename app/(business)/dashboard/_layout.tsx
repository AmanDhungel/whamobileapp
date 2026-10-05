import { Stack } from "expo-router";

import { theme } from "@/theme";

/**
 * Business dashboard stack — same paths as the website's /dashboard/*:
 * the tab bar (Overview · Events · Scan · More) plus pushed detail screens.
 */
export default function BusinessDashboardLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="events/[id]" />
      <Stack.Screen name="events/add-event" />
    </Stack>
  );
}
