import { api } from "./api";
import type { User } from "../context/AuthContext";

export async function uploadAvatar(file: File): Promise<{ avatar_url: string }> {
  const fd = new FormData();
  fd.append("file", file);
  const { data } = await api.post<{ avatar_url: string }>("/auth/avatar", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export interface UpdateProfilePayload {
  first_name?: string;
  last_name?: string;
  phone?: string;
  birth_date?: string | null;
  car_brand?: string;
  car_model?: string;
  car_year?: number;
  city_id?: number | null;
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<User> {
  const { data } = await api.patch<User>("/auth/me", payload);
  return data;
}
