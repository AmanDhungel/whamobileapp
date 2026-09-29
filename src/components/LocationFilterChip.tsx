import { useState } from "react";

import { useCurrentLocation, type Coords } from "@/hooks/useCurrentLocation";
import { AU_CITIES, type AuCity } from "@/utils/catalog";

import { Chip } from "./Chip";
import { SelectSheet, type SelectOption } from "./SelectSheet";
import { showToast } from "./Toast";

export type LocationFilter =
  { kind: "all" } | { kind: "city"; city: AuCity } | { kind: "near"; coords: Coords };

/** API query params for a location filter (city → server geo-resolves; near → lat/lng). */
export function locationParams(filter: LocationFilter): {
  city?: string;
  lat?: number;
  lng?: number;
} {
  if (filter.kind === "city") return { city: filter.city };
  if (filter.kind === "near") return { lat: filter.coords.lat, lng: filter.coords.lng };
  return {};
}

export function locationLabel(filter: LocationFilter): string {
  if (filter.kind === "city") return filter.city;
  if (filter.kind === "near") return "Near me";
  return "All of Australia";
}

type Choice = "all" | "near" | AuCity;

const OPTIONS: SelectOption<Choice>[] = [
  { label: "All of Australia", value: "all", icon: "globe" },
  { label: "Near me", value: "near", icon: "crosshair", description: "Use your current location" },
  ...AU_CITIES.map((c) => ({ label: c, value: c, icon: "map-pin" as const })),
];

/** "Where" filter: all of Australia / near me / one of the 8 cities the backend knows. */
export function LocationFilterChip({
  value,
  onChange,
  allowNearMe = true,
}: {
  value: LocationFilter;
  onChange: (filter: LocationFilter) => void;
  /** Deals are only filterable by city server-side. */
  allowNearMe?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { locate, loading } = useCurrentLocation();

  const current: Choice = value.kind === "city" ? value.city : value.kind;

  const select = async (choice: Choice) => {
    if (choice === "all") onChange({ kind: "all" });
    else if (choice === "near") {
      const coords = await locate();
      if (coords) onChange({ kind: "near", coords });
      else
        showToast({
          type: "error",
          message: "Couldn't get your location. Please choose a city instead.",
        });
    } else onChange({ kind: "city", city: choice });
  };

  return (
    <>
      <Chip
        label={loading ? "Locating…" : locationLabel(value)}
        icon="map-pin"
        dropdown
        selected={value.kind !== "all"}
        onPress={() => setOpen(true)}
      />
      <SelectSheet
        visible={open}
        onClose={() => setOpen(false)}
        title="Where"
        options={allowNearMe ? OPTIONS : OPTIONS.filter((o) => o.value !== "near")}
        value={current}
        onSelect={(c) => void select(c)}
      />
    </>
  );
}
