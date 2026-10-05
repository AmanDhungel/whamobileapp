import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { StyleSheet, View, type ColorValue } from "react-native";

import { theme, useTheme } from "@/theme";

type IconName = keyof typeof Feather.glyphMap;

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

// Business tab bar (consumer tabs are untouched). Bookings joins in the next chunk.
const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: "index", title: "Overview", icon: "grid" },
  { name: "events", title: "Events", icon: "calendar" },
  { name: "scan", title: "Scan", icon: "maximize" },
  { name: "more", title: "More", icon: "menu" },
];

export default function BusinessTabsLayout() {
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
