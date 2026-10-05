import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from "@expo-google-fonts/inter";
// Single-weight subpath import keeps the other Roboto files out of the bundle.
import { Roboto_500Medium } from "@expo-google-fonts/roboto/500Medium";
import {
  Quicksand_400Regular,
  Quicksand_500Medium,
  Quicksand_600SemiBold,
  Quicksand_700Bold,
} from "@expo-google-fonts/quicksand";

// Passed to expo-font's useFonts() in app/_layout.tsx. Keys are the fontFamily names.
export const fontAssets = {
  Quicksand_400Regular,
  Quicksand_500Medium,
  Quicksand_600SemiBold,
  Quicksand_700Bold,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Roboto_500Medium,
};

export const fontFamily = {
  // Headings, nav, buttons — Quicksand (web: --font-quicksand)
  heading: "Quicksand_700Bold",
  headingSemibold: "Quicksand_600SemiBold",
  headingMedium: "Quicksand_500Medium",
  headingRegular: "Quicksand_400Regular",
  // Body, data, forms — Inter (web: --font-inter)
  body: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  bodySemibold: "Inter_600SemiBold",
  // Google sign-in button only — Google's branding guidelines require Roboto Medium.
  googleButton: "Roboto_500Medium",
} as const satisfies Record<string, keyof typeof fontAssets>;
