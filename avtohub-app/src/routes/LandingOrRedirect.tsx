import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const PARTNER_URL = import.meta.env.VITE_PARTNER_URL || "http://localhost:5175";
const ADMIN_URL = import.meta.env.VITE_ADMIN_URL || "http://localhost:5177";

interface LandingOrRedirectProps {
  children: React.ReactNode;
}

/** Shows landing for guests. Redirects authenticated: client→/dashboard, partner→partner app, admin→admin app. */
export function LandingOrRedirect({ children }: LandingOrRedirectProps) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-400" />
      </div>
    );
  }

  if (isAuthenticated) {
    const role = user?.role ?? "";
    if (role === "sto_owner" || role === "sto") {
      window.location.href = PARTNER_URL;
      return null;
    }
    if (role === "admin" || role === "super_admin") {
      window.location.href = ADMIN_URL;
      return null;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
