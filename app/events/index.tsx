import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import {
  ChipRow,
  EventResults,
  LocationFilterChip,
  Screen,
  ScreenHeader,
  SearchBar,
  SelectChip,
  locationParams,
  type LocationFilter,
} from "@/components";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useCityStore } from "@/store/cityStore";
import { theme } from "@/theme";
import { EVENT_CATEGORIES, FILTER_COMMUNITIES } from "@/utils/catalog";

const SEARCH_DEBOUNCE_MS = 400;

/** ~ web /events (EventPage): search, category, community, location. */
export default function EventsScreen() {
  const preferredCity = useCityStore((s) => s.city);
  const [text, setText] = useState("");
  const [category, setCategory] = useState("all");
  const [community, setCommunity] = useState("");
  const [location, setLocation] = useState<LocationFilter>(
    preferredCity ? { kind: "city", city: preferredCity } : { kind: "all" },
  );
  const search = useDebouncedValue(text.trim(), SEARCH_DEBOUNCE_MS);

  const filters = useMemo(
    () => ({
      search: search || undefined,
      category: category === "all" ? undefined : category,
      community: community || undefined,
      ...locationParams(location),
    }),
    [search, category, community, location],
  );

  return (
    <Screen scroll={false} padded={false}>
      <ScreenHeader title="Events" />
      <View style={styles.search}>
        <SearchBar value={text} onChangeText={setText} placeholder="Search events" />
      </View>
      <ChipRow style={styles.filters}>
        <LocationFilterChip value={location} onChange={setLocation} />
        <SelectChip
          title="Category"
          icon="grid"
          options={EVENT_CATEGORIES}
          value={category}
          defaultValue="all"
          onChange={setCategory}
        />
        <SelectChip
          title="Community"
          icon="users"
          options={FILTER_COMMUNITIES}
          value={community}
          defaultValue=""
          onChange={setCommunity}
        />
      </ChipRow>
      <View style={styles.flex}>
        <EventResults filters={filters} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  search: { paddingHorizontal: theme.spacing[6] },
  filters: { paddingVertical: theme.spacing[3] },
});
