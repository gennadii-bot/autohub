import { api } from "./api";

export type BookingStatus = "pending" | "accepted" | "rescheduled" | "cancelled" | "completed";

export interface Booking {
  id: number;
  client_id: number;
  sto_id: number;
  service_id: number;
  date: string;
  time: string;
  status: BookingStatus;
  created_at: string;
  sto_name?: string;
  service_name?: string;
  price?: number | null;
  sto_image_url?: string | null;
  /** True if review was left for this booking */
  has_review?: boolean;
  /** Rating from user's review (1-5) */
  review_rating?: number | null;
  /** For owner view */
  client_email?: string;
  /** Unread messages in chat */
  unread_count?: number;
}

export interface CreateBookingPayload {
  sto_id: number;
  service_id: number;
  date: string;
  time: string;
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
}

export async function createBooking(payload: CreateBookingPayload): Promise<Booking> {
  const { data } = await api.post<Booking>("/booking", payload);
  return data;
}

export async function getMyBookings(): Promise<Booking[]> {
  const { data } = await api.get<Booking[]>("/booking/my");
  return data ?? [];
}

/** Bookings for owner's STO. */
export async function getStoBookings(stoId: number): Promise<Booking[]> {
  const { data } = await api.get<Booking[]>(`/sto/my/${stoId}/bookings`);
  return data ?? [];
}

export async function cancelBooking(id: number): Promise<Booking> {
  const { data } = await api.patch<Booking>(`/booking/${id}/cancel`);
  return data;
}

export async function acceptBooking(id: number): Promise<Booking> {
  const { data } = await api.patch<Booking>(`/booking/${id}/accept`);
  return data;
}

export async function completeBooking(id: number): Promise<Booking> {
  const { data } = await api.patch<Booking>(`/booking/${id}/complete`);
  return data;
}

export interface ReschedulePayload {
  new_date: string;
  new_time: string;
}

export async function rescheduleBooking(
  id: number,
  payload: ReschedulePayload
): Promise<Booking> {
  const { data } = await api.patch<Booking>(`/booking/${id}/reschedule`, payload);
  return data;
}
