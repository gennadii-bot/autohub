import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface PartnerProtectedRouteProps {
  children: ReactNode;
}

export function PartnerProtectedRoute({ children }: PartnerProtectedRouteProps) {
  const location = useLocation();
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.role !== "sto_owner" && user.role !== "sto") {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
