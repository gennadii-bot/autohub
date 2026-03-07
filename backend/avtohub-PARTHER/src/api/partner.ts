import { api } from "./axios";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

/** Build full media URL from relative path (chat images, voice). */
export function getMediaUrl(relativeUrl: string | null | undefined): string {
  if (!relativeUrl) return "";
  if (relativeUrl.startsWith("http")) return relativeUrl;
  const base = API_BASE.replace(/\/$/, "");
  const path = relativeUrl.startsWith("/") ? relativeUrl : `/${relativeUrl}`;
  return `${base}${path}`;
}

export interface PartnerDashboard {
  total_bookings: number;
  completed: number;
  cancelled: number;
  revenue: number;
  average_rating: number;
}

export interface PartnerBookingClient {
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  car_brand?: string | null;
  car_model?: string | null;
  car_year?: number | null;
}

export interface PartnerBooking {
  id: number;
  client_id: number;
  client_email: string;
  client?: PartnerBookingClient | null;
  sto_id: number;
  sto_name: string;
  service_id: number;
  service_name: string;
  date: string;
  time: string;
  status: string;
  price?: number;
  created_at: string;
}

export interface PartnerServiceItem {
  id: number;
  service_id: number;
  name: string;
  category: string;
  price: number;
  duration_minutes: number;
  is_active: boolean;
}

export interface PartnerCatalogItem {
  id: number;
  name: string;
  category: string;
}

export interface PartnerStoItem {
  id: number;
  name: string;
  address: string;
  city_name: string;
}

export interface PartnerAnalytics {
  chart: Array<{ date: string; bookings: number; revenue: number }>;
  popular_services: Array<{ service_name: string; count: number }>;
  total_revenue: number;
}

export async function getPartnerDashboard(): Promise<PartnerDashboard> {
  const { data } = await api.get<PartnerDashboard>("/partner/dashboard");
  return data!;
}

export async function getPartnerBookings(): Promise<PartnerBooking[]> {
  const { data } = await api.get<PartnerBooking[]>("/partner/bookings");
  return data ?? [];
}

export async function updateBookingStatus(
  bookingId: number,
  status: string
): Promise<PartnerBooking> {
  const { data } = await api.patch<PartnerBooking>(
    `/partner/bookings/${bookingId}/status`,
    { status }
  );
  return data!;
}

export async function getPartnerStos(): Promise<PartnerStoItem[]> {
  const { data } = await api.get<PartnerStoItem[]>("/partner/stos");
  return data ?? [];
}

export async function getPartnerServices(stoId: number): Promise<PartnerServiceItem[]> {
  const { data } = await api.get<PartnerServiceItem[]>("/partner/services", {
    params: { sto_id: stoId },
  });
  return data ?? [];
}

export async function updatePartnerServices(
  stoId: number,
  items: Array<{ service_id: number; price: number; duration_minutes?: number; is_active?: boolean }>
): Promise<PartnerServiceItem[]> {
  const { data } = await api.put<PartnerServiceItem[]>("/partner/services", items, {
    params: { sto_id: stoId },
  });
  return data ?? [];
}

export async function getPartnerAnalytics(
  period: number = 30
): Promise<PartnerAnalytics> {
  const { data } = await api.get<PartnerAnalytics>("/partner/analytics", {
    params: { period },
  });
  return data!;
}

export interface AnalyticsRangePoint {
  date: string;
  bookings: number;
  completed: number;
  revenue: number;
}

export interface PartnerAnalyticsFull {
  chart: AnalyticsRangePoint[];
  kpi: {
    bookings_total: number;
    completed: number;
    revenue: number;
    average_rating: number;
  };
  top_services: Array<{
    service_name: string;
    bookings_count: number;
    revenue: number;
  }>;
}

export async function getPartnerAnalyticsRange(
  fromDate: string,
  toDate: string,
  groupBy: "day" | "week" | "month" = "day"
): Promise<PartnerAnalyticsFull> {
  const { data } = await api.get<PartnerAnalyticsFull>("/partner/analytics", {
    params: { from: fromDate, to: toDate, group_by: groupBy },
  });
  return data ?? { chart: [], kpi: { bookings_total: 0, completed: 0, revenue: 0, average_rating: 0 }, top_services: [] };
}

export async function getPartnerCatalogServices(): Promise<PartnerCatalogItem[]> {
  const { data } = await api.get<PartnerCatalogItem[]>("/partner/catalog-services");
  return data ?? [];
}

export async function addPartnerService(
  stoId: number,
  body: { service_id: number; price: number; duration_minutes?: number; is_active?: boolean }
): Promise<PartnerServiceItem> {
  const { data } = await api.post<PartnerServiceItem>("/partner/services", body, {
    params: { sto_id: stoId },
  });
  return data!;
}

export async function updatePartnerService(
  serviceId: number,
  body: { price?: number; duration_minutes?: number; is_active?: boolean }
): Promise<PartnerServiceItem> {
  const { data } = await api.patch<PartnerServiceItem>(`/partner/services/${serviceId}`, body);
  return data!;
}

export async function deletePartnerService(serviceId: number): Promise<void> {
  await api.delete(`/partner/services/${serviceId}`);
}

export interface PartnerProfile {
  id: number;
  email: string;
  role: string;
  city_id: number | null;
  created_at: string;
  sto_id?: number | null;
  sto_name?: string | null;
  sto_phone?: string | null;
  sto_address?: string | null;
  sto_description?: string | null;
  sto_image_url?: string | null;
  sto_region?: string | null;
  sto_city?: string | null;
  sto_owner_initials?: string | null;
  sto_images?: Array<{ id: number; image_url: string }>;
}

export interface PartnerProfileUpdate {
  city_id?: number | null;
  sto_name?: string | null;
  sto_phone?: string | null;
  sto_address?: string | null;
  sto_description?: string | null;
  sto_image_url?: string | null;
  sto_region?: string | null;
  sto_city?: string | null;
  sto_owner_initials?: string | null;
}

export async function getPartnerProfile(): Promise<PartnerProfile> {
  const { data } = await api.get<PartnerProfile>("/partner/profile");
  return data!;
}

export async function updatePartnerProfile(body: PartnerProfileUpdate): Promise<PartnerProfile> {
  const { data } = await api.patch<PartnerProfile>("/partner/profile", body);
  return data!;
}

export interface PartnerChatDialog {
  booking_id: number;
  client_name: string;
  client_email: string;
  client_phone: string;
  service_name: string;
  booking_date: string;
  booking_time: string;
  status: string;
  sto_name: string;
  last_message: string;
  last_message_at: string | null;
  unread_count: number;
}

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

export async function getPartnerChats(): Promise<PartnerChatDialog[]> {
  const { data } = await api.get<PartnerChatDialog[]>("/partner/chats");
  return data ?? [];
}

export async function markPartnerChatRead(bookingId: number): Promise<void> {
  await api.patch(`/partner/chats/${bookingId}/read`);
}

export async function getChatMessages(bookingId: number): Promise<ChatMessage[]> {
  const { data } = await api.get<ChatMessage[]>(`/chat/${bookingId}`);
  return data ?? [];
}

export async function getChatUnreadCount(): Promise<number> {
  const { data } = await api.get<{ count: number }>("/chat/unread/count");
  return data?.count ?? 0;
}

export async function sendChatMessage(
  bookingId: number,
  message: string
): Promise<ChatMessage> {
  const { data } = await api.post<ChatMessage>(`/chat/${bookingId}`, {
    message,
  });
  return data!;
}

export async function uploadChatImage(bookingId: number, file: File): Promise<ChatMessage> {
  const fd = new FormData();
  fd.append("file", file);
  const { data } = await api.post<ChatMessage>(`/chat/${bookingId}/upload`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data!;
}

export async function uploadChatVoice(bookingId: number, file: File): Promise<ChatMessage> {
  const fd = new FormData();
  fd.append("file", file);
  const { data } = await api.post<ChatMessage>(`/chat/${bookingId}/voice`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data!;
}

export async function uploadProfilePhoto(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append("photo", file);
  const { data } = await api.post<{ url: string }>("/partner/profile/photo", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data!;
}

export async function uploadStoPhoto(
  file: File
): Promise<{ success: boolean; image_url: string; id: number }> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post<{ success: boolean; image_url: string; id: number }>(
    "/partner/sto/upload-photo",
    form,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data!;
}

export async function deleteStoPhoto(imageId: number): Promise<void> {
  await api.delete(`/partner/sto/photos/${imageId}`);
}
