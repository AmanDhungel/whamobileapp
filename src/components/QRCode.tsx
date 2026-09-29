import { StyleSheet, View } from "react-native";
import QRCodeSvg from "react-native-qrcode-svg";

import { theme, useTheme } from "@/theme";

/**
 * QR for a ticket code. The encoded value is the raw code string (web:
 * <QRCodeCanvas value={code.key} level="H" />). Always black on white for scanners.
 */
export function QRCode({ value, size }: { value: string; size?: number }) {
  const t = useTheme();
  return (
    <View
      style={[styles.box, { backgroundColor: t.colors.qrBackground, padding: t.sizes.qrPadding }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`QR code for ticket ${value}`}
    >
      <QRCodeSvg
        value={value}
        size={size ?? t.sizes.qrCode}
        color={t.colors.qrForeground}
        backgroundColor={t.colors.qrBackground}
        ecl="H"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignSelf: "center", borderRadius: theme.radius.tailwindLg },
});
