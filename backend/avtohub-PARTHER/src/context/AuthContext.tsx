import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import {
  login as apiLogin,
  getCurrentUser,
  setToken,
  clearToken,
  clearStoredUser,
  getStoredToken,
  setStoredUser,
  type UserMe,
} from "../api/auth";

interface AuthContextType {
  user: UserMe | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const PARTNER_ROLES = ["sto_owner", "sto"];
const CLIENT_URL = import.meta.env.VITE_CLIENT_URL || "http://localhost:5173";
const ADMIN_URL = import.meta.env.VITE_ADMIN_URL || "http://localhost:5177";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserMe | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    setUser(null);
    clearToken();
    clearStoredUser();
  }, []);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    getCurrentUser()
      .then((u) => {
        if (!u || !PARTNER_ROLES.includes(u.role)) {
          logout();
          return;
        }
        setUser(u);
        setStoredUser(u);
      })
      .catch(() => logout())
      .finally(() => setIsLoading(false));
  }, [logout]);

  useEffect(() => {
    const handler = () => logout();
    window.addEventListener("auth:logout", handler);
    return () => window.removeEventListener("auth:logout", handler);
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const { access_token } = await apiLogin(email, password);
    setToken(access_token);
    const u = await getCurrentUser();
    if (!u) {
      clearToken();
      clearStoredUser();
      throw new Error("Ошибка загрузки профиля.");
    }
    if (u.role === "admin" || u.role === "super_admin") {
      clearToken();
      clearStoredUser();
      window.location.href = ADMIN_URL;
      return;
    }
    if (u.role === "client") {
      clearToken();
      clearStoredUser();
      window.location.href = CLIENT_URL;
      return;
    }
    if (!PARTNER_ROLES.includes(u.role)) {
      clearToken();
      clearStoredUser();
      throw new Error("Доступ только для партнёров (владельцев СТО).");
    }
    setUser(u);
    setStoredUser(u);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
