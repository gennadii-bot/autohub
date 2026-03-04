/**
 * API for admin data endpoints.
 * Some endpoints may need to be added to the backend.
 */

import { api } from "./api";
import type {
  AdminUser,
  CatalogItem,
  AdminBooking,
  AdminReview,
} from "../types/admin";

export interface UsersListResponse {
  items: AdminUser[];
  total: number;
  page: number;
  per_page: number;
}

export async function getUsers(
  page = 1,
  perPage = 50
): Promise<UsersListResponse> {
  const { data } = await api.get<{ success: boolean; data: UsersListResponse }>(
    "/admin/users",
    { params: { page, per_page: perPage } }
  );
  return data?.data ?? { items: [], total: 0, page: 1, per_page: perPage };
}

export interface AdminStoListItem {
  id: number;
  name: string;
  address: string;
  status: string;
  rating: number;
  city_id: number;
  city_name?: string;
  owner_id?: number;
  created_at?: string;
}

export interface AdminStosResponse {
  items: AdminStoListItem[];
  total: number;
  page: number;
  per_page: number;
}

export async function getStos(page = 1, perPage = 50): Promise<{
  items: Array<{
    id: number;
    name: string;
    city: { id: number; name: string };
    address: string;
    status: string;
    rating: number;
  }>;
  total: number;
}> {
  const { data } = await api.get<{ success: boolean; data: AdminStosResponse }>(
    "/admin/stos",
    { params: { page, per_page: perPage } }
  );
  const payload = data?.data;
  const items = payload?.items ?? [];
  const total = payload?.total ?? 0;
  return {
    items: items.map((s) => ({
      id: s.id,
      name: s.name,
      city: { id: s.city_id, name: s.city_name ?? "" },
      address: s.address,
      status: s.status,
      rating: s.rating,
    })),
    total,
  };
}

export async function getCatalog(): Promise<CatalogItem[]> {
  try {
    const { data } = await api.get<CatalogItem[]>("/services/catalog");
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getBookings(params?: {
  date_from?: string;
  date_to?: string;
  sto_id?: number;
  status?: string;
  limit?: number;
}): Promise<AdminBooking[]> {
  try {
    const { data } = await api.get<{ success: boolean; data: AdminBooking[] }>("/admin/bookings", {
      params: params ?? {},
    });
    const list = data?.data;
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function getReviews(): Promise<AdminReview[]> {
  try {
    const { data } = await api.get<{ success: boolean; data: AdminReview[] }>("/admin/reviews");
    const list = data?.data;
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export interface CityItem {
  id: number;
  name: string;
  region_id?: number;
}

export async function getCities(regionId?: number): Promise<CityItem[]> {
  try {
    const { data } = await api.get<CityItem[]>("/cities", {
      params: regionId ? { region_id: regionId } : {},
    });
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
