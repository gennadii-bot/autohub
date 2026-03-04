import { api } from "./api";

export interface CatalogItem {
  id: number;
  name: string;
  category: string;
}

export interface StoServiceItem {
  service_id: number;
  price: number;
  is_active: boolean;
}

export interface StoServiceItemUpdate {
  service_id: number;
  price: number;
  is_active: boolean;
}

export async function getCatalog(): Promise<CatalogItem[]> {
  const { data } = await api.get<CatalogItem[]>("/services/catalog");
  return data ?? [];
}

export async function getStoServices(stoId: number): Promise<StoServiceItem[]> {
  const { data } = await api.get<StoServiceItem[]>(`/sto/my/${stoId}/services`);
  return data ?? [];
}

export async function updateStoServices(
  stoId: number,
  items: StoServiceItemUpdate[]
): Promise<StoServiceItem[]> {
  const { data } = await api.put<StoServiceItem[]>(`/sto/my/${stoId}/services`, items);
  return data ?? [];
}
