import { api } from "./api";

export interface City {
  id: number;
  name: string;
  region_id: number;
  region: string;
}

export interface GeoCityResponse {
  city_id: number;
}

/** Legacy: get city_id by coordinates (POST). */
export async function getCityByCoords(lat: number, lng: number): Promise<number> {
  const { data } = await api.post<GeoCityResponse>("/geo/city", { lat, lng });
  return data.city_id;
}

/** Reverse geocode: get full city by coordinates (GET). Returns null on 404. */
export async function reverseGeocode(lat: number, lng: number): Promise<City | null> {
  try {
    const { data } = await api.get<City>("/geo/reverse", { params: { lat, lng } });
    return data;
  } catch (err) {
    if (err && typeof err === "object" && "response" in err) {
      const res = (err as { response?: { status?: number } }).response;
      if (res?.status === 404) return null;
    }
    throw err;
  }
}
