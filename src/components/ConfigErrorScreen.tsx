import { StyleSheet, View } from "react-native";

import { theme } from "@/theme";

import { EmptyState } from "./EmptyState";
import { Screen } from "./Screen";
import { Text } from "./Text";

/**
 * Shown instead of the app when build configuration is wrong (missing API URL,
 * missing or wrong-mode Stripe key…). Fails fast rather than letting a build talk to
 * the wrong backend or take real payments in a test build.
 */
export function ConfigErrorScreen({ problems }: { problems: string[] }) {
  return (
    <Screen>
      <EmptyState
        tone="error"
        icon="alert-octagon"
        title="App configuration error"
        message="This build can't start until its configuration is fixed."
      />
      <View style={styles.list}>
        {problems.map((p) => (
          <Text key={p} variant="bodySm" color="destructive">
            • {p}
          </Text>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ list: { gap: theme.spacing[2] } });
