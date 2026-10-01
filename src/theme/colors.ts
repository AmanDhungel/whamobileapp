// Derived from app/globals.css on the website — see docs/mobile/01-design-system.md.
// The dark palette is defined but not active in v1 (light-only, see useTheme()).

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

  // Scrim behind modals/overlays (web uses bg-black/60).
  overlay: "rgba(0, 0, 0, 0.6)",
  transparent: "transparent",

  // Rating stars (web business card: #f5b301).
  rating: "#f5b301",
  // Text/buttons drawn over photos.
  onImage: "#ffffff",
  imageScrim: "rgba(5, 30, 58, 0.45)",
  imageButton: "rgba(255, 255, 255, 0.92)",

  // "Sign in with Google" button — Google's branding guidelines, light theme.
  googleButton: "#ffffff",
  googleButtonBorder: "#747775",
  googleButtonText: "#1f1f1f",
  // QR codes must stay black-on-white regardless of theme (scanner contrast).
  qrForeground: "#000000",
  qrBackground: "#ffffff",
};

export type ColorPalette = typeof lightColors;

export const darkColors: ColorPalette = {
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
  // Google's dark-theme button.
  googleButton: "#131314",
  googleButtonBorder: "#8e918f",
  googleButtonText: "#e3e3e3",
};
