import { api } from "./api";

export interface StoSettings {
  max_parallel_bookings: number;
}

export async function updateStoSettings(
  stoId: number,
  payload: StoSettings
): Promise<StoSettings> {
  const { data } = await api.patch<StoSettings>(
    `/sto/my/${stoId}/settings`,
    payload
  );
  return data ?? payload;
}
