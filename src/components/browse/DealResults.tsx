import type { ReactElement } from "react";
import { StyleSheet, View } from "react-native";

import type { DealFilters } from "@/api/deals";
import { useDeals } from "@/hooks/queries/browse";
import { theme } from "@/theme";

import { DealCard } from "../DealCard";
import { QueryList } from "../QueryList";
import { CardSkeleton } from "../Skeleton";

export function DealResults({ filters, header }: { filters: DealFilters; header?: ReactElement }) {
  const query = useDeals(filters);
  return (
    <QueryList
      query={query}
      keyExtractor={(d) => d._id}
      renderItem={({ item }) => <DealCard deal={item} />}
      ItemSeparatorComponent={Separator}
      ListHeaderComponent={header}
      skeleton={<CardSkeleton variant="deal" />}
      empty={{
        icon: "tag",
        title: "No active deals",
        message: "There are no deals matching these filters right now.",
      }}
      errorTitle="Couldn't load deals"
    />
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({ separator: { height: theme.spacing[6] } });
