import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Share, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { BusinessEvent } from "@/api/types";
import {
  ActionSheet,
  Button,
  CardSkeleton,
  EventRow,
  QueryList,
  SearchBar,
  SegmentedControl,
  Text,
  showToast,
  type ActionSheetAction,
} from "@/components";
import { useMyEvents, useToggleEventArchive } from "@/hooks/queries/businessEvents";
import { theme, useTheme } from "@/theme";
import {
  ARCHIVE_BLOCKED_MESSAGE,
  canArchive,
  eventPublicUrl,
  getEventStatus,
  sortEvents,
  type EventStatus,
} from "@/utils/businessEvents";
import { openInAppBrowser } from "@/utils/links";

const TABS: { label: string; value: EventStatus }[] = [
  { label: "Upcoming", value: "upcoming" },
  { label: "Live", value: "live" },
  { label: "Past", value: "past" },
  { label: "Archived", value: "archived" },
];

/** ~ web /dashboard/events ("My events"). */
export default function BusinessEventsScreen() {
  const t = useTheme();
  const query = useMyEvents();
  const archive = useToggleEventArchive();
  const [tab, setTab] = useState<EventStatus>("upcoming");
  const [search, setSearch] = useState("");
  const [menuFor, setMenuFor] = useState<BusinessEvent | null>(null);

  const events = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matching = (query.data ?? []).filter(
      (e) => getEventStatus(e) === tab && (!q || e.title?.toLowerCase().includes(q)),
    );
    return sortEvents(matching, tab);
  }, [query.data, tab, search]);

  const share = async (event: BusinessEvent) => {
    const url = eventPublicUrl(event);
    if (!url) {
      showToast({ type: "info", message: "This event doesn't have a public link yet" });
      return;
    }
    await Share.share({ message: url, url });
  };

  const toggleArchive = (event: BusinessEvent) => {
    // Same rule as the server (which re-checks); unarchive is always allowed.
    if (!canArchive(event)) {
      showToast({ type: "error", message: ARCHIVE_BLOCKED_MESSAGE });
      return;
    }
    archive.mutate(String(event._id));
  };

  const actions = (event: BusinessEvent): ActionSheetAction[] => [
    {
      label: "Manage",
      icon: "sliders",
      onPress: () =>
        router.push({ pathname: "/dashboard/events/[id]", params: { id: String(event._id) } }),
    },
    {
      label: "Edit",
      icon: "edit-2",
      onPress: () =>
        router.push({ pathname: "/dashboard/events/add-event", params: { id: String(event._id) } }),
    },
    ...(event.slug
      ? [
          {
            label: "View public page",
            icon: "external-link" as const,
            onPress: () => void openInAppBrowser(eventPublicUrl(event)!),
          },
        ]
      : []),
    { label: "Share link", icon: "share-2", onPress: () => void share(event) },
    {
      label: event.archived ? "Unarchive" : "Archive",
      icon: "archive",
      destructive: !event.archived,
      onPress: () => toggleArchive(event),
    },
  ];

  return (
    <SafeAreaView edges={["top"]} style={[styles.flex, { backgroundColor: t.colors.background }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text variant="h2" accessibilityRole="header" style={styles.flex}>
            My events
          </Text>
          <Button
            title="Add Event"
            icon="plus"
            size="sm"
            fullWidth={false}
            onPress={() => router.push("/dashboard/events/add-event")}
          />
        </View>
        <SegmentedControl options={TABS} value={tab} onChange={setTab} />
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search" />
      </View>

      <QueryList
        query={{ ...query, data: query.data ? events : undefined }}
        keyExtractor={(e) => String(e._id)}
        renderItem={({ item }) => (
          <EventRow
            event={item}
            onPress={() =>
              router.push({ pathname: "/dashboard/events/[id]", params: { id: String(item._id) } })
            }
            onMore={() => setMenuFor(item)}
          />
        )}
        ItemSeparatorComponent={Separator}
        skeleton={<CardSkeleton variant="row" />}
        empty={{
          icon: "calendar",
          title: search.trim() ? "No events match your search." : `No ${tab} events found.`,
          action: search.trim() ? undefined : (
            <Button
              title="Create your first event"
              onPress={() => router.push("/dashboard/events/add-event")}
            />
          ),
        }}
        errorTitle="Couldn't load your events"
      />

      <ActionSheet
        visible={!!menuFor}
        onClose={() => setMenuFor(null)}
        title={menuFor?.title}
        actions={menuFor ? actions(menuFor) : []}
      />
    </SafeAreaView>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { gap: theme.spacing[3], padding: theme.spacing[6], paddingBottom: theme.spacing[4] },
  titleRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing[3] },
  separator: { height: theme.spacing[4] },
});
