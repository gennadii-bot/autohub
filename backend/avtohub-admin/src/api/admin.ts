import { api } from "./api";
import type { AdminCatalogItem, AdminStats, AdminStoRequest } from "../types/admin";

export interface AnalyticsPoint {
  date: string;
  count: number;
}

export interface AnalyticsRangePoint {
  date: string;
  users?: number;
  bookings?: number;
  bookings_completed?: number;
  stos?: number;
  revenue?: number;
  average_rating?: number;
}

export interface AnalyticsKpi {
  current_total: number;
  comparison_total: number;
  delta_percent: number;
}

export interface AnalyticsByCity {
  name: string;
  value: number;
}

export type AnalyticsByCityRaw = AnalyticsByCity[] | Record<string, number>;

export type AnalyticsCurrentRaw =
  | AnalyticsRangePoint[]
  | Record<string, unknown>;

export interface AnalyticsResponse {
  current?: AnalyticsCurrentRaw;
  comparison?: AnalyticsCurrentRaw;
  grouped_data?: AnalyticsRangePoint[];
  by_city?: AnalyticsByCityRaw;
  kpi?: {
    users: AnalyticsKpi;
    bookings: AnalyticsKpi;
    stos: AnalyticsKpi;
    revenue: AnalyticsKpi;
  };
}

export async function getAnalytics(
  params: {
    from: string;
    to: string;
    compare_from?: string;
    compare_to?: string;
    city_id?: number;
    sto_id?: number;
    group_by?: "day" | "week" | "month";
  }
): Promise<AnalyticsRangePoint[] | AnalyticsResponse> {
  const requestParams: Record<string, string | number> = {
    from: params.from,
    to: params.to,
    group_by: params.group_by ?? "day",
  };
  if (params.city_id != null && params.city_id > 0) {
    requestParams.city_id = params.city_id;
  }
  if (params.sto_id != null && params.sto_id > 0) {
    requestParams.sto_id = params.sto_id;
  }
  if (params.compare_from) {
    requestParams.compare_from = params.compare_from;
  }
  if (params.compare_to) {
    requestParams.compare_to = params.compare_to;
  }

  const { data } = await api.get<AnalyticsRangePoint[] | AnalyticsResponse>("/admin/analytics", {
    params: requestParams,
  });

  // eslint-disable-next-line no-console
  console.log("[Dashboard] GET /admin/analytics response:", data);

  return data as AnalyticsRangePoint[] | AnalyticsResponse;
}

/** @deprecated Use getAnalytics */
export async function getAnalyticsRange(
  fromDate: string,
  toDate: string
): Promise<AnalyticsRangePoint[]> {
  const data = await getAnalytics({ from: fromDate, to: toDate });
  const resp = data as AnalyticsResponse;
  return Array.isArray(resp?.current) ? resp.current : [];
}

export async function getAdminStats(): Promise<AdminStats> {
  const { data } = await api.get<{
    success: boolean;
    data: AdminStats | Record<string, unknown>;
  }>("/admin/stats");
  const raw = data?.data;
  if (!raw) {
    return { users_count: 0, stos_count: 0, pending_requests: 0, completed_services: 0, average_rating: 0 };
  }
  const r = raw as Record<string, unknown>;
  return {
    users_count: Number(r.users_total ?? r.users_count ?? 0),
    stos_count: Number(r.stos_total ?? r.stos_count ?? 0),
    pending_requests: Number(r.pending_requests ?? 0),
    completed_services: Number(r.bookings_completed ?? r.completed_services ?? 0),
    average_rating: Number(r.average_rating ?? 0),
  };
}

export interface StoRequestsListResponse {
  items: AdminStoRequest[];
  total: number;
  page: number;
  per_page: number;
}

export async function getStoRequests(params?: {
  status?: string;
  page?: number;
  per_page?: number;
}): Promise<StoRequestsListResponse> {
  const { data } = await api.get<{ success: boolean; data: StoRequestsListResponse }>(
    "/admin/sto-requests",
    { params: params ?? {} }
  );
  return data?.data ?? { items: [], total: 0, page: 1, per_page: 20 };
}

export async function getStoRequestDetail(id: string): Promise<AdminStoRequest | null> {
  const { data } = await api.get<AdminStoRequest>(`/admin/sto-requests/${id}`);
  return data ?? null;
}

export async function approveStoRequest(id: string): Promise<{ message: string }> {
  const { data } = await api.post<{ message: string }>(
    `/admin/sto-requests/${id}/approve`
  );
  return data ?? { message: "Заявка одобрена" };
}

export async function rejectStoRequest(
  id: string,
  reason?: string
): Promise<{ message?: string }> {
  const { data } = await api.post<{ message?: string }>(
    `/admin/sto-requests/${id}/reject`,
    { reason: reason ?? null }
  );
  return data ?? {};
}

export async function approveSto(id: number): Promise<{ success: boolean; message: string }> {
  const { data } = await api.patch<{ success: boolean; message: string }>(
    `/admin/sto/${id}/approve`
  );
  return data ?? { success: true, message: "Заявка одобрена" };
}

export async function rejectSto(id: number): Promise<{ success: boolean; message: string }> {
  const { data } = await api.patch<{ success: boolean; message: string }>(
    `/admin/sto/${id}/reject`
  );
  return data ?? { success: true, message: "Заявка отклонена" };
}

export async function getUserDetail(userId: number) {
  const { data } = await api.get(`/admin/users/${userId}`);
  return data;
}

export async function getStoDetail(stoId: number) {
  const { data } = await api.get(`/admin/sto/${stoId}`);
  return data;
}

export async function getStoAnalytics(stoId: number, period: 7 | 30 | 90 | 365 = 30) {
  const { data } = await api.get(`/admin/sto/${stoId}/analytics`, {
    params: { period },
  });
  return data;
}

export async function getAdminCatalog(): Promise<AdminCatalogItem[]> {
  const { data } = await api.get<{ success: boolean; data: AdminCatalogItem[] }>("/admin/services");
  const list = data?.data;
  return Array.isArray(list) ? list : [];
}

export async function createCatalogItem(body: {
  name: string;
  category: string;
  description?: string | null;
  is_active?: boolean;
}): Promise<AdminCatalogItem> {
  const { data } = await api.post<AdminCatalogItem>("/admin/services", body);
  return data!;
}

export async function updateCatalogItem(
  id: number,
  body: { name?: string; category?: string; description?: string | null; is_active?: boolean }
): Promise<AdminCatalogItem> {
  const { data } = await api.patch<AdminCatalogItem>(`/admin/services/${id}`, body);
  return data!;
}

export async function deleteCatalogItem(id: number): Promise<void> {
  await api.delete(`/admin/services/${id}`);
}
