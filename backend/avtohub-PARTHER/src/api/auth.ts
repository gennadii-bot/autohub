import { api, TOKEN_KEY, USER_KEY } from "./axios";

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface UserMe {
  id: number;
  email: string;
  role: string;
  city_id: number | null;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>("/auth/login", { email, password });
  return data;
}

export async function getCurrentUser(): Promise<UserMe | null> {
  const { data } = await api.get<UserMe>("/auth/me");
  return data ?? null;
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function getStoredUser(): UserMe | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserMe;
  } catch {
    return null;
  }
}

export function setStoredUser(user: UserMe): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredUser(): void {
  localStorage.removeItem(USER_KEY);
}

export async function setPassword(
  token: string,
  password: string
): Promise<{ message: string }> {
  const { data } = await api.post<{ message: string }>("/auth/set-password", {
    token,
    password,
  });
  return data ?? { message: "Account activated successfully" };
}
