import type { TextStyle } from "react-native";

import { fontFamily } from "./fonts";

// Tailwind's default type scale (the web uses it directly — 01-design-system.md).
export const fontSize = {
  "2xs": 10,
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
  "4xl": 36,
  "5xl": 48,
  "6xl": 60,
} as const;

export const lineHeight = { tight: 1.2, snug: 1.375, normal: 1.6, relaxed: 1.7 } as const;

// em values from app/globals.css; converted to px per variant below (RN wants px).
export const letterSpacing = { tight: -0.03, snugTight: -0.02, base: -0.01, body: -0.005 } as const;

function variant(
  family: string,
  size: number,
  lh: number,
  tracking: number = letterSpacing.base,
): TextStyle {
  return {
    fontFamily: family,
    fontSize: size,
    lineHeight: Math.round(size * lh),
    letterSpacing: +(size * tracking).toFixed(2),
  };
}

// Named text styles. Sizes follow the website's auth screens (28px headings, 14px
// subtitles/labels, 16px inputs, 13px errors) and the h1-h3 rules in globals.css.
export const textVariants = {
  display: variant(fontFamily.heading, fontSize["3xl"], lineHeight.tight, letterSpacing.tight),
  h1: variant(fontFamily.heading, 28, lineHeight.tight, letterSpacing.tight),
  h2: variant(fontFamily.heading, fontSize["2xl"], lineHeight.tight, letterSpacing.snugTight),
  h3: variant(fontFamily.heading, fontSize.xl, lineHeight.snug, letterSpacing.snugTight),
  title: variant(fontFamily.heading, fontSize.base, lineHeight.snug, letterSpacing.base),
  body: variant(fontFamily.body, fontSize.base, lineHeight.normal, letterSpacing.body),
  bodySm: variant(fontFamily.body, fontSize.sm, lineHeight.normal, letterSpacing.body),
  bodyMedium: variant(fontFamily.bodyMedium, fontSize.sm, lineHeight.normal, letterSpacing.body),
  label: variant(fontFamily.bodySemibold, fontSize.sm, lineHeight.snug, letterSpacing.body),
  caption: variant(fontFamily.body, 13, lineHeight.normal, letterSpacing.body),
  captionMedium: variant(fontFamily.bodyMedium, 13, lineHeight.normal, letterSpacing.body),
  button: variant(fontFamily.heading, fontSize.base, lineHeight.tight, 0),
  buttonSm: variant(fontFamily.heading, fontSize.sm, lineHeight.tight, 0),
  tabLabel: variant(fontFamily.heading, fontSize["2xs"], lineHeight.tight, letterSpacing.base),
  input: variant(fontFamily.body, fontSize.base, lineHeight.snug, 0),
  /** Google branding: Roboto Medium 14 / 20. */
  googleButton: variant(fontFamily.googleButton, fontSize.sm, 20 / 14, 0),
  code: variant(fontFamily.heading, fontSize["2xl"], lineHeight.tight, 0),
} satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof textVariants;

export const typography = {
  fontFamily,
  fontSize,
  lineHeight,
  letterSpacing,
  variants: textVariants,
};
