import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { getCityById } from "../api/cities";

const CITY_STORAGE_KEY = "avtohub_city";

export interface CityState {
  id: number;
  name: string;
}

interface CityContextType {
  selectedCityId: number | null;
  selectedCityName: string | null;
  setCity: (id: number, name: string) => void;
  clearCity: () => void;
  isReady: boolean;
}

const CityContext = createContext<CityContextType | null>(null);

function loadStoredCity(): { id: number; name: string } | null {
  try {
    const raw = localStorage.getItem(CITY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof (parsed as { id?: number }).id === "number" &&
      typeof (parsed as { name?: string }).name === "string"
    ) {
      return parsed as { id: number; name: string };
    }
    const legacyId = Number(raw);
    if (!Number.isNaN(legacyId) && legacyId > 0) {
      return { id: legacyId, name: "" };
    }
    return null;
  } catch {
    return null;
  }
}

function saveCityToStorage(id: number, name: string): void {
  localStorage.setItem(CITY_STORAGE_KEY, JSON.stringify({ id, name }));
}

function clearCityFromStorage(): void {
  localStorage.removeItem(CITY_STORAGE_KEY);
}

export function CityProvider({ children }: { children: ReactNode }) {
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
  const [selectedCityName, setSelectedCityName] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const setCity = useCallback((id: number, name: string) => {
    setSelectedCityId(id);
    setSelectedCityName(name);
    saveCityToStorage(id, name);
  }, []);

  const clearCity = useCallback(() => {
    setSelectedCityId(null);
    setSelectedCityName(null);
    clearCityFromStorage();
  }, []);

  useEffect(() => {
    const stored = loadStoredCity();
    if (stored) {
      setSelectedCityId(stored.id);
      setSelectedCityName(stored.name);
      getCityById(stored.id)
        .then((city) => {
          if (city && city.id === stored.id) {
            setSelectedCityName(city.name);
            saveCityToStorage(city.id, city.name);
          }
        })
        .catch(() => {
          setSelectedCityId(stored.id);
          setSelectedCityName(stored.name);
        })
        .finally(() => setIsReady(true));
    } else {
      setIsReady(true);
    }
  }, []);

  return (
    <CityContext.Provider
      value={{
        selectedCityId,
        selectedCityName,
        setCity,
        clearCity,
        isReady,
      }}
    >
      {children}
    </CityContext.Provider>
  );
}

export function useCity(): CityContextType {
  const ctx = useContext(CityContext);
  if (!ctx) throw new Error("useCity must be used within CityProvider");
  return ctx;
}
