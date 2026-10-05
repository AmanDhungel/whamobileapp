import { useMemo, useState } from "react";
import { RefreshControl, StyleSheet, View } from "react-native";

import type { BusinessBooking } from "@/api/types";
import {
  Avatar,
  BusinessBookingRow,
  Card,
  CardSkeleton,
  DailyChart,
  employeeName,
  ErrorState,
  Grid,
  KpiTile,
  Screen,
  SegmentedControl,
  Skeleton,
  Text,
} from "@/components";
import { useBusinessDashboard } from "@/hooks/queries/businessEvents";
import { useAuthStore } from "@/store/authStore";
import { theme, useTheme } from "@/theme";
import { formatDayMonth, formatPrice } from "@/utils/format";

type ChartSeries = "sales" | "appointments";

/** Top services / team members by bookings in the last 7 days (web derives them the same way). */
function topBy(bookings: BusinessBooking[], nameOf: (b: BusinessBooking) => string | null) {
  const counts = new Map<string, number>();
  for (const b of bookings) {
    const name = nameOf(b);
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

/** ~ web /dashboard (business): 7-day stats, chart, today / upcoming / recent bookings. */
export default function BusinessOverviewScreen() {
  const t = useTheme();
  const user = useAuthStore((s) => s.user);
  const query = useBusinessDashboard();
  const [series, setSeries] = useState<ChartSeries>("sales");
  const [refreshing, setRefreshing] = useState(false);
  const data = query.data;

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await query.refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const points = useMemo(
    () =>
      (data?.dailyStats ?? []).map((d) => ({
        label: formatDayMonth(d.date) ?? d.date,
        value: series === "sales" ? d.sales : d.appointments,
      })),
    [data?.dailyStats, series],
  );
  const services = useMemo(
    () => topBy(data?.recentBookings ?? [], (b) => b.service_id?.name || "Service"),
    [data?.recentBookings],
  );
  const team = useMemo(
    () => topBy(data?.recentBookings ?? [], employeeName),
    [data?.recentBookings],
  );

  const kpis = data
    ? [
        {
          label: "Sales · last 7 days",
          value: formatPrice(data.totalSales),
          icon: "dollar-sign" as const,
          tone: "success" as const,
        },
        {
          label: "Appointments · last 7 days",
          value: String(data.totalAppointments),
          icon: "calendar" as const,
          tone: "info" as const,
        },
        {
          label: "Today",
          value: String(data.todayBookings.length),
          icon: "clock" as const,
          tone: "warning" as const,
        },
        {
          label: "Next 7 days",
          value: String(data.upcomingBookings.length),
          icon: "trending-up" as const,
          tone: "info" as const,
        },
      ]
    : [];

  return (
    <Screen
      edges={["top"]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void onRefresh()}
          tintColor={t.colors.primary}
          colors={[t.colors.primary]}
        />
      }
    >
      <View style={styles.header}>
        <Text variant="h2" accessibilityRole="header">
          Overview
        </Text>
        <Text variant="bodySm" color="mutedForeground" numberOfLines={1}>
          {user?.business_name || user?.name || "Your business"}
        </Text>
      </View>

      {query.isPending ? (
        <View style={styles.stack}>
          <Skeleton height={t.sizes.chartHeight} radius={t.radius.xl} />
          {Array.from({ length: 4 }, (_, i) => (
            <CardSkeleton key={i} variant="row" />
          ))}
        </View>
      ) : query.isError && !data ? (
        <ErrorState
          title="Couldn't load your overview"
          error={query.error}
          onRetry={() => void onRefresh()}
          retrying={refreshing}
        />
      ) : data ? (
        <View style={styles.stack}>
          <Grid
            items={kpis}
            columns={2}
            keyExtractor={(k) => k.label}
            renderItem={(k) => (
              <KpiTile label={k.label} value={k.value} icon={k.icon} tone={k.tone} />
            )}
          />

          <Card style={styles.card}>
            <Text variant="title">Last 7 days</Text>
            <SegmentedControl
              options={[
                { label: "Sales", value: "sales" },
                { label: "Appointments", value: "appointments" },
              ]}
              value={series}
              onChange={setSeries}
            />
            <DailyChart
              points={points}
              color={series === "sales" ? "whaBlue" : "success"}
              formatValue={(v) => (series === "sales" ? `$${Math.round(v)}` : String(v))}
              accessibilityLabel={`${series === "sales" ? "Sales" : "Appointments"} per day for the last 7 days`}
            />
            <Text variant="caption" color="mutedForeground">
              Sales count paid bookings only.
            </Text>
          </Card>

          <BookingList
            title="Today's next appointments"
            bookings={data.todayBookings}
            emptyTitle="No Appointments Today"
          />
          <BookingList
            title="Upcoming appointments"
            subtitle="Next 7 days"
            bookings={data.upcomingBookings.slice(0, 6)}
            emptyTitle="Your schedule is empty"
          />
          <BookingList
            title="Appointments activity"
            subtitle="Last 7 days"
            bookings={data.recentBookings}
            emptyTitle="No recent activity"
          />

          <Card style={styles.card}>
            <View>
              <Text variant="title">Top services</Text>
              <Text variant="caption" color="mutedForeground">
                Bookings in the last 7 days
              </Text>
            </View>
            <RankList rows={services} />
          </Card>

          <Card style={styles.card}>
            <View>
              <Text variant="title">Top team member</Text>
              <Text variant="caption" color="mutedForeground">
                Bookings in the last 7 days
              </Text>
            </View>
            <RankList rows={team} avatar />
          </Card>
        </View>
      ) : null}
    </Screen>
  );
}

function RankList({ rows, avatar }: { rows: { name: string; count: number }[]; avatar?: boolean }) {
  if (rows.length === 0) {
    return (
      <Text variant="bodySm" color="mutedForeground">
        No bookings yet.
      </Text>
    );
  }
  return rows.map((r) => (
    <View key={r.name} style={styles.serviceRow}>
      {avatar && <Avatar name={r.name} size={theme.sizes.avatarSm} />}
      <Text variant="bodySm" style={styles.flex} numberOfLines={1}>
        {r.name}
      </Text>
      <Text variant="label">{r.count}</Text>
    </View>
  ));
}

function BookingList({
  title,
  subtitle,
  bookings,
  emptyTitle,
}: {
  title: string;
  subtitle?: string;
  bookings: BusinessBooking[];
  emptyTitle: string;
}) {
  return (
    <Card style={styles.card}>
      <View>
        <Text variant="title">{title}</Text>
        {!!subtitle && (
          <Text variant="caption" color="mutedForeground">
            {subtitle}
          </Text>
        )}
      </View>
      {bookings.length === 0 ? (
        <Text variant="bodySm" color="mutedForeground">
          {emptyTitle}
        </Text>
      ) : (
        bookings.map((b) => <BusinessBookingRow key={b._id} booking={b} />)
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { gap: theme.spacing[1], marginBottom: theme.spacing[4] },
  stack: { gap: theme.spacing[4] },
  card: { gap: theme.spacing[3] },
  serviceRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing[3] },
  flex: { flex: 1 },
});
