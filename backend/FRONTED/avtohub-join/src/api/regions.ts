import { api } from "./api";

export interface Region {
  id: number;
  name: string;
}

export interface City {
  id: number;
  name: string;
}

export async function getRegions(): Promise<Region[]> {
  const { data } = await api.get<Region[]>("/regions");
  return data ?? [];
}

export async function getCitiesByRegion(regionId: number): Promise<City[]> {
  const { data } = await api.get<City[]>(`/regions/${regionId}/cities`);
  return data ?? [];
}
