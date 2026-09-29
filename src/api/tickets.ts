import { apiRequest } from "./client";
import type { DataResponse, TicketItem } from "./types";

/**
 * GET /api/tickets (bearer) — deal redemptions + event registrations + event ticket
 * purchases, merged, unsorted. There is no single-ticket endpoint: the detail screen
 * finds its item in this list (same as the website).
 */
export async function getTickets(): Promise<TicketItem[]> {
  const res = await apiRequest<DataResponse<TicketItem[]>>("/api/tickets");
  return res.data ?? [];
}
