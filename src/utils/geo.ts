/**
 * Mainland Australia + Tasmania + coastal islands as a bounding box. Coarse on
 * purpose (it also covers some ocean and the Torres Strait edge of PNG) — it catches
 * a pin dragged off the continent; the address itself comes from the AU-only search.
 */
export const AUSTRALIA_BOUNDS = {
  minLatitude: -44.5,
  maxLatitude: -9.0,
  minLongitude: 112.0,
  maxLongitude: 154.5,
} as const;

export const OUTSIDE_AUSTRALIA_MESSAGE = "Please choose a location in Australia";

export function isInAustralia(latitude: number, longitude: number): boolean {
  const b = AUSTRALIA_BOUNDS;
  return (
    latitude >= b.minLatitude &&
    latitude <= b.maxLatitude &&
    longitude >= b.minLongitude &&
    longitude <= b.maxLongitude
  );
}

/**
 * Within ~5 m — the same point for map purposes (map centre vs. stored coordinates;
 * map SDKs can settle a hair off the exact target after an animation).
 */
export function isSameSpot(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): boolean {
  const EPSILON = 0.00005;
  return (
    Math.abs(a.latitude - b.latitude) < EPSILON && Math.abs(a.longitude - b.longitude) < EPSILON
  );
}
