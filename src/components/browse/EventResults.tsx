import type { ReactElement } from "react";
import { StyleSheet, View } from "react-native";

import type { EventFilters } from "@/api/events";
import { useEvents } from "@/hooks/queries/browse";
import { theme } from "@/theme";

import { EventCard } from "../EventCard";
import { QueryList } from "../QueryList";
import { CardSkeleton } from "../Skeleton";

export function EventResults({
  filters,
  header,
}: {
  filters: EventFilters;
  header?: ReactElement;
}) {
  const query = useEvents(filters);
  return (
    <QueryList
      query={query}
      keyExtractor={(e) => e._id}
      renderItem={({ item }) => <EventCard event={item} />}
      ItemSeparatorComponent={Separator}
      ListHeaderComponent={header}
      skeleton={<CardSkeleton variant="event" />}
      empty={{
        icon: "calendar",
        title: "No upcoming events",
        message: "There are no events matching these filters yet. Check back soon.",
      }}
      errorTitle="Couldn't load events"
    />
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({ separator: { height: theme.spacing[6] } });
