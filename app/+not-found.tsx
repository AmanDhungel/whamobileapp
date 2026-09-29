import { router } from "expo-router";

import { Button, EmptyState, Screen } from "@/components";

export default function NotFoundScreen() {
  return (
    <Screen scroll={false}>
      <EmptyState
        icon="compass"
        title="Page not found"
        message="This screen doesn't exist or the link is incorrect."
        action={<Button title="Go home" onPress={() => router.replace("/")} />}
      />
    </Screen>
  );
}
