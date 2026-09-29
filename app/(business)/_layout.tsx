import { Stack } from "expo-router";

import { theme } from "@/theme";

/** Business / super-admin accounts. They never see the customer tabs. */
export default function BusinessLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    />
  );
}
