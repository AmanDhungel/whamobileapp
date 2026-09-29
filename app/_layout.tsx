import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { queryClient } from "@/api/queryClient";
import { LoginPromptSheet, ToastHost } from "@/components";
import { ConfigErrorScreen } from "@/components/ConfigErrorScreen";
import { PaymentsProvider } from "@/services/payments";
import { useAccountArea, useAuthStore } from "@/store/authStore";
import { fontAssets, theme } from "@/theme";
import { configProblems } from "@/utils/env";

// Hold the native splash until fonts are loaded AND the stored session is restored.
void SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: theme.animation.normal, fade: true });

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const status = useAuthStore((s) => s.status);

  const configOk = configProblems.length === 0;

  useEffect(() => {
    if (!configOk) return; // nothing may call the API with a broken configuration
    useAuthStore
      .getState()
      .restore()
      .catch(() => useAuthStore.setState({ status: "signedOut", user: null }));
  }, [configOk]);

  // A font failure falls back to system fonts rather than blocking the app.
  const ready = (fontsLoaded || !!fontError) && (!configOk || status !== "loading");

  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);

  if (!ready) return null;

  if (!configOk) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <ConfigErrorScreen problems={configProblems} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <PaymentsProvider>
          <StatusBar style="dark" />
          <RootNavigator />
          <LoginPromptSheet />
          <ToastHost />
        </PaymentsProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

/**
 * The first screen is decided by state, never by a gate:
 *   logged out → public customer tabs (browsing needs no account)
 *   customer   → customer tabs
 *   business   → business area only (never the customer tabs)
 * When the state changes (log in / log out / restore), unavailable screens are
 * removed and the router lands on the first available one automatically.
 */
function RootNavigator() {
  const area = useAccountArea();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Protected guard={area === "business"}>
        <Stack.Screen name="(business)" />
      </Stack.Protected>

      <Stack.Protected guard={area !== "business"}>
        <Stack.Screen name="(tabs)" />
        {/* Deep-link-ready detail routes — same paths as the website. */}
        <Stack.Screen name="events/index" />
        <Stack.Screen name="events/[slug]" />
        <Stack.Screen name="businesses/[slug]" />
        <Stack.Screen name="deals/index" />
        <Stack.Screen name="deals/[id]" />
        <Stack.Screen name="activity/tickets/[id]" />
        <Stack.Screen name="favorites" />
        <Stack.Screen name="profile/edit" />
      </Stack.Protected>

      {/* Login/signup: reachable from any "Log in" entry point while logged out. On
          success this guard flips and the user lands in their area. */}
      <Stack.Protected guard={area === "public"}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      <Stack.Screen name="+not-found" />
    </Stack>
  );
}
