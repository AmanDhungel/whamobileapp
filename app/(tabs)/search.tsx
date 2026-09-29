import { useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  BUSINESS_SORT_OPTIONS,
  BusinessResults,
  ChipRow,
  DealResults,
  EventResults,
  LocationFilterChip,
  SearchBar,
  SegmentedControl,
  SelectChip,
  Text,
  locationParams,
  type BusinessSort,
  type LocationFilter,
} from "@/components";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useCityStore } from "@/store/cityStore";
import { theme, useTheme } from "@/theme";
import {
  AU_CITIES,
  BUSINESS_CATEGORIES,
  DEAL_CATEGORIES,
  EVENT_CATEGORIES,
  FILTER_COMMUNITIES,
  type AuCity,
} from "@/utils/catalog";

type Tab = "services" | "events" | "deals";

const TABS = [
  { label: "Services", value: "services" as const },
  { label: "Events", value: "events" as const },
  { label: "Deals", value: "deals" as const },
];

const PLACEHOLDER: Record<Tab, string> = {
  services: "Search businesses & services",
  events: "Search events",
  deals: "Search deals",
};

const BUSINESS_CATEGORY_OPTIONS = [
  { label: "All categories", value: "all" },
  ...BUSINESS_CATEGORIES.map((c) => ({ label: c.label, value: c.value, icon: c.icon })),
];

const SEARCH_DEBOUNCE_MS = 400;

function isCity(value?: string): value is AuCity {
  return !!value && (AU_CITIES as readonly string[]).includes(value);
}

/**
 * ~ web /search (the business directory) plus the web's Events toggle, and Deals
 * (web /deals) as a third segment. Deep-link params: tab, q, category, city.
 */
export default function SearchScreen() {
  const t = useTheme();
  const params = useLocalSearchParams<{
    tab?: string;
    q?: string;
    category?: string;
    city?: string;
  }>();
  const preferredCity = useCityStore((s) => s.city);

  const [tab, setTab] = useState<Tab>("services");
  const [text, setText] = useState("");
  const [location, setLocation] = useState<LocationFilter>(
    preferredCity ? { kind: "city", city: preferredCity } : { kind: "all" },
  );
  const [businessCategory, setBusinessCategory] = useState("all");
  const [eventCategory, setEventCategory] = useState("all");
  const [dealCategory, setDealCategory] = useState("all");
  const [community, setCommunity] = useState("");
  const [sort, setSort] = useState<BusinessSort>("best");

  // Apply params whenever another screen navigates here (Home search, city/service
  // chips). Done during render when the params change — React's recommended way to
  // reset state from new props, instead of a setState-in-effect cascade.
  const paramsKey = [params.tab, params.q, params.category, params.city].join("|");
  const [appliedParamsKey, setAppliedParamsKey] = useState<string | null>(null);
  if (appliedParamsKey !== paramsKey) {
    setAppliedParamsKey(paramsKey);
    if (params.tab === "services" || params.tab === "events" || params.tab === "deals") {
      setTab(params.tab);
    }
    if (params.q !== undefined) setText(params.q);
    if (params.category !== undefined) setBusinessCategory(params.category || "all");
    if (isCity(params.city)) setLocation({ kind: "city", city: params.city });
    else if (params.city === "") setLocation({ kind: "all" });
  }

  const search = useDebouncedValue(text.trim(), SEARCH_DEBOUNCE_MS);

  const businessFilters = useMemo(
    () => ({
      service: search || undefined,
      category: businessCategory === "all" ? undefined : businessCategory,
      ...locationParams(location),
    }),
    [search, businessCategory, location],
  );
  const eventFilters = useMemo(
    () => ({
      search: search || undefined,
      category: eventCategory === "all" ? undefined : eventCategory,
      community: community || undefined,
      ...locationParams(location),
    }),
    [search, eventCategory, community, location],
  );
  const dealFilters = useMemo(
    () => ({
      search: search || undefined,
      category: dealCategory === "all" ? undefined : dealCategory,
      city: location.kind === "city" ? location.city : undefined,
    }),
    [search, dealCategory, location],
  );

  return (
    <SafeAreaView edges={["top"]} style={[styles.flex, { backgroundColor: t.colors.background }]}>
      <View style={styles.header}>
        <Text variant="h2" accessibilityRole="header">
          Search
        </Text>
        <SegmentedControl options={TABS} value={tab} onChange={setTab} />
        <SearchBar value={text} onChangeText={setText} placeholder={PLACEHOLDER[tab]} />
      </View>

      <ChipRow style={styles.filters}>
        <LocationFilterChip value={location} onChange={setLocation} allowNearMe={tab !== "deals"} />
        {tab === "services" && (
          <>
            <SelectChip
              title="Category"
              icon="grid"
              options={BUSINESS_CATEGORY_OPTIONS}
              value={businessCategory}
              defaultValue="all"
              onChange={setBusinessCategory}
            />
            <SelectChip
              title="Sort"
              icon="bar-chart-2"
              options={BUSINESS_SORT_OPTIONS}
              value={sort}
              defaultValue="best"
              onChange={setSort}
            />
          </>
        )}
        {tab === "events" && (
          <>
            <SelectChip
              title="Category"
              icon="grid"
              options={EVENT_CATEGORIES}
              value={eventCategory}
              defaultValue="all"
              onChange={setEventCategory}
            />
            <SelectChip
              title="Community"
              icon="users"
              options={FILTER_COMMUNITIES}
              value={community}
              defaultValue=""
              onChange={setCommunity}
            />
          </>
        )}
        {tab === "deals" && (
          <SelectChip
            title="Category"
            icon="grid"
            options={DEAL_CATEGORIES}
            value={dealCategory}
            defaultValue="all"
            onChange={setDealCategory}
          />
        )}
      </ChipRow>

      <View style={styles.flex}>
        {tab === "services" && <BusinessResults filters={businessFilters} sort={sort} />}
        {tab === "events" && <EventResults filters={eventFilters} />}
        {tab === "deals" && <DealResults filters={dealFilters} />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    gap: theme.spacing[3],
    paddingHorizontal: theme.spacing[6],
    paddingTop: theme.spacing[4],
  },
  filters: { paddingVertical: theme.spacing[3] },
});
