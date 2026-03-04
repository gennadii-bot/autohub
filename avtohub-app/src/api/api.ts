import axios from "axios";
import { clearStoredToken, getStoredToken } from "./tokenStorage";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

/** @deprecated Use tokenStorage.TOKEN_KEY */
export const TOKEN_KEY = "access_token";

let logoutCallback: (() => void) | null = null;

/** Register logout handler for 401 responses. Call from AuthProvider. */
export function setAuthLogout(callback: () => void) {
  logoutCallback = callback;
}

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request: add Authorization header if token exists (from localStorage or sessionStorage)
api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response: on 401 → clear token from both storages, logout, redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearStoredToken();
      logoutCallback?.();
      const from = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?from=${from}`;
    }
    return Promise.reject(error);
  }
);
