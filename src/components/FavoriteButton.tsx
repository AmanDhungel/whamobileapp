import { FontAwesome } from "@expo/vector-icons";
import { Pressable, StyleSheet } from "react-native";

import { useFavoriteIds, useToggleFavorite, type FavoriteTarget } from "@/hooks/queries/favorites";
import { useAccountArea } from "@/store/authStore";
import { requestLogin } from "@/store/loginPromptStore";
import { theme, useTheme } from "@/theme";

export interface FavoriteButtonProps {
  target: FavoriteTarget;
  /** "overlay" = white circle over an image; "plain" = bare heart. */
  variant?: "overlay" | "plain";
  /** "md" matches the detail-hero overlay buttons; "sm" is for cards. */
  size?: "sm" | "md";
}

/**
 * Heart toggle. Logged out → "Sign in to save favorites" sheet. Signed in → optimistic
 * toggle (see useToggleFavorite). Hidden for business accounts (never on these screens).
 */
export function FavoriteButton({ target, variant = "overlay", size = "sm" }: FavoriteButtonProps) {
  const t = useTheme();
  const area = useAccountArea();
  const favoriteIds = useFavoriteIds();
  const toggle = useToggleFavorite();

  if (area === "business") return null;
  const active = favoriteIds.has(target.item._id);

  const onPress = () => {
    if (area !== "customer") {
      requestLogin("Sign in to save favorites");
      return;
    }
    toggle.mutate(target);
  };

  return (
    <Pressable
      onPress={onPress}
      hitSlop={t.spacing[2]}
      accessibilityRole="button"
      accessibilityLabel={active ? "Remove from favorites" : "Save to favorites"}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        variant === "overlay" && [
          styles.overlay,
          size === "md" && styles.overlayMd,
          { backgroundColor: t.colors.imageButton },
          t.shadows.sm,
        ],
        pressed && { opacity: t.opacity.pressed },
      ]}
    >
      <FontAwesome
        name={active ? "heart" : "heart-o"}
        size={t.sizes.iconMd}
        color={active ? t.colors.destructive : t.colors.primary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    width: theme.sizes.iconButtonSm,
    height: theme.sizes.iconButtonSm,
    borderRadius: theme.radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  overlayMd: { width: theme.sizes.iconButton, height: theme.sizes.iconButton },
});
