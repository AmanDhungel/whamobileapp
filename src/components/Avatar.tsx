import { StyleSheet, View } from "react-native";

import { useTheme, type TextVariant } from "@/theme";

import { RemoteImage } from "./RemoteImage";
import { Text } from "./Text";

export function initials(name?: string | null, fallback?: string | null): string {
  const source = name?.trim() || fallback?.trim() || "?";
  const parts = source.split(/\s+/).filter(Boolean);
  const letters =
    parts.length > 1
      ? `${parts[0]?.[0] ?? ""}${parts[parts.length - 1]?.[0] ?? ""}`
      : source.slice(0, 2);
  return letters.toUpperCase();
}

export interface AvatarProps {
  uri?: string | null;
  name?: string | null;
  /** Used for initials when there's no name (e.g. email). */
  fallback?: string | null;
  size?: number;
}

/** Profile picture with an initials fallback (web: shadcn Avatar). */
export function Avatar({ uri, name, fallback, size }: AvatarProps) {
  const t = useTheme();
  const dim = size ?? t.sizes.avatarSm;
  const box = { width: dim, height: dim, borderRadius: t.radius.full };
  const textVariant: TextVariant = dim >= t.sizes.avatar ? "h2" : "label";

  if (uri) {
    return (
      <RemoteImage
        uri={uri}
        style={box}
        placeholderIcon="user"
        accessibilityLabel={name ? `${name}'s photo` : "Profile photo"}
      />
    );
  }
  return (
    <View style={[styles.center, box, { backgroundColor: t.colors.accent }]}>
      <Text variant={textVariant} color="accentForeground">
        {initials(name, fallback)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
});
