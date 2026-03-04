import { api } from "./api";

export interface ChatMessage {
  id: number;
  sender_id: number;
  receiver_id: number;
  message: string;
  message_type?: "text" | "image" | "voice";
  created_at: string | null;
  is_read: boolean;
  is_mine: boolean;
}

export async function getChat(bookingId: number): Promise<ChatMessage[]> {
  const { data } = await api.get<ChatMessage[]>(`/chat/${bookingId}`);
  return data ?? [];
}

export async function sendMessage(bookingId: number, message: string): Promise<ChatMessage> {
  const { data } = await api.post<ChatMessage>(`/chat/${bookingId}`, { message });
  return data;
}

export async function markChatRead(bookingId: number): Promise<{ marked: number }> {
  const { data } = await api.patch<{ marked: number }>(`/chat/${bookingId}/read`);
  return data;
}

export async function uploadChatImage(bookingId: number, file: File): Promise<ChatMessage> {
  const fd = new FormData();
  fd.append("file", file);
  const { data } = await api.post<ChatMessage>(`/chat/${bookingId}/upload`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function uploadChatVoice(bookingId: number, file: File): Promise<ChatMessage> {
  const fd = new FormData();
  fd.append("file", file);
  const { data } = await api.post<ChatMessage>(`/chat/${bookingId}/voice`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function getChatUnreadCount(): Promise<number> {
  const { data } = await api.get<{ count: number }>("/chat/unread/count");
  return data?.count ?? 0;
}
