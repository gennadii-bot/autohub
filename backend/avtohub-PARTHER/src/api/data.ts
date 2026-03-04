import { api } from "./api";
import type {
  AdminUser,
  AdminSto,
  CatalogItem,
  AdminBooking,
  AdminReview,
} from "../types/admin";

interface UsersResponse {
  items: AdminUser[];
  total: number;
  page: number;
  per_page: number;
}

interface AdminStoItem {
  id: number;
  name: string;
  city_id: number;
  city_name?: string;
  address: string;
  status: string;
  rating: number;
}

interface StosResponse {
  items: AdminStoItem[];
  total: number;
  page: number;
  per_page: number;
}

export async function getUsers(
  page = 1,
  perPage = 20,
  search?: string,
  role?: string
): Promise<{ items: AdminUser[]; total: number }> {
  try {
    const { data } = await api.get<UsersResponse>("/admin/users", {
      params: { page, per_page: perPage, search, role },
    });
    return {
      items: data?.items ?? [],
      total: data?.total ?? 0,
    };
  } catch {
    return { items: [], total: 0 };
  }
}

export async function getStos(
  page = 1,
  perPage = 50,
  search?: string,
  status?: string
): Promise<{ items: AdminSto[]; total: number }> {
  try {
    const { data } = await api.get<StosResponse>("/admin/stos", {
      params: { page, per_page: perPage, search, status },
    });
    return {
      items: (data?.items ?? []).map((s: AdminStoItem) => ({
        id: s.id,
        name: s.name,
        city: { id: s.city_id, name: s.city_name ?? "" },
        address: s.address,
        status: s.status ?? "active",
        rating: s.rating,
      })),
      total: data?.total ?? 0,
    };
  } catch {
    return { items: [], total: 0 };
  }
}

export async function getCatalog(): Promise<CatalogItem[]> {
  try {
    const { data } = await api.get<CatalogItem[]>("/services/catalog");
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getBookings(stoId?: number, limit = 500): Promise<AdminBooking[]> {
  try {
    const { data } = await api.get<AdminBooking[]>("/admin/bookings", {
      params: { sto_id: stoId, limit },
    });
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getReviews(stoId?: number, limit = 500): Promise<AdminReview[]> {
  try {
    const { data } = await api.get<AdminReview[]>("/admin/reviews", {
      params: { sto_id: stoId, limit },
    });
    return data ?? [];
  } catch {
    return [];
  }
}
