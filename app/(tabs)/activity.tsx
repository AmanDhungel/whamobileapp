import { useQueryClient } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  CardSkeleton,
  LoginPrompt,
  PendingPurchaseNotice,
  QueryList,
  SegmentedControl,
  Text,
  TicketRow,
} from "@/components";
import { useTickets } from "@/hooks/queries/tickets";
import { retryPendingPurchases } from "@/hooks/usePendingPurchaseRecovery";
import { useIsCustomer } from "@/store/authStore";
import { theme, useTheme } from "@/theme";
import { splitTickets } from "@/utils/tickets";

type Segment = "upcoming" | "past";

/**
 * ~ web /activity → "Tickets" (GET /api/tickets): Upcoming / Past, QR detail on tap.
 * The web's second "Bookings" tab isn't here — GET /api/bookings/user is still
 * cookie-only on the backend (bearer tokens get 401).
 */
export default function ActivityScreen() {
  const t = useTheme();
  const isCustomer = useIsCustomer();
  const tickets = useTickets();
  const [segment, setSegment] = useState<Segment>("upcoming");
  const queryClient = useQueryClient();

  // Finish any paid-but-unissued orders whenever this tab is opened.
  useFocusEffect(
    useCallback(() => {
      void retryPendingPurchases(queryClient);
    }, [queryClient]),
  );

  const split = useMemo(() => splitTickets(tickets.data ?? []), [tickets.data]);

  return (
    <SafeAreaView edges={["top"]} style={[styles.flex, { backgroundColor: t.colors.background }]}>
      <View style={styles.header}>
        <Text variant="h2" accessibilityRole="header">
          My tickets
        </Text>
        {isCustomer && (
          <SegmentedControl
            options={[
              { label: `Upcoming (${split.upcoming.length})`, value: "upcoming" },
              { label: `Past (${split.past.length})`, value: "past" },
            ]}
            value={segment}
            onChange={setSegment}
          />
        )}
        <PendingPurchaseNotice />
      </View>

      {!isCustomer ? (
        <LoginPrompt
          icon="calendar"
          title="Log in to see your tickets"
          message="Your event tickets, registrations and claimed deals will show up here."
        />
      ) : (
        <QueryList
          query={{ ...tickets, data: tickets.data ? split[segment] : undefined }}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => <TicketRow item={item} />}
          ItemSeparatorComponent={Separator}
          skeleton={<CardSkeleton variant="row" />}
          empty={{
            icon: "calendar",
            title: segment === "upcoming" ? "No upcoming tickets" : "No past tickets",
            message:
              segment === "upcoming"
                ? "Tickets you buy or register for will appear here."
                : undefined,
          }}
          errorTitle="Couldn't load your tickets."
        />
      )}
    </SafeAreaView>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { gap: theme.spacing[3], padding: theme.spacing[6], paddingBottom: theme.spacing[4] },
  separator: { height: theme.spacing[3] },
});
