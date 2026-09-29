import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/api/queryKeys";
import { getTickets } from "@/api/tickets";
import { useIsCustomer } from "@/store/authStore";

/** The signed-in customer's tickets. Disabled (no request) when logged out. */
export function useTickets() {
  const isCustomer = useIsCustomer();
  return useQuery({
    queryKey: queryKeys.tickets,
    queryFn: getTickets,
    enabled: isCustomer,
  });
}
