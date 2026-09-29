import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import {
  MAP_ATTRIBUTION,
  getStaticMapTiles,
  hasCoordinates,
  openInMaps,
  type MapLocation,
} from "@/services/maps";
import { theme, useTheme } from "@/theme";

import { Button } from "./Button";
import { RemoteImage } from "./RemoteImage";
import { Text } from "./Text";

export interface StaticMapProps extends MapLocation {
  height?: number;
}

/**
 * Non-interactive location preview + "Open in Maps" (no native map SDK — Expo Go).
 * Tiles come from src/services/maps (swappable provider). Without coordinates it
 * falls back to the address with the same button.
 */
export function StaticMap({ height, ...location }: StaticMapProps) {
  const t = useTheme();
  const [width, setWidth] = useState(0);
  const mapHeight = height ?? t.sizes.staticMapHeight;
  const tiles = hasCoordinates(location)
    ? getStaticMapTiles(location.latitude, location.longitude, width, mapHeight)
    : [];

  return (
    <View style={styles.container}>
      {hasCoordinates(location) && (
        <View
          onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))}
          style={[
            styles.map,
            { height: mapHeight, backgroundColor: t.colors.muted, borderColor: t.colors.border },
          ]}
          accessible
          accessibilityRole="image"
          accessibilityLabel={`Map of ${location.label || location.address || "the location"}`}
        >
          {tiles.map((tile) => (
            <RemoteImage
              key={tile.key}
              uri={tile.uri}
              headers={tile.headers}
              style={{
                position: "absolute",
                left: tile.left,
                top: tile.top,
                width: tile.size,
                height: tile.size,
              }}
            />
          ))}
          {/* Pin tip sits on the exact point (viewport centre). */}
          <View
            pointerEvents="none"
            style={[
              styles.pin,
              {
                left: width / 2 - t.sizes.mapPin / 2,
                top: mapHeight / 2 - t.sizes.mapPin,
              },
            ]}
          >
            <Feather name="map-pin" size={t.sizes.mapPin} color={t.colors.destructive} />
          </View>
          <View style={[styles.attribution, { backgroundColor: t.colors.imageButton }]}>
            <Text variant="caption" color="mutedForeground">
              {MAP_ATTRIBUTION}
            </Text>
          </View>
        </View>
      )}
      {!!location.address && (
        <Text variant="bodySm" color="mutedForeground">
          {location.address}
        </Text>
      )}
      <Button
        title="Open in Maps"
        icon="navigation"
        variant="outline"
        size="sm"
        onPress={() => void openInMaps(location)}
      />
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
  pin: { position: "absolute" },
  attribution: {
    position: "absolute",
    right: 0,
    bottom: 0,
    paddingHorizontal: theme.spacing[1.5],
    borderTopLeftRadius: theme.radius.sm,
  },
});
