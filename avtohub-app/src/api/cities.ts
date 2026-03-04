import { api } from "./api";

export interface City {
  id: number;
  name: string;
  region_id: number;
  region: string;
}

export async function getCities(regionId?: number): Promise<City[]> {
  const params = regionId != null ? { region_id: regionId } : undefined;
  const { data } = await api.get<City[]>("/cities", { params });
  return data ?? [];
}

export async function getCityById(id: number): Promise<City | null> {
  try {
    const { data } = await api.get<City>(`/cities/${id}`);
    return data;
  } catch (err) {
    if (err && typeof err === "object" && "response" in err) {
      const res = (err as { response?: { status?: number } }).response;
      if (res?.status === 404) return null;
    }
    throw err;
  }
}
