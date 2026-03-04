import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface AdminRouteProps {
  children: ReactNode;
}

/**
 * Protects /admin: only role=admin can access.
 */
export function AdminRoute({ children }: AdminRouteProps) {
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.role !== "admin") {
    if (user?.role === "sto_owner" || user?.role === "sto") {
      return <Navigate to="/sto-panel" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
