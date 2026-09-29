import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import {
  ChipRow,
  DealResults,
  LocationFilterChip,
  Screen,
  ScreenHeader,
  SearchBar,
  SelectChip,
  type LocationFilter,
} from "@/components";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useCityStore } from "@/store/cityStore";
import { theme } from "@/theme";
import { DEAL_CATEGORIES } from "@/utils/catalog";

const SEARCH_DEBOUNCE_MS = 400;

/**
 * ~ web /deals (DealsPageClient): search, category, city. (The web also shows a
 * Community filter there, but /api/deals/get-all ignores it — not offered here.)
 */
export default function DealsScreen() {
  const preferredCity = useCityStore((s) => s.city);
  const [text, setText] = useState("");
  const [category, setCategory] = useState("all");
  const [location, setLocation] = useState<LocationFilter>(
    preferredCity ? { kind: "city", city: preferredCity } : { kind: "all" },
  );
  const search = useDebouncedValue(text.trim(), SEARCH_DEBOUNCE_MS);

  const filters = useMemo(
    () => ({
      search: search || undefined,
      category: category === "all" ? undefined : category,
      city: location.kind === "city" ? location.city : undefined,
    }),
    [search, category, location],
  );

  return (
    <Screen scroll={false} padded={false}>
      <ScreenHeader title="Deals" />
      <View style={styles.search}>
        <SearchBar value={text} onChangeText={setText} placeholder="Search deals" />
      </View>
      <ChipRow style={styles.filters}>
        <LocationFilterChip value={location} onChange={setLocation} allowNearMe={false} />
        <SelectChip
          title="Category"
          icon="grid"
          options={DEAL_CATEGORIES}
          value={category}
          defaultValue="all"
          onChange={setCategory}
        />
      </ChipRow>
      <View style={styles.flex}>
        <DealResults filters={filters} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  search: { paddingHorizontal: theme.spacing[6] },
  filters: { paddingVertical: theme.spacing[3] },
});
