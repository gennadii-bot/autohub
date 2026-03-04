import { api } from "./api";

export interface CityRef {
  id: number;
  name: string;
  region?: string;
}

export interface STOItem {
  id: number;
  city_id: number;
  name: string;
  address: string;
  description: string | null;
  image_url: string | null;
  rating: number;
  status?: string;
  slug?: string | null;
  created_at: string;
  city: CityRef | null;
}

export interface PaginatedSTO {
  items: STOItem[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface Service {
  id: number;
  sto_id: number;
  name: string;
  price: number;
  duration_minutes: number;
}

/** Service for booking form (from catalog). */
export interface BookingService {
  id: number;
  name: string;
  price: number;
  duration_minutes: number;
}

export interface ScheduleDay {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_working: boolean;
}

export interface STO extends STOItem {
  services: Service[];
  phone?: string | null;
  whatsapp?: string | null;
}

export async function getStoSchedule(stoId: number): Promise<ScheduleDay[]> {
  const { data } = await api.get<ScheduleDay[]>(`/sto/${stoId}/schedule`);
  return data ?? [];
}

export interface STOListParams {
  city_id: number;
  page?: number;
  per_page?: number;
  search?: string;
  rating_min?: number;
  service_id?: number;
  sort?: "name" | "rating";
}

export async function getStos(params: STOListParams): Promise<PaginatedSTO> {
  const { data } = await api.get<PaginatedSTO>("/sto", { params });
  return data;
}

export async function getSto(id: number): Promise<STO | null> {
  try {
    const { data } = await api.get<STO>(`/sto/${id}`);
    return data;
  } catch (err) {
    if (err && typeof err === "object" && "response" in err) {
      const res = (err as { response?: { status?: number } }).response;
      if (res?.status === 404) return null;
    }
    throw err;
  }
}

export async function getStoBySlug(slug: string): Promise<STO | null> {
  try {
    const { data } = await api.get<STO>(`/sto/by-slug/${encodeURIComponent(slug)}`);
    return data;
  } catch (err) {
    if (err && typeof err === "object" && "response" in err) {
      const res = (err as { response?: { status?: number } }).response;
      if (res?.status === 404) return null;
    }
    throw err;
  }
}

export async function getStoServices(stoId: number): Promise<Service[]> {
  const { data } = await api.get<Service[]>(`/sto/${stoId}/services`);
  return data ?? [];
}

export interface SlotItem {
  time: string;
  available: boolean;
}

export async function getStoSlots(
  stoId: number,
  date: string,
  serviceId: number
): Promise<SlotItem[]> {
  const { data } = await api.get<SlotItem[]>(`/sto/${stoId}/available-slots`, {
    params: { date, service_id: serviceId },
  });
  return Array.isArray(data) ? data : [];
}

/** Active services for booking (from catalog). */
export async function getStoBookingServices(
  stoId: number
): Promise<BookingService[]> {
  const { data } = await api.get<BookingService[]>(
    `/sto/${stoId}/booking-services`
  );
  return data ?? [];
}
