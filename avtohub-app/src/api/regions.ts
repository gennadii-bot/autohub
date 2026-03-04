import { api } from "./api";

export interface Region {
  id: number;
  name: string;
}

export async function getRegions(): Promise<Region[]> {
  const { data } = await api.get<Region[]>("/regions");
  return data ?? [];
}
