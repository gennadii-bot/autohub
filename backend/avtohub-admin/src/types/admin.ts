/** Admin panel types. */

/** Ответ GET /admin/stats */
export interface AdminStats {
  users_count: number;
  stos_count: number;
  pending_requests: number;
  completed_services: number;
  average_rating: number;
}

export interface AdminCityRef {
  id: number;
  name: string;
}

export interface AdminOwnerRef {
  id: number;
  email: string;
}

/** Заявка партнёра (sto_requests) */
export interface AdminStoRequest {
  id: string; // UUID
  first_name: string;
  last_name: string;
  middle_name: string | null;
  email: string;
  phone: string;
  iin: string;
  ip_name: string | null;
  bin: string | null;
  sto_name: string;
  sto_description: string | null;
  region_id: number;
  city_id: number;
  region_name: string;
  city_name: string;
  address: string;
  photo_url: string | null;
  status: string;
  rejection_reason?: string | null;
  created_at: string;
}

export interface AdminUser {
  id: number;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  car_brand?: string | null;
  car_model?: string | null;
  car_year?: number | null;
  role: string;
  city_id: number | null;
  created_at?: string;
  status?: string;
}

export interface AdminSto {
  id: number;
  name: string;
  city: { id: number; name: string };
  address: string;
  status: string;
  rating?: number;
  owner_id?: number;
}

export interface CatalogItem {
  id: number;
  name: string;
  category?: string;
}

/** Catalog item from GET /admin/services (with is_active, description) */
export interface AdminCatalogItem {
  id: number;
  name: string;
  category: string;
  description: string | null;
  is_active: boolean;
}

export interface AdminBooking {
  id: number;
  sto_id: number;
  sto_name?: string;
  service_name?: string;
  client_email?: string;
  date: string;
  time: string;
  status: string;
  created_at?: string;
}

export interface AdminReview {
  id: number;
  sto_id: number;
  sto_name?: string;
  user_email?: string;
  rating: number;
  text: string;
  created_at: string;
}
