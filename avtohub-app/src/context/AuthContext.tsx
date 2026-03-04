import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { api, setAuthLogout } from "../api/api";
import {
  getStoredToken,
  setStoredToken,
  clearStoredToken,
  isTokenExpired,
} from "../api/tokenStorage";

export interface User {
  id: number;
  email: string;
  role: string;
  city_id: number | null;
  city_name?: string | null;
  avatar_url?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  birth_date?: string | null;
  car_brand?: string | null;
  car_model?: string | null;
  car_year?: number | null;
  created_at?: string | null;
}

export interface RegisterPayload {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone: string;
  birth_date: string;
  car_brand: string;
  car_model: string;
  car_year: number;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<User | null>;
  logout: () => void;
  register: (payload: RegisterPayload, rememberMe?: boolean) => Promise<void>;
  getCurrentUser: () => Promise<User | null>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);
const USER_KEY = "avtohub_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(USER_KEY);
    clearStoredToken();
  }, []);

  useEffect(() => {
    setAuthLogout(logout);
  }, [logout]);

  const getCurrentUser = useCallback(async (): Promise<User | null> => {
    const token = getStoredToken();
    if (!token) return null;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    try {
      const { data } = await api.get<User>("/auth/me", { signal: controller.signal });
      setUser(data);
      localStorage.setItem(USER_KEY, JSON.stringify(data));
      return data;
    } finally {
      clearTimeout(timeoutId);
    }
  }, []);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    if (isTokenExpired(token)) {
      clearStoredToken();
      localStorage.removeItem(USER_KEY);
      setUser(null);
      setIsLoading(false);
      return;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    api
      .get<User>("/auth/me", { signal: controller.signal })
      .then((res) => {
        setUser(res.data);
        localStorage.setItem(USER_KEY, JSON.stringify(res.data));
      })
      .catch(() => {
        clearStoredToken();
        localStorage.removeItem(USER_KEY);
        setUser(null);
      })
      .finally(() => {
        clearTimeout(timeoutId);
        setIsLoading(false);
      });
  }, []);

  const login = useCallback(
    async (email: string, password: string, rememberMe = true): Promise<User | null> => {
      const { data } = await api.post<{ access_token: string }>("/auth/login", {
        email,
        password,
      });
      setStoredToken(data.access_token, rememberMe);
      try {
        const userData = await getCurrentUser();
        return userData;
      } catch (e) {
        clearStoredToken();
        localStorage.removeItem(USER_KEY);
        setUser(null);
        throw e;
      }
    },
    [getCurrentUser]
  );

  const register = useCallback(
    async (payload: RegisterPayload, rememberMe = true) => {
      const { data } = await api.post<{ access_token: string }>("/auth/register", payload);
      setStoredToken(data.access_token, rememberMe);
      await getCurrentUser();
    },
    [getCurrentUser]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        register,
        getCurrentUser,
        isAuthenticated: !!user,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
