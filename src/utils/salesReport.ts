import type { BusinessEvent, BusinessTicketPurchase } from "@/api/types";

import { formatDateTime, formatPrice } from "./format";

// Event Sales Report — the web's ManageEventPage.tsx L398-594, computed client-side from
// the business's orders. Earnings exclude the service fee and card surcharge.

export interface TicketTypeSales {
  name: string;
  /** Current list price, or revenue / quantity when the option no longer exists. */
  price: number;
  quantity: number;
  promoUses: number;
  discount: number;
  revenue: number;
}

export interface PromoBuyerRow {
  buyer: string;
  code: string;
  ticketType: string;
  quantity: number;
  unitPrice: number;
}

export interface SalesReport {
  title: string;
  generatedAt: string;
  /** Σ ticketTotal — excludes service fee & surcharge. */
  totalEarnings: number;
  ticketTypes: TicketTypeSales[];
  totals: { quantity: number; promoUses: number; discount: number; revenue: number };
  promoBuyers: PromoBuyerRow[];
  /** "sales-report-my-event" (no extension). */
  fileBase: string;
}

export function buildSalesReport(
  event: BusinessEvent,
  purchases: BusinessTicketPurchase[],
): SalesReport {
  const listPrice = new Map((event.options ?? []).map((o) => [o.name ?? "", o.price ?? 0]));
  const byType = new Map<string, TicketTypeSales>();
  const promoBuyers: PromoBuyerRow[] = [];
  let totalEarnings = 0;

  for (const p of purchases) {
    totalEarnings += p.ticketTotal ?? 0;
    for (const item of p.items ?? []) {
      const row = byType.get(item.optionName) ?? {
        name: item.optionName,
        price: 0,
        quantity: 0,
        promoUses: 0,
        discount: 0,
        revenue: 0,
      };
      row.quantity += item.quantity;
      row.revenue += item.unitPrice * item.quantity;
      const base = listPrice.get(item.optionName);
      if (p.promoCode && base !== undefined && item.unitPrice < base) {
        row.discount += (base - item.unitPrice) * item.quantity;
        row.promoUses += item.quantity;
      }
      byType.set(item.optionName, row);
      if (p.promoCode) {
        promoBuyers.push({
          buyer: p.user?.name || p.user?.email || "N/A",
          code: p.promoCode.toUpperCase(),
          ticketType: item.optionName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        });
      }
    }
  }

  const ticketTypes = [...byType.values()].map((r) => ({
    ...r,
    price: listPrice.get(r.name) ?? (r.quantity ? r.revenue / r.quantity : 0),
  }));
  const totals = ticketTypes.reduce(
    (acc, r) => ({
      quantity: acc.quantity + r.quantity,
      promoUses: acc.promoUses + r.promoUses,
      discount: acc.discount + r.discount,
      revenue: acc.revenue + r.revenue,
    }),
    { quantity: 0, promoUses: 0, discount: 0, revenue: 0 },
  );

  return {
    title: event.title,
    generatedAt: formatDateTime(new Date().toISOString()) ?? "",
    totalEarnings,
    ticketTypes,
    totals,
    promoBuyers,
    fileBase: `sales-report-${event.title.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}`,
  };
}

const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
const line = (...cells: (string | number)[]) => cells.map(cell).join(",");

/** Same rows and order as the web's CSV export. */
export function salesReportCsv(r: SalesReport): string {
  const rows: string[] = [
    line("Sales Report", r.title),
    line("Generated", r.generatedAt),
    "",
    line("Total Earnings (excl. service fee & surcharge)", formatPrice(r.totalEarnings)),
    "",
    line("Earnings by Ticket Type"),
    line(
      "Ticket Type",
      "Price Per Ticket",
      "Tickets Sold",
      "Promo Uses",
      "Discount Given",
      "Earnings",
    ),
    ...r.ticketTypes.map((t) =>
      line(
        t.name,
        formatPrice(t.price),
        t.quantity,
        t.promoUses,
        formatPrice(t.discount),
        formatPrice(t.revenue),
      ),
    ),
    line(
      "Total",
      "",
      r.totals.quantity,
      r.totals.promoUses,
      formatPrice(r.totals.discount),
      formatPrice(r.totalEarnings),
    ),
    "",
    line("Buyers Who Used a Promo Code"),
    line("Buyer", "Promo Code", "Ticket Type", "Quantity", "Price"),
    ...(r.promoBuyers.length
      ? r.promoBuyers.map((b) =>
          line(b.buyer, b.code, b.ticketType, b.quantity, formatPrice(b.unitPrice)),
        )
      : [line("—", "—", "—", 0, formatPrice(0))]),
  ];
  return rows.join("\n");
}
