import { api } from "./api";
import type { AdminStats, AdminStoRequest } from "../types/admin";

export type { AdminStats, AdminStoRequest } from "../types/admin";

export async function getAdminStats(): Promise<AdminStats> {
  const { data } = await api.get<AdminStats>("/admin/stats");
  return data ?? { users_count: 0, stos_count: 0, pending_requests_count: 0 };
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
