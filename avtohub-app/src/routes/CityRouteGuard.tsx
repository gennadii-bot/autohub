import { useEffect, type ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCity } from "../context/CityContext";

interface CityRouteGuardProps {
  children: ReactNode;
}

function LoadingFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500" />
    </div>
  );
}

/**
 * Redirects to /select-city if city is not selected.
 * Used for routes that require a city (e.g. /sto).
 */
export function CityRouteGuard({ children }: CityRouteGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedCityId, isReady } = useCity();

  useEffect(() => {
    if (!isReady) return;
    if (selectedCityId == null) {
      navigate("/select-city", {
        replace: true,
        state: { from: location.pathname },
      });
    }
  }, [isReady, selectedCityId, navigate, location.pathname]);

  if (!isReady) {
    return <LoadingFallback />;
  }

  if (selectedCityId == null) {
    return <LoadingFallback />;
  }

  return <>{children}</>;
}
