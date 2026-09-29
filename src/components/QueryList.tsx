import type { Feather } from "@expo/vector-icons";
import { useState, type ReactElement, type ReactNode } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
  type FlatListProps,
  type ListRenderItem,
} from "react-native";

import { theme, useTheme } from "@/theme";

import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";

/** The subset of a TanStack `useQuery` result QueryList needs. */
export interface ListQuery<T> {
  data: T[] | undefined;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => Promise<unknown>;
}

export interface QueryListProps<T> extends Omit<
  FlatListProps<T>,
  "data" | "renderItem" | "refreshControl" | "ListEmptyComponent" | "refreshing" | "onRefresh"
> {
  query: ListQuery<T>;
  renderItem: ListRenderItem<T>;
  /** One placeholder item, repeated while loading (e.g. <CardSkeleton variant="event" />). */
  skeleton: ReactElement;
  skeletonCount?: number;
  empty: {
    icon?: keyof typeof Feather.glyphMap;
    title: string;
    message?: string;
    action?: ReactNode;
  };
  errorTitle?: string;
}

/**
 * Standard list screen body: skeletons while loading, EmptyState when empty,
 * ErrorState with retry on failure, pull-to-refresh always. Pagination: none of the
 * backend list routes paginate yet, so `onEndReached` is simply passed through for
 * when they do — FlatList virtualisation keeps long lists smooth meanwhile.
 */
export function QueryList<T>({
  query,
  skeleton,
  skeletonCount = 4,
  empty,
  errorTitle,
  contentContainerStyle,
  ...listProps
}: QueryListProps<T>) {
  const t = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await query.refetch();
    } finally {
      setRefreshing(false);
    }
  };

  let placeholder: ReactElement;
  if (query.isPending) {
    placeholder = (
      <View style={styles.skeletons}>
        {Array.from({ length: skeletonCount }, (_, i) => (
          <View key={i}>{skeleton}</View>
        ))}
      </View>
    );
  } else if (query.isError && !query.data?.length) {
    placeholder = (
      <ErrorState
        title={errorTitle ?? "Couldn't load this"}
        error={query.error}
        onRetry={() => void onRefresh()}
        retrying={refreshing}
      />
    );
  } else {
    placeholder = <EmptyState {...empty} />;
  }

  return (
    <FlatList
      data={query.data ?? []}
      ListEmptyComponent={placeholder}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void onRefresh()}
          tintColor={t.colors.primary}
          colors={[t.colors.primary]}
        />
      }
      contentContainerStyle={[styles.content, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      {...listProps}
    />
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: theme.spacing[6], paddingBottom: theme.spacing[8] },
  skeletons: { gap: theme.spacing[6] },
});
