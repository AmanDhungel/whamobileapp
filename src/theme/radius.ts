// Base --radius is 10px (app/globals.css:43-49). tailwindLg/tailwindXl are the 16px/24px
// radii most web screens actually use (rounded-2xl / rounded-3xl).
export const radius = {
  sm: 6,
  md: 8,
  lg: 10,
  xl: 14,
  "2xl": 18,
  "3xl": 22,
  "4xl": 26,
  tailwindLg: 16,
  tailwindXl: 24,
  full: 9999,
} as const;
