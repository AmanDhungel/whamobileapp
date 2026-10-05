import { Feather } from "@expo/vector-icons";
import RNDateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";

import { theme, useTheme } from "@/theme";
import { formatDate, formatTime, parseDate, todayDateOnly } from "@/utils/format";

import { BottomSheet } from "./BottomSheet";
import { Button } from "./Button";
import { Text } from "./Text";

export interface DateTimeFieldProps {
  label?: string;
  mode: "date" | "time";
  /** "YYYY-MM-DD" for dates, "HH:mm" for times; "" when empty. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  hint?: string;
  /** "YYYY-MM-DD" — earliest selectable date. */
  minimumDate?: string;
  /** Show a clear (×) button when a value is set. */
  clearable?: boolean;
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const toDateOnly = (d: Date) => todayDateOnly(d);
const toTime = (d: Date) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

function toDate(mode: "date" | "time", value: string): Date {
  if (mode === "date") return parseDate(value) ?? new Date();
  const m = /^(\d{1,2}):(\d{2})/.exec(value);
  const d = new Date();
  if (m) d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return d;
}

/**
 * Native date / time picker field: the Android dialog, or an inline iOS picker in a
 * bottom sheet with Done.
 */
export function DateTimeField({
  label,
  mode,
  value,
  onChange,
  placeholder,
  error,
  hint,
  minimumDate,
  clearable = false,
}: DateTimeFieldProps) {
  const t = useTheme();
  const [iosOpen, setIosOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(() => toDate(mode, value));
  const min = minimumDate ? (parseDate(minimumDate) ?? undefined) : undefined;

  const commit = (d: Date) => onChange(mode === "date" ? toDateOnly(d) : toTime(d));

  const open = () => {
    const current = toDate(mode, value);
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: min && current < min ? min : current,
        mode,
        is24Hour: false,
        minimumDate: min,
        onChange: (event, date) => {
          if (event.type === "set" && date) commit(date);
        },
      });
      return;
    }
    setDraft(min && current < min ? min : current);
    setIosOpen(true);
  };

  const display = value
    ? mode === "date"
      ? (formatDate(value) ?? value)
      : (formatTime(value) ?? value)
    : (placeholder ?? (mode === "date" ? "Pick a date" : "Pick a time"));

  return (
    <View style={styles.container}>
      {!!label && <Text variant="label">{label}</Text>}
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={`${label ?? (mode === "date" ? "Date" : "Time")}: ${value ? display : "not set"}`}
        style={({ pressed }) => [
          styles.field,
          {
            borderColor: error ? t.colors.destructive : t.colors.border,
            backgroundColor: pressed ? t.colors.muted : t.colors.background,
          },
        ]}
      >
        <Feather
          name={mode === "date" ? "calendar" : "clock"}
          size={t.sizes.iconSm}
          color={t.colors.mutedForeground}
        />
        <Text
          variant="bodyMedium"
          color={value ? "foreground" : "mutedForeground"}
          style={styles.flex}
          numberOfLines={1}
        >
          {display}
        </Text>
        {clearable && !!value && (
          <Pressable
            onPress={() => onChange("")}
            hitSlop={t.spacing[2]}
            accessibilityRole="button"
            accessibilityLabel={`Clear ${label ?? mode}`}
          >
            <Feather name="x" size={t.sizes.iconSm} color={t.colors.mutedForeground} />
          </Pressable>
        )}
      </Pressable>
      {!!error && (
        <Text variant="caption" color="destructive">
          {error}
        </Text>
      )}
      {!error && !!hint && (
        <Text variant="caption" color="mutedForeground">
          {hint}
        </Text>
      )}

      {Platform.OS === "ios" && (
        <BottomSheet
          visible={iosOpen}
          onClose={() => setIosOpen(false)}
          title={label ?? (mode === "date" ? "Pick a date" : "Pick a time")}
          scroll={false}
          footer={
            <Button
              title="Done"
              onPress={() => {
                commit(draft);
                setIosOpen(false);
              }}
            />
          }
        >
          <RNDateTimePicker
            value={draft}
            mode={mode}
            display={mode === "date" ? "inline" : "spinner"}
            minimumDate={min}
            onChange={(_event, date) => date && setDraft(date)}
            themeVariant="light"
            accentColor={t.colors.secondary}
          />
        </BottomSheet>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: theme.spacing[1.5], alignSelf: "stretch" },
  field: {
    minHeight: theme.sizes.inputHeight,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    borderWidth: theme.sizes.borderWidthThick,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing[4],
  },
  flex: { flex: 1 },
});
