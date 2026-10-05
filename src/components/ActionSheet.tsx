import type { Feather } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

import { theme } from "@/theme";

import { BottomSheet } from "./BottomSheet";
import { ListDivider, ListRow } from "./ListRow";

export interface ActionSheetAction {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
  /** Small right-hand detail, e.g. "Sending…". */
  detail?: string;
}

export interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  actions: ActionSheetAction[];
}

/**
 * Row actions (the web's kebab / hover menus). Tapping an action closes the sheet first,
 * then runs it — so an action can open another sheet or dialog.
 */
export function ActionSheet({ visible, onClose, title, actions }: ActionSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      <View style={styles.list}>
        {actions.map((a, i) => (
          <View key={a.label}>
            {i > 0 && <ListDivider />}
            <ListRow
              icon={a.icon}
              label={a.label}
              detail={a.detail}
              color={a.destructive ? "destructive" : undefined}
              disabled={a.disabled}
              chevron={false}
              onPress={() => {
                onClose();
                a.onPress();
              }}
            />
          </View>
        ))}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: theme.spacing[2] },
});
