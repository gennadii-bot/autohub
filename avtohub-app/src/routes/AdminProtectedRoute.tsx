import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface AdminProtectedRouteProps {
  children: ReactNode;
}

/**
 * Protects /admin: only role=admin can access.
 * Redirects by role when not admin.
 */
export function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const location = useLocation();
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.role !== "admin") {
    if (user.role === "sto_owner" || user.role === "sto") {
      return <Navigate to="/sto-panel" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
