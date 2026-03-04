import { api } from "./api";

export interface MySto {
  id: number;
  name: string;
  city_id: number;
  city_name: string;
  address: string;
  status: string;
  max_parallel_bookings?: number;
  created_at: string;
}

export async function getMyStos(): Promise<MySto[]> {
  const { data } = await api.get<MySto[]>("/sto/my");
  return data ?? [];
}

export async function getMySto(id: number): Promise<MySto> {
  const { data } = await api.get<MySto>(`/sto/my/${id}`);
  return data as MySto;
}
