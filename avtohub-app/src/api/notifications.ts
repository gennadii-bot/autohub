import { api } from "./api";

export interface Notification {
  id: number;
  title: string;
  message: string | null;
  type?: string;
  is_read: boolean;
  created_at: string;
}

export async function getNotifications(unreadOnly = false): Promise<Notification[]> {
  const { data } = await api.get<Notification[]>("/notifications", {
    params: unreadOnly ? { unread_only: true } : undefined,
  });
  return data ?? [];
}

export async function getNotificationsUnreadCount(): Promise<number> {
  const { data } = await api.get<{ count: number }>("/notifications/unread/count");
  return data?.count ?? 0;
}

/** Mark all notifications as read. Call when user opens the dropdown — badge disappears immediately. */
export async function markAllNotificationsRead(): Promise<void> {
  await api.patch("/notifications/mark-all-read");
}
