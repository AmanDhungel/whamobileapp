import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { StyleSheet, View, type ColorValue } from "react-native";

import { theme, useTheme } from "@/theme";

type IconName = keyof typeof Feather.glyphMap;

/** Active tab: filled-looking icon + a short indicator bar above it (web BottomNavbar). */
function TabIcon({
  name,
  color,
  focused,
}: {
  name: IconName;
  color: ColorValue;
  focused: boolean;
}) {
  const t = useTheme();
  return (
    <View style={styles.iconWrap}>
      {focused && <View style={[styles.indicator, { backgroundColor: t.colors.secondary }]} />}
      <Feather name={name} size={t.sizes.iconLg} color={color} />
    </View>
  );
}

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: "index", title: "Home", icon: "home" },
  { name: "search", title: "Search", icon: "search" },
  { name: "activity", title: "Activity", icon: "calendar" },
  { name: "profile", title: "Profile", icon: "user" },
];

/** Mirrors components/ResuableComponents/BottomNavbar.tsx: Home · Search · Activity · Profile. */
export default function TabsLayout() {
  const t = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.colors.secondary,
        tabBarInactiveTintColor: t.colors.mutedForeground,
        tabBarLabelStyle: t.typography.variants.tabLabel,
        tabBarStyle: {
          backgroundColor: t.colors.background,
          borderTopColor: t.colors.border,
          ...t.shadows.md,
        },
        sceneStyle: { backgroundColor: t.colors.background },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarAccessibilityLabel: tab.title,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name={tab.icon} color={color} focused={focused} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: { alignItems: "center", justifyContent: "center" },
  indicator: {
    position: "absolute",
    top: -theme.spacing[2],
    width: theme.sizes.tabIndicatorWidth,
    height: theme.sizes.tabIndicatorHeight,
    borderRadius: theme.radius.full,
  },
});
