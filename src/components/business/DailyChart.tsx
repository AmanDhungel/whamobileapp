import { useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Rect, Text as SvgText } from "react-native-svg";

import { theme, useTheme, type ColorPalette } from "@/theme";

import { Text } from "../Text";

export interface DailyChartPoint {
  /** X label, e.g. "04 Oct". */
  label: string;
  value: number;
}

export interface DailyChartProps {
  points: DailyChartPoint[];
  /** Value label above each bar. */
  formatValue: (value: number) => string;
  color: keyof ColorPalette;
  accessibilityLabel: string;
}

/** Simple vertical bar chart (one series), drawn with react-native-svg. */
export function DailyChart({ points, formatValue, color, accessibilityLabel }: DailyChartProps) {
  const t = useTheme();
  const [width, setWidth] = useState(0);
  const height = t.sizes.chartHeight;
  const labelBand = t.spacing[4];
  const plot = height - labelBand * 2;
  const max = Math.max(1, ...points.map((p) => p.value));
  const slot = points.length ? width / points.length : 0;
  const bar = slot * 0.5;
  const fontSize = t.typography.fontSize["2xs"];

  return (
    <View
      style={styles.container}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      {width > 0 && (
        <Svg width={width} height={height}>
          {points.map((p, i) => {
            const h = Math.max(p.value > 0 ? t.spacing[0.5] : 0, (p.value / max) * plot);
            const x = i * slot + (slot - bar) / 2;
            const y = labelBand + plot - h;
            return (
              <Rect
                key={`b-${p.label}`}
                x={x}
                y={y}
                width={bar}
                height={h}
                rx={t.radius.sm}
                fill={t.colors[color]}
              />
            );
          })}
          {points.map((p, i) => {
            const h = (p.value / max) * plot;
            return (
              <SvgText
                key={`v-${p.label}`}
                x={i * slot + slot / 2}
                y={labelBand + plot - h - t.spacing[1]}
                fontSize={fontSize}
                fill={t.colors.foreground}
                textAnchor="middle"
              >
                {p.value > 0 ? formatValue(p.value) : ""}
              </SvgText>
            );
          })}
          {points.map((p, i) => (
            <SvgText
              key={`l-${p.label}`}
              x={i * slot + slot / 2}
              y={height - t.spacing[1]}
              fontSize={fontSize}
              fill={t.colors.mutedForeground}
              textAnchor="middle"
            >
              {p.label}
            </SvgText>
          ))}
        </Svg>
      )}
      {points.length === 0 && (
        <Text variant="caption" color="mutedForeground">
          No data yet
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: "stretch", minHeight: theme.sizes.chartHeight },
});
