import { useState, useCallback } from "react";

export interface GeolocationState {
  lat: number | null;
  lng: number | null;
  loading: boolean;
  error: string | null;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    lat: null,
    lng: null,
    loading: false,
    error: null,
  });

  const getPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setState((s) => ({ ...s, error: "Геолокация не поддерживается", loading: false }));
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          loading: false,
          error: null,
        });
      },
      (err) => {
        const message =
          err.code === 1
            ? "Доступ к геолокации запрещён"
            : err.code === 2
              ? "Не удалось определить местоположение"
              : "Ошибка геолокации";
        setState((s) => ({
          ...s,
          loading: false,
          error: message,
        }));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  return { ...state, getPosition };
}
