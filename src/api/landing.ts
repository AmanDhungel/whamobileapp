import { apiRequest } from "./client";
import type { DataResponse, LandingData } from "./types";

/** GET /api/landing?city= — home page data. `city` null/empty = all of Australia. */
export async function getLanding(city: string | null): Promise<LandingData> {
  const res = await apiRequest<DataResponse<LandingData>>("/api/landing", {
    query: { city: city ?? undefined },
  });
  return res.data;
}
