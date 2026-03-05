import axios, { AxiosHeaders } from "axios";

const baseURL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

/** Key for access_token in localStorage (used by request interceptor). */
export const TOKEN_KEY = "access_token";
export const USER_KEY = "avtohub_admin_user";

const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  config.headers = config.headers ?? new AxiosHeaders();
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      window.dispatchEvent(new Event("auth:logout"));
    }
    return Promise.reject(err);
  }
);

export default api;
