import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface GuestOnlyRouteProps {
  children: React.ReactNode;
}

/** Redirects to /dashboard if user is already authenticated. */
export function GuestOnlyRoute({ children }: GuestOnlyRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-400" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
