import type { Feather } from "@expo/vector-icons";
import { useState } from "react";

import { Chip } from "./Chip";
import { SelectSheet, type SelectOption } from "./SelectSheet";

export interface SelectChipProps<T> {
  title: string;
  options: readonly SelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** The option value that means "no filter" (chip renders unselected). */
  defaultValue?: T;
  icon?: keyof typeof Feather.glyphMap;
}

/** Filter chip showing the current choice; tapping opens a SelectSheet. */
export function SelectChip<T>({
  title,
  options,
  value,
  onChange,
  defaultValue,
  icon,
}: SelectChipProps<T>) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  const isDefault = value === defaultValue;
  return (
    <>
      <Chip
        label={isDefault ? title : (current?.label ?? title)}
        icon={icon}
        dropdown
        selected={!isDefault}
        onPress={() => setOpen(true)}
      />
      <SelectSheet
        visible={open}
        onClose={() => setOpen(false)}
        title={title}
        options={options}
        value={value}
        onSelect={onChange}
      />
    </>
  );
}
