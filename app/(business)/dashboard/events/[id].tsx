import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState, type ReactElement } from "react";
import { FlatList, RefreshControl, Share, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ApiError } from "@/api/errors";
import type { BusinessEvent, BusinessTicketPurchase, EventAttendee } from "@/api/types";
import {
  ActionSheet,
  Badge,
  BottomSheet,
  Button,
  Card,
  Chip,
  ChipRow,
  ConfirmSheet,
  EmptyState,
  ErrorState,
  EVENT_STATUS_TONE,
  Grid,
  KpiTile,
  Loader,
  RemoteImage,
  ScreenHeader,
  SearchBar,
  Text,
  showToast,
  type ActionSheetAction,
} from "@/components";
import {
  useEventAttendees,
  useEventForForm,
  useEventPurchases,
  useSendPurchaseInvoice,
  useSetTicketStatus,
} from "@/hooks/queries/businessEvents";
import {
  shareInvoicePdf,
  shareSalesReportCsv,
  shareSalesReportPdf,
  shareTicketPdf,
} from "@/services/pdf";
import { theme, useTheme } from "@/theme";
import {
  EVENT_STATUS_LABEL,
  countByTicketType,
  eventDateLine,
  eventLocationLine,
  eventPublicUrl,
  getEventStatus,
  purchaseBuyerName,
  purchaseItemsLine,
  summarizeSales,
} from "@/utils/businessEvents";
import { formatDate, formatDateTime, formatPrice } from "@/utils/format";
import { openInAppBrowser } from "@/utils/links";
import { buildSalesReport } from "@/utils/salesReport";

type Section = "overview" | "orders" | "attendees" | "scanning" | "verify" | "analytics";

const SECTIONS: { key: Section; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "orders", label: "Orders" },
  { key: "attendees", label: "Attendees" },
  { key: "scanning", label: "Scanning count" },
  { key: "verify", label: "Verify" },
  { key: "analytics", label: "Analytics" },
];

const statusLabel = (verified: boolean) => (verified ? "Checked In" : "Pending");

/** ~ web /dashboard/events/redemtion-table/[id] (ManageEventPage.tsx). */
export default function ManageEventScreen() {
  const t = useTheme();
  const { id = "" } = useLocalSearchParams<{ id: string }>();
  const eventQuery = useEventForForm(id);
  const attendeesQuery = useEventAttendees(id);
  const purchasesQuery = useEventPurchases(id);
  const sendInvoice = useSendPurchaseInvoice();
  const setStatus = useSetTicketStatus(id);

  const [section, setSection] = useState<Section>("overview");
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [orderMenu, setOrderMenu] = useState<BusinessTicketPurchase | null>(null);
  const [invoiceFor, setInvoiceFor] = useState<BusinessTicketPurchase | null>(null);
  const [attendeeMenu, setAttendeeMenu] = useState<EventAttendee | null>(null);
  const [confirm, setConfirm] = useState<{ row: EventAttendee; to: "verified" | "pending" } | null>(
    null,
  );
  const [sendingId, setSendingId] = useState<string | null>(null);

  const event = eventQuery.data;
  const attendees = useMemo(() => attendeesQuery.data ?? [], [attendeesQuery.data]);
  const purchases = useMemo(() => purchasesQuery.data ?? [], [purchasesQuery.data]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([eventQuery.refetch(), attendeesQuery.refetch(), purchasesQuery.refetch()]);
    } finally {
      setRefreshing(false);
    }
  };

  const q = search.trim().toLowerCase();
  const orders = useMemo(
    () =>
      purchases.filter(
        (p) =>
          !q ||
          p.invoiceNumber?.toLowerCase().includes(q) ||
          p.user?.name?.toLowerCase().includes(q) ||
          p.user?.email?.toLowerCase().includes(q),
      ),
    [purchases, q],
  );
  const attendeeRows = useMemo(
    () => attendees.filter((a) => !q || a.user?.name?.toLowerCase().includes(q)),
    [attendees, q],
  );

  if (eventQuery.isPending) {
    return (
      <SafeAreaView edges={["top"]} style={[styles.flex, { backgroundColor: t.colors.background }]}>
        <ScreenHeader title="Manage event" />
        <Loader fullScreen message="Loading event..." />
      </SafeAreaView>
    );
  }
  if (!event) {
    const notFound =
      eventQuery.error instanceof ApiError && [403, 404].includes(eventQuery.error.status);
    return (
      <SafeAreaView edges={["top"]} style={[styles.flex, { backgroundColor: t.colors.background }]}>
        <ScreenHeader title="Manage event" />
        {notFound ? (
          <EmptyState
            icon="calendar"
            title="Event not found"
            message="It may have been removed, or it belongs to another business."
          />
        ) : (
          <ErrorState
            title="Couldn't load this event"
            error={eventQuery.error}
            onRetry={() => void onRefresh()}
            retrying={refreshing}
          />
        )}
      </SafeAreaView>
    );
  }

  const status = getEventStatus(event);
  const publicUrl = eventPublicUrl(event);
  const ticketDateLine = eventDateLine(event);
  const venue = eventLocationLine(event);

  const shareLink = async () => {
    if (!publicUrl) {
      showToast({ type: "info", message: "This event doesn't have a public link yet" });
      return;
    }
    await Share.share({ message: publicUrl, url: publicUrl });
  };

  const exportReport = async (kind: "csv" | "pdf") => {
    try {
      const report = buildSalesReport(event, purchases);
      await (kind === "csv" ? shareSalesReportCsv(report) : shareSalesReportPdf(report));
    } catch {
      showToast({ type: "error", message: "Couldn't create the sales report" });
    }
  };

  const eventActions: ActionSheetAction[] = [
    {
      label: "Edit event",
      icon: "edit-2",
      onPress: () => router.push({ pathname: "/dashboard/events/add-event", params: { id } }),
    },
    { label: "Share link", icon: "share-2", onPress: () => void shareLink() },
    ...(publicUrl
      ? [
          {
            label: "Preview",
            icon: "external-link" as const,
            onPress: () => void openInAppBrowser(publicUrl),
          },
        ]
      : []),
    ...(event.price_category === "paid"
      ? [
          {
            label: "Sales report (CSV)",
            icon: "file-text" as const,
            onPress: () => void exportReport("csv"),
          },
          {
            label: "Sales report (PDF)",
            icon: "file" as const,
            onPress: () => void exportReport("pdf"),
          },
        ]
      : []),
  ];

  const orderActions = (p: BusinessTicketPurchase): ActionSheetAction[] => [
    { label: "View Invoice", icon: "file-text", onPress: () => setInvoiceFor(p) },
    {
      label: "Share Invoice PDF",
      icon: "share",
      onPress: () =>
        void shareInvoicePdf({
          invoiceNumber: p.invoiceNumber,
          issuedOn: formatDate(p.createdAt),
          eventTitle: event.title,
          venue,
          dateLine: ticketDateLine,
          lines: p.items.map((i) => ({
            name: i.optionName,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
          serviceFee: p.serviceFee,
          surcharge: p.surcharge,
          promoCode: p.promoCode,
          total: p.totalAmount,
        }).catch(() => showToast({ type: "error", message: "Couldn't download invoice" })),
    },
    {
      label: "Send Invoice",
      icon: "send",
      detail: sendingId === p._id ? "Sending…" : undefined,
      disabled: sendingId === p._id,
      onPress: () => {
        setSendingId(p._id);
        sendInvoice.mutate(p._id, { onSettled: () => setSendingId(null) });
      },
    },
    {
      label: "Download Tickets",
      icon: "download",
      onPress: () =>
        void shareTicketPdf({
          title: event.title,
          dateLine: ticketDateLine,
          venue,
          holderName: purchaseBuyerName(p),
          codes: p.items.flatMap((i) =>
            i.uniqueKeys.map((key) => ({
              key,
              label: i.optionName,
              checkedIn: p.verifiedKeys.includes(key),
            })),
          ),
        }).catch(() => showToast({ type: "error", message: "Couldn't download tickets" })),
    },
  ];

  const isList = section === "orders" || section === "attendees";
  const listData: (BusinessTicketPurchase | EventAttendee)[] =
    section === "orders" ? orders : section === "attendees" ? attendeeRows : [];
  const checkedIn = attendeeRows.filter((a) => a.status === "verified").length;
  const listLoading = section === "orders" ? purchasesQuery.isPending : attendeesQuery.isPending;
  const listError = section === "orders" ? purchasesQuery.error : attendeesQuery.error;

  const header: ReactElement = (
    <View style={styles.headerStack}>
      <Card style={styles.eventCard}>
        {event.image ? (
          <RemoteImage uri={event.image} style={[styles.thumb, { borderRadius: t.radius.lg }]} />
        ) : null}
        <View style={styles.flex}>
          <Badge
            label={EVENT_STATUS_LABEL[status]}
            tone={EVENT_STATUS_TONE[status]}
            style={styles.badge}
          />
          <Text variant="h3" numberOfLines={2}>
            {event.title}
          </Text>
          <Text variant="caption" color="mutedForeground" numberOfLines={1}>
            {ticketDateLine}
          </Text>
          {!!venue && (
            <Text variant="caption" color="mutedForeground" numberOfLines={1}>
              {venue}
            </Text>
          )}
        </View>
      </Card>

      <ChipRow style={styles.chips}>
        {SECTIONS.map((s) => (
          <Chip
            key={s.key}
            label={s.label}
            selected={section === s.key}
            onPress={() => {
              setSection(s.key);
              setSearch("");
            }}
          />
        ))}
      </ChipRow>

      {section === "overview" && (
        <OverviewSection
          event={event}
          purchases={purchases}
          attendees={attendees}
          publicUrl={publicUrl}
          onShare={() => void shareLink()}
        />
      )}
      {section === "scanning" && <ScanningSection attendees={attendees} />}
      {section === "analytics" && (
        <AnalyticsSection event={event} purchases={purchases} attendees={attendees} />
      )}
      {section === "verify" && (
        <Card style={styles.card}>
          <Text variant="title">Verify Tickets</Text>
          <Text variant="bodySm" color="mutedForeground">
            Only tickets purchased or registered for this event will be accepted.
          </Text>
          <Button
            title="Scan tickets for this event"
            icon="maximize"
            onPress={() =>
              router.navigate({ pathname: "/dashboard/scan", params: { eventId: id } })
            }
          />
        </Card>
      )}
      {isList && (
        <View style={styles.listHeader}>
          {section === "attendees" && (
            <Text variant="label">
              Checked in: {checkedIn} / {attendeeRows.length}
            </Text>
          )}
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder={section === "orders" ? "Search invoice or buyer" : "Search by name"}
          />
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView edges={["top"]} style={[styles.flex, { backgroundColor: t.colors.background }]}>
      <ScreenHeader
        title="Manage event"
        right={
          <Button
            variant="ghost"
            size="icon"
            icon="more-vertical"
            accessibilityLabel="Event actions"
            onPress={() => setMenuOpen(true)}
          />
        }
      />
      <FlatList<BusinessTicketPurchase | EventAttendee>
        data={listData}
        keyExtractor={(item) => String(item._id)}
        ListHeaderComponent={header}
        renderItem={({ item }) =>
          section === "orders" ? (
            <OrderCard
              purchase={item as BusinessTicketPurchase}
              onPress={() => setOrderMenu(item as BusinessTicketPurchase)}
            />
          ) : (
            <AttendeeCard
              attendee={item as EventAttendee}
              onPress={() => setAttendeeMenu(item as EventAttendee)}
            />
          )
        }
        ItemSeparatorComponent={Separator}
        ListEmptyComponent={
          !isList ? null : listLoading ? (
            <Loader fullScreen={false} />
          ) : listError ? (
            <ErrorState
              title="Couldn't load this list"
              error={listError}
              onRetry={() => void onRefresh()}
              retrying={refreshing}
            />
          ) : (
            <EmptyState
              icon={section === "orders" ? "shopping-bag" : "users"}
              title={
                section === "orders"
                  ? q
                    ? "No orders match your search."
                    : "No orders yet."
                  : q
                    ? "No attendees match your search."
                    : "No ticket holders yet."
              }
            />
          )
        }
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={t.colors.primary}
            colors={[t.colors.primary]}
          />
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />

      <ActionSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={event.title}
        actions={eventActions}
      />
      <ActionSheet
        visible={!!orderMenu}
        onClose={() => setOrderMenu(null)}
        title={orderMenu ? `Order ${orderMenu.invoiceNumber}` : undefined}
        actions={orderMenu ? orderActions(orderMenu) : []}
      />
      <ActionSheet
        visible={!!attendeeMenu}
        onClose={() => setAttendeeMenu(null)}
        title={attendeeMenu?.user?.name || attendeeMenu?.uniqueKey}
        actions={
          attendeeMenu
            ? [
                attendeeMenu.status === "verified"
                  ? {
                      label: "Mark Pending",
                      icon: "rotate-ccw",
                      onPress: () => setConfirm({ row: attendeeMenu, to: "pending" }),
                    }
                  : {
                      label: "Mark Checked In",
                      icon: "check-circle",
                      onPress: () => setConfirm({ row: attendeeMenu, to: "verified" }),
                    },
              ]
            : []
        }
      />
      <ConfirmSheet
        visible={!!confirm}
        title="Change ticket status?"
        loading={setStatus.isPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (!confirm) return;
          setStatus.mutate(
            { code: confirm.row.uniqueKey, status: confirm.to },
            { onSettled: () => setConfirm(null) },
          );
        }}
      >
        {confirm && (
          <Text variant="body">
            Are you sure you want to change status of{" "}
            <Text variant="label">{confirm.row.user?.name || "this buyer"}</Text> to{" "}
            <Text variant="label">{statusLabel(confirm.to === "verified")}</Text>?
            {confirm.to === "pending" ? " Their checked-in date will be removed." : ""}
          </Text>
        )}
      </ConfirmSheet>
      <InvoiceSheet purchase={invoiceFor} onClose={() => setInvoiceFor(null)} />
    </SafeAreaView>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

function OrderCard({
  purchase: p,
  onPress,
}: {
  purchase: BusinessTicketPurchase;
  onPress: () => void;
}) {
  const verified = p.status === "verified";
  return (
    <Card style={styles.card}>
      <View style={styles.rowBetween}>
        <Text variant="label" numberOfLines={1} style={styles.flex}>
          {p.invoiceNumber}
        </Text>
        <Badge
          label={verified ? "Checked In" : "Pending"}
          tone={verified ? "success" : "warning"}
        />
      </View>
      <Text variant="bodySm" numberOfLines={1}>
        {purchaseBuyerName(p)}
        {p.user?.email && p.user?.name ? ` · ${p.user.email}` : ""}
      </Text>
      <Text variant="caption" color="mutedForeground">
        {purchaseItemsLine(p)}
      </Text>
      <View style={styles.rowBetween}>
        <Text variant="caption" color="mutedForeground">
          {formatDateTime(p.createdAt)}
        </Text>
        <Text variant="label">{formatPrice(p.totalAmount)}</Text>
      </View>
      <Button
        title="Actions"
        variant="outline"
        size="sm"
        icon="more-horizontal"
        onPress={onPress}
      />
    </Card>
  );
}

function AttendeeCard({ attendee: a, onPress }: { attendee: EventAttendee; onPress: () => void }) {
  const verified = a.status === "verified";
  return (
    <Card style={styles.card}>
      <View style={styles.rowBetween}>
        <Text variant="label" numberOfLines={1} style={styles.flex}>
          {a.user?.name || "N/A"}
        </Text>
        <Badge
          label={verified ? "Checked In" : "Not Checked In yet"}
          tone={verified ? "success" : "default"}
        />
      </View>
      <Text variant="caption" color="mutedForeground">
        {a.ticketType || "General"} · {a.uniqueKey}
      </Text>
      <Text variant="caption" color="mutedForeground">
        Checked in: {a.verifiedAt ? formatDateTime(a.verifiedAt) : "-"}
      </Text>
      <Button
        title={verified ? "Mark Pending" : "Mark Checked In"}
        variant="outline"
        size="sm"
        icon={verified ? "rotate-ccw" : "check-circle"}
        onPress={onPress}
      />
    </Card>
  );
}

function OverviewSection({
  event,
  purchases,
  attendees,
  publicUrl,
  onShare,
}: {
  event: BusinessEvent;
  purchases: BusinessTicketPurchase[];
  attendees: EventAttendee[];
  publicUrl: string | null;
  onShare: () => void;
}) {
  const s = summarizeSales(event, purchases);
  return (
    <View style={styles.headerStack}>
      <Card style={styles.card}>
        <Text variant="title">Share event</Text>
        <Text variant="bodySm" color="mutedForeground" numberOfLines={2}>
          {publicUrl ?? "No public link yet"}
        </Text>
        {!!publicUrl && (
          <Button title="Share link" icon="share-2" variant="outline" size="sm" onPress={onShare} />
        )}
      </Card>

      {event.price_category === "paid" ? (
        <>
          <Grid
            items={[
              {
                label: "Total Amount",
                value: formatPrice(s.totalAmount),
                icon: "dollar-sign" as const,
              },
              {
                label: "Capacity",
                value: `${s.ticketsSold}/${s.capacity ?? "∞"}`,
                icon: "users" as const,
              },
              { label: "Tickets Sold", value: String(s.ticketsSold), icon: "tag" as const },
              { label: "Orders", value: String(s.orders), icon: "shopping-bag" as const },
            ]}
            columns={2}
            keyExtractor={(k) => k.label}
            renderItem={(k) => <KpiTile label={k.label} value={k.value} icon={k.icon} />}
          />
          <Card style={styles.card}>
            <SummaryRow label="Your Earnings" value={formatPrice(s.earnings)} />
            <SummaryRow label="Service fee" value={formatPrice(s.serviceFee)} />
            <SummaryRow label="Surcharge" value={formatPrice(s.surcharge)} />
            <SummaryRow label="Total Amount" value={formatPrice(s.totalAmount)} bold />
          </Card>
          <Card style={styles.card}>
            <Text variant="title">Earnings by Ticket Type</Text>
            {s.byTicketType.length === 0 ? (
              <Text variant="bodySm" color="mutedForeground">
                No sales yet for any ticket type.
              </Text>
            ) : (
              s.byTicketType.map((r) => (
                <SummaryRow key={r.name} label={r.name} value={formatPrice(r.amount)} />
              ))
            )}
          </Card>
        </>
      ) : event.price_category === "external" ? (
        <Card style={styles.card}>
          <Text variant="title">External Ticketing</Text>
          <Text variant="bodySm" color="mutedForeground">
            Tickets for this event are sold on a third-party site — WHA does not track sales or
            earnings for it.
          </Text>
        </Card>
      ) : (
        <Card style={styles.card}>
          <Text variant="title">Registrations</Text>
          <Text variant="h2">{attendees.length}</Text>
          <Text variant="bodySm" color="mutedForeground">
            Free event — no earnings to track.
          </Text>
        </Card>
      )}
    </View>
  );
}

function ScanningSection({ attendees }: { attendees: EventAttendee[] }) {
  const checked = attendees.filter((a) => a.status === "verified").length;
  const byType = countByTicketType(attendees);
  return (
    <View style={styles.headerStack}>
      <Grid
        items={[
          { label: "Total Tickets", value: String(attendees.length), icon: "tag" as const },
          { label: "Checked In", value: String(checked), icon: "check-circle" as const },
          {
            label: "Not Checked In Yet",
            value: String(attendees.length - checked),
            icon: "clock" as const,
          },
        ]}
        columns={3}
        keyExtractor={(k) => k.label}
        renderItem={(k) => <KpiTile label={k.label} value={k.value} icon={k.icon} />}
      />
      <Card style={styles.card}>
        <Text variant="title">By ticket type</Text>
        {byType.length === 0 ? (
          <Text variant="bodySm" color="mutedForeground">
            No tickets yet.
          </Text>
        ) : (
          byType.map((r) => (
            <View key={r.ticketType} style={styles.typeRow}>
              <Text variant="label">{r.ticketType}</Text>
              <Text variant="caption" color="mutedForeground">
                Total {r.total} · Checked In {r.checkedIn} · Remaining {r.total - r.checkedIn}
              </Text>
            </View>
          ))
        )}
      </Card>
    </View>
  );
}

function AnalyticsSection({
  event,
  purchases,
  attendees,
}: {
  event: BusinessEvent;
  purchases: BusinessTicketPurchase[];
  attendees: EventAttendee[];
}) {
  if (event.price_category === "external") {
    return (
      <Card style={styles.card}>
        <Text variant="bodySm" color="mutedForeground">
          External ticketing events do not have in-app analytics.
        </Text>
      </Card>
    );
  }
  if (event.price_category !== "paid") {
    return (
      <Card style={styles.card}>
        <Text variant="title">Total registrations: {attendees.length}</Text>
      </Card>
    );
  }
  const revenue = new Map<string, number>();
  for (const p of purchases) {
    for (const i of p.items)
      revenue.set(i.optionName, (revenue.get(i.optionName) ?? 0) + i.unitPrice * i.quantity);
  }
  const options = event.options ?? [];
  return (
    <Card style={styles.card}>
      <Text variant="title">Ticket types</Text>
      {options.length === 0 ? (
        <Text variant="bodySm" color="mutedForeground">
          No ticket types configured.
        </Text>
      ) : (
        options.map((o) => {
          const capacity = o.capacity ?? null;
          const sold = o.sold ?? 0;
          return (
            <View key={String(o._id ?? o.name)} style={styles.typeRow}>
              <View style={styles.rowBetween}>
                <Text variant="label" style={styles.flex}>
                  {o.name}
                </Text>
                <Text variant="label">{formatPrice(revenue.get(o.name ?? "") ?? 0)}</Text>
              </View>
              <Text variant="caption" color="mutedForeground">
                {formatPrice(o.price)} · Capacity {capacity ?? "∞"} · Sold {sold} · Remaining{" "}
                {capacity ? Math.max(0, capacity - sold) : "∞"}
              </Text>
            </View>
          );
        })
      )}
    </Card>
  );
}

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.rowBetween}>
      <Text variant={bold ? "label" : "bodySm"} style={styles.flex}>
        {label}
      </Text>
      <Text variant={bold ? "label" : "bodySm"}>{value}</Text>
    </View>
  );
}

function InvoiceSheet({
  purchase: p,
  onClose,
}: {
  purchase: BusinessTicketPurchase | null;
  onClose: () => void;
}) {
  return (
    <BottomSheet
      visible={!!p}
      onClose={onClose}
      title={p ? `Invoice ${p.invoiceNumber}` : undefined}
    >
      {p && (
        <View style={styles.card}>
          <SummaryRow label="Buyer" value={purchaseBuyerName(p)} />
          <SummaryRow label="Date" value={formatDateTime(p.createdAt) ?? ""} />
          {p.items.map((i) => (
            <SummaryRow
              key={i.optionName}
              label={`${i.optionName} × ${i.quantity}`}
              value={formatPrice(i.unitPrice * i.quantity)}
            />
          ))}
          <SummaryRow label="Service fee" value={formatPrice(p.serviceFee)} />
          <SummaryRow label="Surcharge" value={formatPrice(p.surcharge)} />
          {!!p.promoCode && <SummaryRow label="Promo code" value={p.promoCode.toUpperCase()} />}
          <SummaryRow label="Total" value={formatPrice(p.totalAmount)} bold />
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: theme.spacing[6], paddingBottom: theme.spacing[8] },
  headerStack: { gap: theme.spacing[4], marginBottom: theme.spacing[4] },
  eventCard: { flexDirection: "row", gap: theme.spacing[3], alignItems: "flex-start" },
  thumb: { width: theme.sizes.thumbLg, height: theme.sizes.thumbLg },
  badge: { alignSelf: "flex-start", marginBottom: theme.spacing[1] },
  chips: { paddingHorizontal: theme.spacing[0] },
  card: { gap: theme.spacing[2] },
  listHeader: { gap: theme.spacing[3] },
  rowBetween: { flexDirection: "row", alignItems: "center", gap: theme.spacing[3] },
  typeRow: { gap: theme.spacing[0.5], paddingVertical: theme.spacing[1] },
  separator: { height: theme.spacing[3] },
});
