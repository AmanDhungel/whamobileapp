import { Asset } from "expo-asset";
import { File } from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import QRCode from "qrcode";

import type { TicketCode } from "@/utils/tickets";
import { formatPrice } from "@/utils/format";

// On-device ticket / invoice PDFs. The backend has no PDF endpoint — the website builds
// these client-side with jsPDF (components/Dashboard/Ticket/TicketDetailPage.tsx and
// GuestTicketReceiptPage.tsx). Same content and layout here, rendered from HTML with
// expo-print and handed to the OS share sheet ("Save to Files", AirDrop, email…).
//
// Colours below are print colours for the PDF document itself (black text on white
// paper, like the web's jsPDF output), not app UI — the theme doesn't apply to paper.

const MM_TO_PT = 72 / 25.4;
/** Web ticket page: jsPDF({ unit: "mm", format: [100, 160] }). */
const TICKET_PAGE = { width: Math.round(100 * MM_TO_PT), height: Math.round(160 * MM_TO_PT) };
/** A4 invoice. */
const A4_PAGE = { width: 595, height: 842 };

const escapeHtml = (s: string | undefined | null) =>
  (s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );

let logoDataUri: Promise<string> | null = null;

/** WHA logo embedded as a data URI (expo-print can't load bundled assets by path). */
function getLogoDataUri(): Promise<string> {
  logoDataUri ??= (async () => {
    const asset = Asset.fromModule(require("../../assets/images/logo.png"));
    await asset.downloadAsync();
    const uri = asset.localUri ?? asset.uri;
    return `data:image/png;base64,${await new File(uri).base64()}`;
  })().catch((err: unknown) => {
    logoDataUri = null; // allow a retry next time
    throw err;
  });
  return logoDataUri;
}

/** QR as inline SVG — error-correction level "H", like the web's <QRCodeCanvas level="H">. */
function qrSvg(value: string, sizeMm: number): string {
  const qr = QRCode.create(value, { errorCorrectionLevel: "H" });
  const n = qr.modules.size;
  const quiet = 2;
  let path = "";
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (qr.modules.get(x, y)) path += `M${x + quiet} ${y + quiet}h1v1h-1z`;
    }
  }
  const box = n + quiet * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${box} ${box}" width="${sizeMm}mm" height="${sizeMm}mm" shape-rendering="crispEdges"><rect width="${box}" height="${box}" fill="#fff"/><path d="${path}" fill="#000"/></svg>`;
}

async function printAndShare(
  html: string,
  page: { width: number; height: number },
  fileName: string,
  dialogTitle: string,
): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html, width: page.width, height: page.height });
  // Give the file a meaningful name (web: "{slug}-ticket.pdf" / "invoice-{no}.pdf").
  const printed = new File(uri);
  let shareUri = uri;
  try {
    const target = new File(printed.parentDirectory, fileName);
    if (target.exists) target.delete();
    printed.rename(fileName);
    shareUri = printed.uri;
  } catch {
    // Keep the generated name if renaming isn't possible.
  }
  if (!(await Sharing.isAvailableAsync()))
    throw new Error("Sharing isn't available on this device.");
  await Sharing.shareAsync(shareUri, {
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf",
    dialogTitle,
  });
}

const safeName = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "ticket";

// ─── Ticket ─────────────────────────────────────────────────────────────────────

export interface TicketPdfData {
  title: string;
  /** e.g. "4 Oct 2025 · 7:00 PM" */
  dateLine?: string | null;
  venue?: string | null;
  holderName: string;
  codes: TicketCode[];
}

/** One 100×160 mm page per code: logo, title, date, venue, 60 mm QR, holder, label, code. */
export async function shareTicketPdf(data: TicketPdfData): Promise<void> {
  const logo = await getLogoDataUri();
  const pages = data.codes
    .map(
      (code, i) => `
      <section class="page">
        <img class="logo" src="${logo}" />
        <h1>${escapeHtml(data.title)}</h1>
        ${data.dateLine ? `<p>${escapeHtml(data.dateLine)}</p>` : ""}
        ${data.venue ? `<p>${escapeHtml(data.venue)}</p>` : ""}
        <div class="qr">${qrSvg(code.key, 60)}</div>
        <p class="holder">${escapeHtml(data.holderName)}</p>
        <p class="meta">Ticket ${i + 1} of ${data.codes.length} · ${escapeHtml(code.label)}</p>
        <p class="code">${escapeHtml(code.key)}</p>
      </section>`,
    )
    .join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8" />
  <style>
    @page { size: 100mm 160mm; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Helvetica, Arial, sans-serif; color: #000; }
    .page { position: relative; width: 100mm; height: 160mm; padding: 14mm 10mm 0; text-align: center; page-break-after: always; }
    .page:last-child { page-break-after: auto; }
    .logo { position: absolute; top: 6mm; right: 10mm; width: 12mm; }
    h1 { font-size: 14pt; margin: 4mm auto 3mm; max-width: 70mm; }
    p { font-size: 9pt; margin: 0 0 1.5mm; }
    .qr { margin: 5mm auto 3mm; width: 60mm; height: 60mm; }
    .holder { font-weight: bold; font-size: 10pt; }
    .meta { font-size: 8pt; }
    .code { font-family: Courier, monospace; font-size: 7pt; }
  </style></head><body>${pages}</body></html>`;

  await printAndShare(html, TICKET_PAGE, `${safeName(data.title)}-ticket.pdf`, "Download Ticket");
}

// ─── Invoice ────────────────────────────────────────────────────────────────────

export interface InvoicePdfData {
  invoiceNumber: string;
  /** Display date, e.g. "4 Oct 2025". */
  issuedOn?: string | null;
  eventTitle: string;
  venue?: string | null;
  dateLine?: string | null;
  lines: { name: string; quantity: number; unitPrice: number }[];
  serviceFee: number;
  surcharge: number;
  promoCode?: string;
  total: number;
}

/** A4 invoice: header, event block, Description/Qty/Amount table, fees, total, footnote. */
export async function shareInvoicePdf(data: InvoicePdfData): Promise<void> {
  const logo = await getLogoDataUri();
  // Amount column = unit price × quantity, exactly as the web invoice prints it.
  const rows = data.lines
    .map(
      (l) =>
        `<tr><td>${escapeHtml(l.name || "Ticket")}</td><td class="qty">${l.quantity}</td><td class="amt">${formatPrice(l.unitPrice * l.quantity)}</td></tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8" />
  <style>
    @page { size: A4; margin: 20mm 14mm; }
    body { font-family: Helvetica, Arial, sans-serif; color: #000; font-size: 10pt; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; }
    .logo { width: 22mm; }
    .inv { text-align: right; }
    .inv h1 { font-size: 18pt; margin: 0 0 2mm; }
    .event h2 { font-size: 13pt; margin: 10mm 0 1mm; }
    .muted { color: #666; margin: 0 0 1mm; }
    hr { border: 0; border-top: 1px solid #ccc; margin: 6mm 0; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; font-size: 9pt; color: #666; padding-bottom: 2mm; }
    td { padding: 1.5mm 0; }
    .qty { text-align: center; width: 20mm; }
    .amt { text-align: right; width: 30mm; }
    .sum td { padding: 1mm 0; }
    .total td { font-weight: bold; border-top: 1px solid #ccc; padding-top: 3mm; }
    .note { font-size: 8pt; color: #666; margin-top: 8mm; }
  </style></head><body>
    <div class="head">
      <img class="logo" src="${logo}" />
      <div class="inv">
        <h1>Invoice</h1>
        <div>Invoice #: ${escapeHtml(data.invoiceNumber)}</div>
        ${data.issuedOn ? `<div>${escapeHtml(data.issuedOn)}</div>` : ""}
      </div>
    </div>
    <div class="event">
      <h2>${escapeHtml(data.eventTitle)}</h2>
      ${data.venue ? `<p class="muted">${escapeHtml(data.venue)}</p>` : ""}
      ${data.dateLine ? `<p class="muted">${escapeHtml(data.dateLine)}</p>` : ""}
    </div>
    <hr />
    <table>
      <tr><th>Description</th><th class="qty">Qty</th><th class="amt">Amount</th></tr>
      ${rows}
    </table>
    <hr />
    <table class="sum">
      <tr><td>Service fee</td><td class="amt">${formatPrice(data.serviceFee)}</td></tr>
      <tr><td>Surcharge</td><td class="amt">${formatPrice(data.surcharge)}</td></tr>
      ${data.promoCode ? `<tr><td>Promo code</td><td class="amt">${escapeHtml(data.promoCode.toUpperCase())}</td></tr>` : ""}
      <tr class="total"><td>Total paid</td><td class="amt">${formatPrice(data.total)}</td></tr>
    </table>
    <p class="note">Service and processing fees are non-refundable.</p>
  </body></html>`;

  await printAndShare(
    html,
    A4_PAGE,
    `invoice-${safeName(data.invoiceNumber || "ticket")}.pdf`,
    "Download Invoice",
  );
}
