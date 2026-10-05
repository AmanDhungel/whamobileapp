import { Feather } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, View, useWindowDimensions } from "react-native";
import MapView, { PROVIDER_GOOGLE, type Region } from "react-native-maps";

import { useCurrentLocation } from "@/hooks/useCurrentLocation";
import { reverseGeocode } from "@/services/geocoding";
import { theme, useTheme } from "@/theme";
import { OUTSIDE_AUSTRALIA_MESSAGE, isInAustralia, isSameSpot } from "@/utils/geo";

import { AddressAutocomplete } from "./AddressAutocomplete";
import { Button } from "./Button";
import { Text } from "./Text";

export interface LocationValue {
  address: string;
  latitude?: number;
  longitude?: number;
}

export interface LocationPickerProps {
  label: string;
  value: LocationValue;
  /** Only the changed fields. Coordinates outside Australia are passed through — the
   * form schema rejects them, and the picker shows the message straight away. */
  onChange: (patch: Partial<LocationValue>) => void;
  addressError?: string;
  coordinatesError?: string;
}

type Coordinates = { latitude: number; longitude: number };

type PinAddress =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "found"; label: string }
  | { status: "none" }
  | { status: "error" };

/** Street-level zoom. */
const STREET_DELTA = { latitudeDelta: 0.005, longitudeDelta: 0.005 };
/** Quiet time after the map stops before the pin is committed and looked up. */
const SETTLE_MS = 400;

const LOCATION_MESSAGES = {
  denied: "Location permission is off. Search for your address instead, or enable it in Settings.",
  failed: "Couldn't get your location. Please search for your address instead.",
};

/**
 * Address search + map with a fixed centre pin (web: draggable Leaflet marker). The
 * owner moves the map under the pin; when it settles, the coordinates update and the
 * spot is reverse-geocoded once — the typed address is only replaced if they tap
 * "Use this address". Apple Maps on iOS, Google Maps on Android.
 */
export function LocationPicker({
  label,
  value,
  onChange,
  addressError,
  coordinatesError,
}: LocationPickerProps) {
  const t = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const mapRef = useRef<MapView>(null);
  /** Where the map is (or is animating to) — tells programmatic moves from the owner's. */
  const centreRef = useRef<Coordinates | null>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lookupAbort = useRef<AbortController | null>(null);
  const [pin, setPin] = useState<PinAddress>({ status: "idle" });
  const { locate, loading: locating, error: locateError } = useCurrentLocation(LOCATION_MESSAGES);

  const { latitude, longitude } = value;
  const coords: Coordinates | null =
    typeof latitude === "number" && typeof longitude === "number" ? { latitude, longitude } : null;
  const outside = !!coords && !isInAustralia(coords.latitude, coords.longitude);
  const pinError = outside
    ? OUTSIDE_AUSTRALIA_MESSAGE
    : coords || value.address
      ? coordinatesError
      : undefined;

  useEffect(
    () => () => {
      if (settleTimer.current) clearTimeout(settleTimer.current);
      lookupAbort.current?.abort();
    },
    [],
  );

  // Coordinates set from outside the map (address picked, current location) → fly there.
  useEffect(() => {
    if (latitude === undefined || longitude === undefined) return;
    const target = { latitude, longitude };
    if (centreRef.current && isSameSpot(centreRef.current, target)) return;
    centreRef.current = target;
    mapRef.current?.animateToRegion({ ...target, ...STREET_DELTA }, t.animation.normal);
  }, [latitude, longitude, t.animation.normal]);

  const lookUpPin = async (centre: Coordinates) => {
    lookupAbort.current?.abort();
    if (!isInAustralia(centre.latitude, centre.longitude)) {
      setPin({ status: "idle" });
      return;
    }
    const controller = new AbortController();
    lookupAbort.current = controller;
    setPin({ status: "loading" });
    try {
      const found = await reverseGeocode(centre.latitude, centre.longitude, controller.signal);
      if (!controller.signal.aborted) {
        setPin(found ? { status: "found", label: found } : { status: "none" });
      }
    } catch {
      if (!controller.signal.aborted) setPin({ status: "error" });
    }
  };

  const onRegionChangeComplete = (region: Region) => {
    const centre = { latitude: region.latitude, longitude: region.longitude };
    centreRef.current = centre;
    if (settleTimer.current) clearTimeout(settleTimer.current);
    // Arrived where we flew to (or didn't really move) — nothing new to commit.
    if (coords && isSameSpot(centre, coords)) return;
    settleTimer.current = setTimeout(() => {
      onChange(centre);
      void lookUpPin(centre);
    }, SETTLE_MS);
  };

  const goToMyLocation = async () => {
    const position = await locate();
    if (!position) return;
    const centre = { latitude: position.lat, longitude: position.lng };
    onChange(centre);
    void lookUpPin(centre);
  };

  return (
    <View style={styles.container}>
      <AddressAutocomplete
        label={label}
        value={value.address}
        error={addressError}
        onSelect={(s) => {
          lookupAbort.current?.abort();
          setPin({ status: "idle" });
          // Typing a new search keeps the pin where it is until an address is picked.
          onChange(
            s
              ? { address: s.label, latitude: s.latitude, longitude: s.longitude }
              : { address: "" },
          );
        }}
      />
      <Button
        title="Use my current location"
        icon="crosshair"
        variant="outline"
        size="sm"
        loading={locating}
        onPress={() => void goToMyLocation()}
      />
      {!!locateError && (
        <Text variant="caption" color="destructive">
          {locateError}
        </Text>
      )}

      {coords && (
        <>
          <Text variant="caption" color="mutedForeground">
            Move the map to place the pin on your exact location
          </Text>
          <View
            style={[
              styles.map,
              {
                height: windowHeight * t.sizes.mapPickerHeightRatio,
                backgroundColor: t.colors.muted,
                borderColor: outside ? t.colors.destructive : t.colors.border,
              },
            ]}
          >
            <MapView
              ref={mapRef}
              style={StyleSheet.absoluteFill}
              provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
              initialRegion={{ ...coords, ...STREET_DELTA }}
              onRegionChangeComplete={onRegionChangeComplete}
              rotateEnabled={false}
              pitchEnabled={false}
              toolbarEnabled={false}
              accessibilityLabel="Map. Move it to place the pin on your exact location."
            />
            {/* Fixed centre pin: its tip marks the map centre. */}
            <View style={styles.pinLayer}>
              <Feather
                name="map-pin"
                size={t.sizes.mapPin}
                color={t.colors.destructive}
                style={styles.pinIcon}
              />
            </View>
          </View>
          <PinAddressRow
            pin={pin}
            address={value.address}
            onUse={(address) => onChange({ address })}
          />
        </>
      )}

      {!!pinError && (
        <Text variant="caption" color="destructive">
          {pinError}
        </Text>
      )}
    </View>
  );
}

function PinAddressRow({
  pin,
  address,
  onUse,
}: {
  pin: PinAddress;
  address: string;
  onUse: (address: string) => void;
}) {
  if (pin.status === "idle") return null;
  const text =
    pin.status === "loading"
      ? "Finding address…"
      : pin.status === "found"
        ? pin.label
        : pin.status === "none"
          ? "No street address found here"
          : "Couldn't look up this spot";
  return (
    <View style={styles.pinRow}>
      <Text variant="bodySm" color="mutedForeground">
        Pin location: {text}
      </Text>
      {pin.status === "found" && pin.label !== address && (
        <Button
          title="Use this address"
          icon="check"
          variant="ghost"
          size="sm"
          fullWidth={false}
          onPress={() => onUse(pin.label)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: theme.spacing[3] },
  map: {
    overflow: "hidden",
    borderRadius: theme.radius.tailwindLg,
    borderWidth: theme.sizes.hairline,
  },
  pinLayer: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
  },
  // Lift the icon by half its height so the pin's tip, not its middle, is the centre.
  pinIcon: { transform: [{ translateY: -theme.sizes.mapPin / 2 }] },
  pinRow: { gap: theme.spacing[1], alignItems: "flex-start" },
});
