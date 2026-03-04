/** Admin panel types. */

export interface AdminStats {
  users_count: number;
  stos_count: number;
  pending_requests_count: number;
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
