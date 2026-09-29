import { Linking, Platform } from "react-native";

import { providerHeaders } from "./http";

/**
 * Map provider boundary: static map tiles + "Open in Maps". Screens/components never
 * build a provider URL themselves, so the tile provider can be swapped (e.g. for a
 * native map in a dev build, or a paid static-maps API).
 *
 * Current tiles: OpenStreetMap standard tiles — the same tiles the website's Leaflet
 * maps use. OSM's tile policy expects low volume + a descriptive User-Agent.
 */

const TILE_SIZE = 256;
const DEFAULT_ZOOM = 15;
const TILE_URL = (z: number, x: number, y: number) =>
  `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;

export const MAP_ATTRIBUTION = "© OpenStreetMap contributors";

export interface MapTile {
  key: string;
  uri: string;
  headers: Record<string, string>;
  /** Position inside the map viewport, in points. */
  left: number;
  top: number;
  size: number;
}

/** Web-Mercator projection → global pixel coordinates at `zoom`. */
function project(latitude: number, longitude: number, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom;
  const latRad = (latitude * Math.PI) / 180;
  const x = ((longitude + 180) / 360) * scale;
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * scale;
  return { x, y };
}

/**
 * Tiles needed to fill a `width`×`height` viewport centred on the point. The marker
 * belongs at the viewport centre.
 */
export function getStaticMapTiles(
  latitude: number,
  longitude: number,
  width: number,
  height: number,
  zoom: number = DEFAULT_ZOOM,
): MapTile[] {
  if (!width || !height) return [];
  const { x, y } = project(latitude, longitude, zoom);
  const originX = x - width / 2;
  const originY = y - height / 2;
  const maxIndex = 2 ** zoom - 1;

  const tiles: MapTile[] = [];
  for (let tx = Math.floor(originX / TILE_SIZE); tx * TILE_SIZE < originX + width; tx++) {
    for (let ty = Math.floor(originY / TILE_SIZE); ty * TILE_SIZE < originY + height; ty++) {
      if (ty < 0 || ty > maxIndex) continue;
      const wrappedX = ((tx % (maxIndex + 1)) + maxIndex + 1) % (maxIndex + 1);
      tiles.push({
        key: `${zoom}/${tx}/${ty}`,
        uri: TILE_URL(zoom, wrappedX, ty),
        headers: providerHeaders,
        left: tx * TILE_SIZE - originX,
        top: ty * TILE_SIZE - originY,
        size: TILE_SIZE,
      });
    }
  }
  return tiles;
}

export interface MapLocation {
  latitude?: number | null;
  longitude?: number | null;
  /** Place name shown as the pin label. */
  label?: string;
  /** Free-text address — used when there are no coordinates. */
  address?: string;
}

export function hasCoordinates(
  loc: MapLocation,
): loc is MapLocation & { latitude: number; longitude: number } {
  return (
    typeof loc.latitude === "number" &&
    typeof loc.longitude === "number" &&
    Number.isFinite(loc.latitude) &&
    Number.isFinite(loc.longitude)
  );
}

/** Web directions URL — works everywhere; also the fallback for native apps. */
export function mapsWebUrl(loc: MapLocation): string | null {
  if (hasCoordinates(loc)) {
    return `https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`;
  }
  const q = loc.address || loc.label;
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null;
}

/** Opens the platform maps app (Apple Maps / Google Maps), falling back to the web. */
export async function openInMaps(loc: MapLocation): Promise<void> {
  const label = encodeURIComponent(loc.label || loc.address || "Location");
  let nativeUrl: string | null = null;

  if (hasCoordinates(loc)) {
    const ll = `${loc.latitude},${loc.longitude}`;
    nativeUrl =
      Platform.OS === "ios" ? `maps://?q=${label}&ll=${ll}` : `geo:${ll}?q=${ll}(${label})`;
  } else if (loc.address) {
    const q = encodeURIComponent(loc.address);
    nativeUrl = Platform.OS === "ios" ? `maps://?q=${q}` : `geo:0,0?q=${q}`;
  }

  if (nativeUrl) {
    try {
      await Linking.openURL(nativeUrl);
      return;
    } catch {
      // No maps app handled it — fall through to the web URL.
    }
  }
  const web = mapsWebUrl(loc);
  if (web) await Linking.openURL(web);
}
