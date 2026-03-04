import { api } from "./api";
import type { AdminStats, AdminStoRequest } from "../types/admin";

export interface AnalyticsPoint {
  date: string;
  count: number;
}

export async function getAdminStats(): Promise<AdminStats> {
  const { data } = await api.get<AdminStats>("/admin/stats");
  return data ?? { users_count: 0, stos_count: 0, pending_requests: 0, completed_services: 0, average_rating: 0 };
}

export async function getAnalytics(
  type: "users" | "stos" | "services",
  period: 7 | 30 | 90 | 365 = 30
): Promise<AnalyticsPoint[]> {
  const { data } = await api.get<AnalyticsPoint[]>("/admin/analytics", {
    params: { type, period },
  });
  return data ?? [];
}

export async function getStoRequests(): Promise<AdminStoRequest[]> {
  const { data } = await api.get<AdminStoRequest[]>("/admin/sto-requests");
  return data ?? [];
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

export async function getStoServices(stoId: number) {
  const { data } = await api.get(`/admin/sto/${stoId}/services`);
  return data ?? [];
}
