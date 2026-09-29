# Design System

Source of truth: `app/globals.css` (Tailwind v4 CSS-first config — there is no
`tailwind.config.js`). Tokens are CSS custom properties, remapped into Tailwind's
`@theme inline` block (`app/globals.css:7-50`) so classes like `bg-primary` resolve to
`var(--primary)`. A second imported stylesheet, `app/whaglobals.css`, was not read in
this pass — ⚠️ UNVERIFIED whether it adds more tokens; check before finalizing the
palette (see `99-open-questions.md`).

## Colors

### Brand palette (`app/globals.css:56-59`)
| Token | Hex | Usage |
|---|---|---|
| `--wha-navy` | `#051e3a` | Primary dark navy — headers, primary buttons, nav |
| `--wha-blue` | `#3771db` | Secondary accent blue |
| `--wha-blue-dark` | `#2a59b2` | Hover state for blue |
| `--wha-blue-light` | `#e8f0fd` | Light blue tint for backgrounds |

Note: many components sampled this session hardcode `#051e3a` directly via inline
`style={{ backgroundColor: "#051e3a" }}` rather than the `primary` Tailwind class (e.g.
`components/Stripe/EventCheckOut.tsx`) — both resolve to the same color, but be aware
the codebase is not 100%-consistent about going through the token.

### Semantic tokens — light (`:root`, `app/globals.css:62-133`)
| Token | Value | Notes |
|---|---|---|
| `background` | `#ffffff` | |
| `foreground` | `#1a1a1a` | |
| `card` / `card-foreground` | `#ffffff` / `#1a1a1a` | |
| `card-shadow` | `0 1px 4px rgba(5,30,58,.06), 0 4px 16px rgba(5,30,58,.08)` | |
| `card-shadow-hover` | `0 4px 12px rgba(5,30,58,.10), 0 12px 32px rgba(5,30,58,.12)` | |
| `popover` / `popover-foreground` | `#ffffff` / `#1a1a1a` | |
| `primary` / `primary-foreground` | `#051e3a` / `#ffffff` | |
| `secondary` / `secondary-foreground` | `#3771db` / `#ffffff` | |
| `muted` / `muted-foreground` | `#f4f6f9` / `#6b7280` | |
| `accent` / `accent-foreground` | `#e8f0fd` / `#051e3a` | |
| `success` / `success-foreground` / `success-muted` | `#16a34a` / `#ffffff` / `#dcfce7` | |
| `warning` / `warning-foreground` / `warning-muted` | `#d97706` / `#ffffff` / `#fef3c7` | |
| `destructive` / `destructive-foreground` / `destructive-muted` | `#dc2626` / `#ffffff` / `#fee2e2` | |
| `border` / `border-strong` / `divider` | `#e5e7eb` / `#d1d5db` / `#e5e7eb` | |
| `input` | `#e5e7eb` | |
| `ring` | `#3771db` | focus ring color |
| `sidebar` | `#f8fafc` | dashboard sidebar background |
| `sidebar-primary` | `#051e3a` | |
| `sidebar-accent` | `#e8f0fd` | |
| `chart-1..5` | `oklch(...)` — see `app/globals.css:123-127` | Only used if charts are added; not seen in a live screen this pass |

### Semantic tokens — dark (`.dark`, `app/globals.css:156-189`)
| Token | Value |
|---|---|
| `background` | `#0d1117` |
| `foreground` | `#f9fafb` |
| `card` | `#161b22` |
| `primary` | `#3771db` (note: swaps to the *blue*, not navy, in dark mode) |
| `secondary` | `#3771db` |
| `muted` | `#21262d` / `muted-foreground` `#8b949e` |
| `accent` | `#1c2d4a` |
| `destructive` | `#f85149` |
| `border` | `#30363d` |
| `sidebar` | `#161b22` |

⚠️ UNVERIFIED: whether dark mode is actually reachable in the live product (no theme
toggle was found in the components sampled this pass, though `next-themes` is a
dependency — `package.json:53`). Build the RN theme with both palettes available, but
confirm with the team whether dark mode should ship in v1.

## Typography

- **Headings, nav, buttons**: **Quicksand** (400/500/600/700), loaded via
  `next/font/google`, CSS var `--font-quicksand` (`app/layout.tsx:17-22`).
- **Body text, data, forms**: **Inter** (400/500/600), CSS var `--font-inter`
  (`app/layout.tsx:24-29`).
- The `body` element's default class list applies Quicksand as the base font
  (`app/layout.tsx:45`); Inter is available as a utility/variable for body copy but is
  not the default — ⚠️ UNVERIFIED exactly which elements opt into Inter vs inherit
  Quicksand; spot-check a few real screens before finalizing RN font usage.
- `app/globals.css:543-619` defines an extensive **`font-urbanist` / `text-urbanist-*`
  utility set** (display/heading/subheading/body/caption/button scale) referencing a
  `--font-urbanist` variable — but no `--font-urbanist` is ever defined (layout.tsx only
  defines `--font-quicksand` and `--font-inter`). ⚠️ UNVERIFIED / likely **dead CSS**
  from an earlier design pass. Do not build the RN type scale around "Urbanist" — use
  Quicksand/Inter, and flag this to the team (see `99-open-questions.md`).
- Heading weights (`app/globals.css:217-247`): h1 = `font-black` (900), tight
  tracking `-0.03em`; h2 = `font-extrabold` (800), `-0.025em`; h3 = `font-bold` (700),
  `-0.02em`; body `p` = `font-normal` (400), line-height `1.7`, tracking `-0.005em`.
  Base body line-height is `1.6`, tracking `-0.01em` (`app/globals.css:206-215`).
- No explicit `h4-h6` or a numeric font-size scale (e.g. `text-sm`/`text-lg`) is
  defined as custom tokens — the app uses Tailwind's default type scale directly
  (`text-xs` 12px … `text-6xl` 60px). Confirm exact sizes per screen in `03-screens.md`.

## Spacing scale (`app/globals.css:144-153`)
| Token | Value |
|---|---|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-10` | 40px |
| `--space-12` | 48px |
| `--space-16` | 64px |

These mirror Tailwind's default spacing scale (4px increments); most components
sampled this session actually use Tailwind spacing utilities directly (`p-4`, `gap-3`,
`px-6`) rather than these named tokens.

## Border radius (`app/globals.css:43-49`)
Base `--radius: 0.625rem` (10px), with derived scale:
| Token | Formula | Value |
|---|---|---|
| `radius-sm` | `radius - 4px` | 6px |
| `radius-md` | `radius - 2px` | 8px |
| `radius-lg` | `radius` | 10px |
| `radius-xl` | `radius + 4px` | 14px |
| `radius-2xl` | `radius + 8px` | 18px |
| `radius-3xl` | `radius + 12px` | 22px |
| `radius-4xl` | `radius + 16px` | 26px |

In practice, many screens built this session use raw Tailwind radii (`rounded-2xl`,
`rounded-3xl`, i.e. Tailwind's own 16px/24px scale, not the derived tokens above) —
e.g. the checkout modal (`components/Stripe/EventCheckOut.tsx`) uses `rounded-3xl` /
`rounded-2xl` throughout. Treat 16px and 24px as the two most common realized card/modal
radii regardless of which scale technically produced them.

## Shadows (`app/globals.css:105-110`)
| Token | Value |
|---|---|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,.05)` |
| `--shadow` | `0 1px 3px rgba(0,0,0,.1), 0 1px 2px -1px rgba(0,0,0,.1)` |
| `--shadow-md` | `0 4px 6px -1px rgba(0,0,0,.1), 0 2px 4px -2px rgba(0,0,0,.1)` |
| `--shadow-lg` | `0 10px 15px -3px rgba(0,0,0,.1), 0 4px 6px -4px rgba(0,0,0,.1)` |
| `--shadow-xl` | `0 20px 25px -5px rgba(0,0,0,.1), 0 8px 10px -6px rgba(0,0,0,.1)` |

Plus card-specific shadows (`--card-shadow`, `--card-shadow-hover`) — see Colors table.
"Hover" shadows have no direct RN equivalent (no hover on touch); use the resting
shadow only and drop the `-hover` variant, or repurpose it for a pressed state.

## Opacity / z-index
No named opacity or z-index token scale was found — components use raw Tailwind
utilities and literal values ad hoc (e.g. `z-100` seen in `EventCheckOut.tsx`'s modal
overlay, `bg-black/60` for scrims). ❓ OPEN QUESTION: no z-index convention to port; the
mobile app should define its own layering scheme (modal > toast > sticky header > content).

## Breakpoints
No custom breakpoints are defined in `app/globals.css` (no `--breakpoint-*` tokens), so
**Tailwind v4's defaults apply**: `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px,
`2xl` 1536px. The mobile-web experience (below `md`, i.e. under 768px) is the best
reference for the app's layout — most components sampled this session use a
`md:hidden` / `hidden md:block` pattern to swap between a mobile bottom-bar layout and
a desktop layout (e.g. `components/Event/SingleEventPage.tsx` has a fixed bottom
buy-bar wrapped in `md:hidden`).

## Icons
**lucide-react** (`package.json:36`) is the only icon library found in this codebase —
no react-icons, Heroicons, or custom SVG icon set. It has a very large surface; icons
seen in this session alone include (non-exhaustive): `Calendar`, `MapPin`, `Clock`,
`Star`, `Heart`, `Share`, `ChevronLeft/Right/Down/Up`, `Search`, `MoreVertical`,
`Ticket`, `User`, `CreditCard`, `Check`, `CheckCircle2`, `Info`, `Loader2`, `Plus`,
`Minus`, `ShieldCheck`, `Download`, `Printer`, `Send`, `Eye`, `Copy`, `Trash2`,
`Settings`, `Receipt`, `Users`, `QrCode`, `BarChart3`, `LayoutDashboard`,
`FileSpreadsheet`, `FileText`, `ExternalLink`, `Link2`, `CircleDashed`. **Expo
equivalent**: `lucide-react-native` implements the same icon set with an (almost)
identical API — use it directly rather than remapping to a different icon library.

## Images / logos / assets
- Primary logo: `public/wha/logo.png` (referenced directly, e.g.
  `components/Dashboard/Ticket/TicketDetailPage.tsx:389`). Also present: `logo.svg`,
  `logo2.png`, `logo-old.png`, `wha-logo.png` — ⚠️ UNVERIFIED which are still live vs.
  legacy; `logo.png` is the one actively referenced in code sampled this session.
- Favicons: `public/favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`,
  `apple-touch-icon.png`, `android-chrome-192x192.png`, `android-chrome-512x512.png` —
  use the 512px Android icon as the source for the Expo app icon / splash.
- Placeholders: `public/placeholder-logo.svg`, `public/placeholder.svg`.
- Banner art: `public/wha/wha-banner.png`, `wha-banner-mb.png` (mobile variant),
  `wha-auth.png` (used on the auth screen, `public/auth.png` also exists at root).
- Business/deal/event photos under `public/business/*`, `public/deals/*`,
  `public/events/*` are seed/demo content, not app chrome — real content in production
  comes from S3 uploads (see `08-integrations-and-third-party.md`).
- `next.config.ts:4-21` whitelists three remote image hosts: Google profile photos
  (`lh3.googleusercontent.com`), the S3 bucket
  (`wha-sunya-my-uploads.s3.ap-southeast-2.amazonaws.com`), and `images.pexels.com`
  (stock/demo imagery). The Expo app's `expo-image` (or React Native `Image`) does not
  need an allowlist, but note these are the three real hosts you'll be loading from.

## Animations / transitions
Defined in `app/globals.css:469-528`:
| Name | Effect | Duration |
|---|---|---|
| `fadeIn` / `.animate-fade-in` | opacity 0→1 | 0.5s ease-out |
| `slideUp` / `.animate-slide-up` | translateY(20px)+opacity 0 → translateY(0)+opacity 1 | 0.5s ease-out |
| `scaleIn` / `.animate-scale-in` | scale(0.95)+opacity 0 → scale(1)+opacity 1 | 0.3s ease-out |
| `.hover-lift` | translateY(-4px) + shadow-lg on hover | 0.2s |

Global: `* { transition-colors duration-200 }` (`app/globals.css:255-257`) — every
color-bearing property transitions over 200ms by default. `framer-motion` is also a
dependency (`package.json:32`) and is used for richer animation in some components not
enumerated in this pass — grep `from "framer-motion"` before assuming a screen's motion
is CSS-only. RN equivalents: `react-native-reanimated` (fade/slide/scale) or Expo's
`LayoutAnimation`; `Animated` API is sufficient for the simple fade/slide/scale set above.

## Ready-to-use `theme.ts` for React Native

```ts
// theme.ts — derived from app/globals.css. Values are numbers (px), not strings,
// per RN convention. Dark palette included; confirm with the team before using it
// (see the dark-mode open question above).

export const lightColors = {
  whaNavy: "#051e3a",
  whaBlue: "#3771db",
  whaBlueDark: "#2a59b2",
  whaBlueLight: "#e8f0fd",

  background: "#ffffff",
  foreground: "#1a1a1a",
  card: "#ffffff",
  cardForeground: "#1a1a1a",
  popover: "#ffffff",
  popoverForeground: "#1a1a1a",

  primary: "#051e3a",
  primaryForeground: "#ffffff",
  secondary: "#3771db",
  secondaryForeground: "#ffffff",
  muted: "#f4f6f9",
  mutedForeground: "#6b7280",
  accent: "#e8f0fd",
  accentForeground: "#051e3a",

  success: "#16a34a",
  successForeground: "#ffffff",
  successMuted: "#dcfce7",
  warning: "#d97706",
  warningForeground: "#ffffff",
  warningMuted: "#fef3c7",
  destructive: "#dc2626",
  destructiveForeground: "#ffffff",
  destructiveMuted: "#fee2e2",

  border: "#e5e7eb",
  borderStrong: "#d1d5db",
  divider: "#e5e7eb",
  input: "#e5e7eb",
  ring: "#3771db",
};

export const darkColors = {
  ...lightColors,
  background: "#0d1117",
  foreground: "#f9fafb",
  card: "#161b22",
  cardForeground: "#f9fafb",
  popover: "#161b22",
  popoverForeground: "#f9fafb",
  primary: "#3771db",
  secondary: "#3771db",
  muted: "#21262d",
  mutedForeground: "#8b949e",
  accent: "#1c2d4a",
  accentForeground: "#e8f0fd",
  destructive: "#f85149",
  border: "#30363d",
  borderStrong: "#444c56",
  divider: "#30363d",
  input: "#30363d",
};

export const typography = {
  // font family keys map to whatever you load via expo-font / @expo-google-fonts
  fontFamily: {
    heading: "Quicksand_700Bold",      // Quicksand 400/500/600/700 loaded as needed
    headingBlack: "Quicksand_700Bold", // Quicksand has no 900 weight loaded on web either — h1 fakes "black" via CSS font-weight:900 on a 700 font file; on RN, either add a heavier Quicksand static weight or accept 700 as the ceiling.
    body: "Inter_400Regular",
    bodyMedium: "Inter_500Medium",
    bodySemibold: "Inter_600SemiBold",
  },
  weight: { normal: "400", medium: "500", semibold: "600", bold: "700", extrabold: "800", black: "900" },
  size: { xs: 12, sm: 14, base: 16, lg: 18, xl: 20, "2xl": 24, "3xl": 30, "4xl": 36, "5xl": 48, "6xl": 60 },
  lineHeight: { tight: 1.2, snug: 1.375, normal: 1.6, relaxed: 1.7 },
  letterSpacing: { tight: -0.03, snugTight: -0.02, base: -0.01, body: -0.005 },
};

export const spacing = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64 };

export const radius = { sm: 6, md: 8, lg: 10, xl: 14, "2xl": 18, "3xl": 22, "4xl": 26, tailwindLg: 16, tailwindXl: 24 };

// RN has no box-shadow — use elevation (Android) + shadow* props (iOS).
export const shadows = {
  sm: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  base: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  md: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4 },
  lg: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 15, elevation: 8 },
  xl: { shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 25, elevation: 12 },
  card: { shadowColor: "#051e3a", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
};

export const theme = {
  colors: lightColors,
  darkColors,
  typography,
  spacing,
  radius,
  shadows,
};

export default theme;
```
