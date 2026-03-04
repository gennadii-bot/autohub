/** Admin panel types. */

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

export interface AdminStoRequest {
  id: number;
  name: string;
  city: AdminCityRef;
  owner: AdminOwnerRef;
  phone: string | null;
  address: string;
  created_at: string;
  status: string;
}

export interface AdminUser {
  id: number;
  email: string;
  role: string;
  city_id: number | null;
  created_at?: string;
}

export interface AdminSto {
  id: number;
  name: string;
  city?: { id: number; name: string };
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
  comment?: string | null;
  created_at: string;
}
