import { Feather } from "@expo/vector-icons";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Linking, StyleSheet, View } from "react-native";

import { ApiError, getErrorMessage } from "@/api/errors";
import {
  Button,
  Card,
  Loader,
  Screen,
  SelectField,
  Text,
  TextInput,
  showToast,
} from "@/components";
import { useMyEvents, useVerifyEventTicket } from "@/hooks/queries/businessEvents";
import { theme, useTheme, type ColorPalette } from "@/theme";
import { getEventStatus } from "@/utils/businessEvents";

// Ticket scanner (~ web /dashboard/events/verify-event, VerifyEvents.tsx). The server
// matches codes case-insensitively and checks the ticket belongs to this business (and
// to the chosen event, when one is picked).

type Outcome = "valid" | "used" | "wrong-event" | "other-business" | "invalid" | "failed";

interface ScanResult {
  outcome: Outcome;
  title: string;
  detail?: string;
  code: string;
}

const OUTCOME_STYLE: Record<
  Outcome,
  { fg: keyof ColorPalette; bg: keyof ColorPalette; icon: keyof typeof Feather.glyphMap }
> = {
  valid: { fg: "success", bg: "successMuted", icon: "check-circle" },
  used: { fg: "warning", bg: "warningMuted", icon: "alert-circle" },
  "wrong-event": { fg: "destructive", bg: "destructiveMuted", icon: "x-circle" },
  "other-business": { fg: "destructive", bg: "destructiveMuted", icon: "x-circle" },
  invalid: { fg: "destructive", bg: "destructiveMuted", icon: "x-circle" },
  failed: { fg: "destructive", bg: "destructiveMuted", icon: "wifi-off" },
};

/** Same code scanned again within this window is ignored (the camera fires repeatedly). */
const RESCAN_GUARD_MS = 3000;
/** A valid check-in clears itself so the next guest can be scanned straight away. */
const VALID_RESULT_MS = 2500;

function classify(error: unknown, code: string): ScanResult {
  if (error instanceof ApiError) {
    if (error.isNetworkError)
      return { outcome: "failed", title: "Couldn't verify", detail: error.message, code };
    if (error.status === 400 && /already used/i.test(error.message)) {
      return { outcome: "used", title: "Already checked in", detail: "Ticket already used.", code };
    }
    if (error.status === 400 && /not valid for this event/i.test(error.message)) {
      return { outcome: "wrong-event", title: "Wrong event", detail: error.message, code };
    }
    if (error.status === 403) {
      return {
        outcome: "other-business",
        title: "Not your ticket",
        detail: "This ticket belongs to another business.",
        code,
      };
    }
    if (error.status === 404)
      return { outcome: "invalid", title: "Invalid ticket", detail: "Invalid ticket code.", code };
  }
  return {
    outcome: "failed",
    title: "Couldn't verify",
    detail: getErrorMessage(error, "Verification failed"),
    code,
  };
}

export default function ScanScreen() {
  const t = useTheme();
  const params = useLocalSearchParams<{ eventId?: string }>();
  const events = useMyEvents();
  const verify = useVerifyEventTicket();
  const [permission, requestPermission] = useCameraPermissions();
  const [focused, setFocused] = useState(false);
  const [eventId, setEventId] = useState(params.eventId ?? "");
  const [manual, setManual] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const busy = useRef(false);
  const lastScan = useRef<{ code: string; at: number } | null>(null);

  // Opened from Manage Event with ?eventId= — adopt it (React's "adjust state on prop
  // change" pattern rather than an effect).
  const [seenParam, setSeenParam] = useState(params.eventId);
  if (params.eventId !== seenParam) {
    setSeenParam(params.eventId);
    setEventId(params.eventId ?? "");
  }

  // Camera only runs while this tab is on screen.
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  // Valid check-ins clear themselves; problems stay until "Scan next".
  useEffect(() => {
    if (result?.outcome !== "valid") return;
    const timer = setTimeout(() => setResult(null), VALID_RESULT_MS);
    return () => clearTimeout(timer);
  }, [result]);

  const eventOptions = useMemo(() => {
    const active = (events.data ?? []).filter((e) => getEventStatus(e) !== "archived");
    return [
      { label: "All my events", value: "" },
      ...active.map((e) => ({ label: e.title, value: String(e._id) })),
    ];
  }, [events.data]);

  const check = async (raw: string) => {
    const code = raw.trim();
    if (!code) {
      showToast({ type: "error", message: "Please enter or scan a code" });
      return;
    }
    if (busy.current) return;
    busy.current = true;
    try {
      const res = await verify.mutateAsync({ code, eventId: eventId || undefined });
      const detail = [res.data?.attendee, res.data?.ticketType].filter(Boolean).join(" · ");
      setResult({ outcome: "valid", title: "Checked in", detail: detail || res.message, code });
      setManual("");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      const r = classify(err, code);
      setResult(r);
      void Haptics.notificationAsync(
        r.outcome === "used"
          ? Haptics.NotificationFeedbackType.Warning
          : Haptics.NotificationFeedbackType.Error,
      );
    } finally {
      busy.current = false;
    }
  };

  const onScanned = ({ data }: BarcodeScanningResult) => {
    if (busy.current || result) return;
    const now = Date.now();
    if (
      lastScan.current &&
      lastScan.current.code === data &&
      now - lastScan.current.at < RESCAN_GUARD_MS
    )
      return;
    lastScan.current = { code: data, at: now };
    void check(data);
  };

  const style = result ? OUTCOME_STYLE[result.outcome] : null;
  const cameraOn = focused && !!permission?.granted;

  return (
    <Screen edges={["top"]}>
      <View style={styles.header}>
        <Text variant="h2" accessibilityRole="header">
          Scan tickets
        </Text>
        <Text variant="bodySm" color="mutedForeground">
          Scan a QR code or enter the unique code.
        </Text>
      </View>

      <View style={styles.stack}>
        <View style={styles.field}>
          <Text variant="label">Event</Text>
          <SelectField title="Event" options={eventOptions} value={eventId} onChange={setEventId} />
          {!!eventId && (
            <Text variant="caption" color="mutedForeground">
              Only tickets for this event will be accepted.
            </Text>
          )}
        </View>

        <View
          style={[styles.camera, { borderRadius: t.radius.xl, backgroundColor: t.colors.muted }]}
        >
          {!permission ? (
            <Loader fullScreen={false} />
          ) : permission.granted ? (
            cameraOn && (
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                onBarcodeScanned={result || verify.isPending ? undefined : onScanned}
              />
            )
          ) : (
            <View style={styles.permission}>
              <Feather name="camera-off" size={t.sizes.iconXl} color={t.colors.mutedForeground} />
              <Text variant="bodySm" color="mutedForeground" align="center">
                {permission.canAskAgain
                  ? "Allow camera access to scan QR codes."
                  : "Camera access is off. Turn it on in Settings, or enter the code below."}
              </Text>
              <Button
                title={permission.canAskAgain ? "Allow camera" : "Open Settings"}
                variant="outline"
                size="sm"
                fullWidth={false}
                onPress={() =>
                  permission.canAskAgain ? void requestPermission() : void Linking.openSettings()
                }
              />
            </View>
          )}
          {permission?.granted && (
            <View style={styles.frameWrap}>
              <View
                style={[styles.frame, { borderColor: t.colors.onImage, borderRadius: t.radius.xl }]}
              />
            </View>
          )}
          {verify.isPending && (
            <View style={[styles.overlay, { backgroundColor: t.colors.imageScrim }]}>
              <Loader fullScreen={false} message="Verifying Code..." />
            </View>
          )}
        </View>

        {result && style && (
          <Card
            style={[
              styles.result,
              { backgroundColor: t.colors[style.bg], borderColor: t.colors[style.fg] },
            ]}
            accessibilityLiveRegion="polite"
          >
            <View style={styles.resultRow}>
              <Feather name={style.icon} size={t.sizes.iconXl} color={t.colors[style.fg]} />
              <View style={styles.flex}>
                <Text variant="h3" style={{ color: t.colors[style.fg] }}>
                  {result.title}
                </Text>
                {!!result.detail && <Text variant="bodySm">{result.detail}</Text>}
                <Text variant="caption" color="mutedForeground" numberOfLines={1}>
                  {result.code}
                </Text>
              </View>
            </View>
            <Button title="Scan next" variant="outline" onPress={() => setResult(null)} />
          </Card>
        )}

        <Card style={styles.manual}>
          <Text variant="label">Or manual entry</Text>
          <TextInput
            value={manual}
            onChangeText={(v) => setManual(v.toUpperCase())}
            placeholder="ENTER UNIQUE CODE"
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={() => void check(manual)}
          />
          <Button
            title="Verify Code"
            icon="check-square"
            loading={verify.isPending}
            onPress={() => void check(manual)}
          />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: theme.spacing[1], marginBottom: theme.spacing[4] },
  stack: { gap: theme.spacing[4] },
  field: { gap: theme.spacing[1.5] },
  camera: {
    height: theme.sizes.scannerFrame + theme.spacing[16],
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  permission: { alignItems: "center", gap: theme.spacing[3], padding: theme.spacing[6] },
  frameWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
  },
  frame: {
    width: theme.sizes.scannerFrame,
    height: theme.sizes.scannerFrame,
    borderWidth: theme.sizes.borderWidthBold,
  },
  overlay: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  result: { gap: theme.spacing[3], borderWidth: theme.sizes.borderWidthThick },
  resultRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing[3] },
  manual: { gap: theme.spacing[3] },
  flex: { flex: 1 },
});
