import { useState, type ReactElement } from "react";
import { StyleSheet, View } from "react-native";

import { useTheme } from "@/theme";

export interface GridProps<T> {
  items: readonly T[];
  columns: number;
  keyExtractor: (item: T, index: number) => string;
  /** Receives the exact cell width so tiles line up without magic percentages. */
  renderItem: (item: T, width: number, index: number) => ReactElement;
}

/** Fixed-column wrapping grid, measured from its own width. */
export function Grid<T>({ items, columns, keyExtractor, renderItem }: GridProps<T>) {
  const t = useTheme();
  const [width, setWidth] = useState(0);
  const gap = t.spacing[3];
  const cell = width ? (width - gap * (columns - 1)) / columns : 0;

  return (
    <View style={[styles.grid, { gap }]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {cell > 0 &&
        items.map((item, i) => (
          <View key={keyExtractor(item, i)}>{renderItem(item, cell, i)}</View>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap" },
});
