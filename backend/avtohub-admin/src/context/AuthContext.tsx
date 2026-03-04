import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
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
const ADMIN_ROLES = ["admin", "super_admin"];
const CLIENT_URL = import.meta.env.VITE_CLIENT_URL || "http://localhost:5173";
const PARTNER_URL = import.meta.env.VITE_PARTNER_URL || "http://localhost:5175";

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
        if (!u || !ADMIN_ROLES.includes(u.role)) {
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
    if (u.role === "client") {
      clearToken();
      clearStoredUser();
      window.location.href = CLIENT_URL;
      return;
    }
    if (u.role === "sto_owner" || u.role === "sto") {
      clearToken();
      clearStoredUser();
      window.location.href = PARTNER_URL;
      return;
    }
    if (!ADMIN_ROLES.includes(u.role)) {
      clearToken();
      clearStoredUser();
      throw new Error("Доступ только для администраторов.");
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
