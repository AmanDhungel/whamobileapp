import { useMemo, type ReactElement } from "react";
import { StyleSheet, View } from "react-native";

import type { BusinessFilters } from "@/api/businesses";
import type { BusinessSummary } from "@/api/types";
import { useBusinesses } from "@/hooks/queries/browse";
import { theme } from "@/theme";
import { averageRating } from "@/utils/rating";

import { BusinessCard } from "../BusinessCard";
import { QueryList } from "../QueryList";
import { CardSkeleton } from "../Skeleton";

export type BusinessSort = "best" | "nearest" | "top";

/** Web sort options (BusinessPage.tsx SortKey). The web never sends these to the API —
 *  it's local-only UI that does nothing — so the app applies them on-device. */
export const BUSINESS_SORT_OPTIONS = [
  { label: "Best match", value: "best" as const, icon: "star" as const },
  { label: "Nearest", value: "nearest" as const, icon: "navigation" as const },
  { label: "Top rated", value: "top" as const, icon: "award" as const },
];

function sortBusinesses(list: BusinessSummary[], sort: BusinessSort): BusinessSummary[] {
  if (sort === "nearest") {
    return [...list].sort(
      (a, b) => (a.distance ?? Number.POSITIVE_INFINITY) - (b.distance ?? Number.POSITIVE_INFINITY),
    );
  }
  if (sort === "top") {
    return [...list].sort(
      (a, b) =>
        (averageRating(b.reviews) ?? -1) - (averageRating(a.reviews) ?? -1) ||
        (b.reviews?.length ?? 0) - (a.reviews?.length ?? 0),
    );
  }
  return list; // server order
}

export function BusinessResults({
  filters,
  sort = "best",
  header,
}: {
  filters: BusinessFilters;
  sort?: BusinessSort;
  header?: ReactElement;
}) {
  const query = useBusinesses(filters);
  const data = useMemo(
    () => (query.data ? sortBusinesses(query.data, sort) : undefined),
    [query.data, sort],
  );

  return (
    <QueryList
      query={{ ...query, data }}
      keyExtractor={(b) => b._id}
      renderItem={({ item }) => <BusinessCard business={item} />}
      ItemSeparatorComponent={Separator}
      ListHeaderComponent={header}
      skeleton={<CardSkeleton variant="business" />}
      empty={{
        icon: "search",
        title: "No businesses found",
        message: "Try a different search, category or location.",
      }}
      errorTitle="Couldn't load businesses"
    />
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({ separator: { height: theme.spacing[6] } });
