import { useState } from "react";
import { StyleSheet, View } from "react-native";

import {
  shareInvoicePdf,
  shareTicketPdf,
  type InvoicePdfData,
  type TicketPdfData,
} from "@/services/pdf";
import { theme } from "@/theme";

import { Button } from "../Button";
import { showToast } from "../Toast";

export interface TicketDownloadButtonsProps {
  ticket: TicketPdfData;
  /** Paid purchases only (web shows "Download Invoice" only when there's an invoice number). */
  invoice?: InvoicePdfData | null;
}

/** "Download Ticket" / "Download Invoice" — PDFs built on-device, then the OS share sheet. */
export function TicketDownloadButtons({ ticket, invoice }: TicketDownloadButtonsProps) {
  const [busy, setBusy] = useState<"ticket" | "invoice" | null>(null);

  const run = async (kind: "ticket" | "invoice") => {
    if (busy) return;
    setBusy(kind);
    try {
      if (kind === "ticket") await shareTicketPdf(ticket);
      else if (invoice) await shareInvoicePdf(invoice);
    } catch {
      showToast({
        type: "error",
        message: kind === "ticket" ? "Couldn't download ticket" : "Couldn't download invoice",
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.row}>
      <Button
        title="Download Ticket"
        icon="download"
        variant="outline"
        fullWidth={false}
        style={styles.flex}
        disabled={!ticket.codes.length || (!!busy && busy !== "ticket")}
        loading={busy === "ticket"}
        onPress={() => void run("ticket")}
      />
      {invoice && (
        <Button
          title="Download Invoice"
          icon="file-text"
          variant="outline"
          fullWidth={false}
          style={styles.flex}
          disabled={!!busy && busy !== "invoice"}
          loading={busy === "invoice"}
          onPress={() => void run("invoice")}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: theme.spacing[3] },
  flex: { flex: 1 },
});
