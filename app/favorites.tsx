import { useState, type ReactElement } from "react";
import { StyleSheet, View } from "react-native";

import {
  BusinessCard,
  CardSkeleton,
  DealCard,
  EventCard,
  LoginPrompt,
  QueryList,
  Screen,
  ScreenHeader,
  SegmentedControl,
} from "@/components";
import { useFavorites } from "@/hooks/queries/favorites";
import { useIsCustomer } from "@/store/authStore";
import { theme } from "@/theme";

type Segment = "events" | "deals" | "business";

const SEGMENTS = [
  { label: "Events", value: "events" as const },
  { label: "Deals", value: "deals" as const },
  { label: "Businesses", value: "business" as const },
];

const EMPTY: Record<Segment, { title: string; message: string }> = {
  events: { title: "No saved events", message: "Tap the heart on an event to save it here." },
  deals: { title: "No saved deals", message: "Tap the heart on a deal to save it here." },
  business: {
    title: "No saved businesses",
    message: "Tap the heart on a business to save it here.",
  },
};

/**
 * ~ web /dashboard/favorite (canonical; /favorites is dead on the web). Tabs: Events /
 * Deals / Businesses. Hearts toggle optimistically and the list updates instantly.
 */
export default function FavoritesScreen() {
  const isCustomer = useIsCustomer();
  const favorites = useFavorites();
  const [segment, setSegment] = useState<Segment>("events");

  if (!isCustomer) {
    return (
      <Screen scroll={false} padded={false}>
        <ScreenHeader title="Favorites" />
        <LoginPrompt
          icon="heart"
          title="Sign in to save favorites"
          message="Save events, deals and businesses to find them again quickly."
        />
      </Screen>
    );
  }

  const skeleton = segment === "events" ? "event" : segment === "deals" ? "deal" : "business";

  return (
    <Screen scroll={false} padded={false}>
      <ScreenHeader title="Favorites" />
      <View style={styles.segment}>
        <SegmentedControl options={SEGMENTS} value={segment} onChange={setSegment} />
      </View>
      <QueryList<{ _id: string; node: ReactElement }>
        query={{
          ...favorites,
          data: favorites.data
            ? segment === "events"
              ? favorites.data.events.map((e) => ({ _id: e._id, node: <EventCard event={e} /> }))
              : segment === "deals"
                ? favorites.data.deals.map((d) => ({ _id: d._id, node: <DealCard deal={d} /> }))
                : favorites.data.business.map((b) => ({
                    _id: b._id,
                    node: <BusinessCard business={b} />,
                  }))
            : undefined,
        }}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => item.node}
        ItemSeparatorComponent={Separator}
        skeleton={<CardSkeleton variant={skeleton} />}
        skeletonCount={2}
        empty={{ icon: "heart", ...EMPTY[segment] }}
        errorTitle="Couldn't load your favorites"
      />
    </Screen>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  segment: { paddingHorizontal: theme.spacing[6], paddingBottom: theme.spacing[4] },
  separator: { height: theme.spacing[6] },
});
