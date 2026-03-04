import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface ClientRouteProps {
  children: React.ReactNode;
}

const PARTNER_URL = import.meta.env.VITE_PARTNER_URL || "http://localhost:5175";
const ADMIN_URL = import.meta.env.VITE_ADMIN_URL || "http://localhost:5177";

/** Protects client dashboard: only role=client. Partner/admin → redirect to their app. */
export function ClientRoute({ children }: ClientRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-400" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const role = user?.role ?? "";

  if (role === "sto_owner" || role === "sto") {
    window.location.href = PARTNER_URL;
    return null;
  }

  if (role === "admin" || role === "super_admin") {
    window.location.href = ADMIN_URL;
    return null;
  }

  if (role !== "client") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
