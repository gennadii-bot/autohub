import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface STOPanelRouteProps {
  children: ReactNode;
}

/**
 * Protects /sto-panel: only role=sto_owner can access.
 * client → /dashboard, admin → /admin, unauthenticated → /login.
 */
export function STOPanelRoute({ children }: STOPanelRouteProps) {
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const role = user?.role ?? "";

  if (role === "client") {
    return <Navigate to="/dashboard" replace />;
  }

  if (role === "admin") {
    return <Navigate to="/admin" replace />;
  }

  if (role !== "sto_owner" && role !== "sto") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
