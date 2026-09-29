import { darkColors, lightColors, type ColorPalette } from "./colors";
import { radius } from "./radius";
import { shadows } from "./shadows";
import { sizes, spacing } from "./spacing";
import { typography } from "./typography";

export { darkColors, lightColors, type ColorPalette } from "./colors";
export { fontAssets, fontFamily } from "./fonts";
export { radius } from "./radius";
export { shadows } from "./shadows";
export { sizes, spacing } from "./spacing";
export { textVariants, typography, type TextVariant } from "./typography";

// Layering scheme — the web has no z-index convention to port (01-design-system.md).
export const zIndex = { content: 0, sticky: 10, toast: 50, modal: 100 } as const;

export const animation = {
  pressScale: 0.95,
  pressDuration: 100,
  fast: 200,
  normal: 300,
  /** Skeleton pulse half-cycle. */
  pulse: 700,
} as const;

// Pressed-state opacity; disabled matches the web's opacity-50.
export const opacity = { pressed: 0.7, disabled: 0.5 } as const;

function buildTheme(colors: ColorPalette) {
  return { colors, spacing, sizes, radius, shadows, typography, zIndex, animation, opacity };
}

export const theme = buildTheme(lightColors);
export const darkTheme = buildTheme(darkColors);
export type Theme = typeof theme;

/**
 * v1 ships light-only (dark-mode reachability is an open question — 99-open-questions.md #15).
 * To enable dark mode later: return useColorScheme() === "dark" ? darkTheme : theme.
 */
export function useTheme(): Theme {
  return theme;
}
