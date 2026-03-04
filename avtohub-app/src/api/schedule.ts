import { api } from "./api";

export interface ScheduleItem {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_working: boolean;
}

export async function getStoSchedule(stoId: number): Promise<ScheduleItem[]> {
  const { data } = await api.get<ScheduleItem[]>(`/sto/${stoId}/schedule`);
  return data ?? [];
}

export async function getMyStoSchedule(
  stoId: number
): Promise<ScheduleItem[]> {
  const { data } = await api.get<ScheduleItem[]>(`/sto/my/${stoId}/schedule`);
  return data ?? [];
}

export async function updateMyStoSchedule(
  stoId: number,
  items: ScheduleItem[]
): Promise<ScheduleItem[]> {
  const { data } = await api.put<ScheduleItem[]>(
    `/sto/my/${stoId}/schedule`,
    items
  );
  return data ?? [];
}
