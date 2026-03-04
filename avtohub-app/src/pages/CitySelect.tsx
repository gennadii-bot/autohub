import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import { getCities, getCityById } from "../api/cities";
import type { City } from "../api/cities";
import { getRegions } from "../api/regions";
import type { Region } from "../api/regions";
import { reverseGeocode } from "../api/geo";
import { useGeolocation } from "../hooks/useGeolocation";
import { CustomSelect } from "../components/ui/CustomSelect";
import type { CustomSelectOption } from "../components/ui/CustomSelect";
import { Button } from "../components/ui/Button";

const CITY_STORAGE_KEY = "avtohub_city";
const REGION_STORAGE_KEY = "avtohub_region";

const containerVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

const PageBackground = ({ children }: { children: React.ReactNode }) => (
  <div className="relative min-h-screen bg-[url('/map-kazakhstan.svg')] bg-cover bg-center bg-no-repeat">
    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" aria-hidden />
    <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
      {children}
    </div>
  </div>
);

export function CitySelect() {
  const navigate = useNavigate();
  const [regions, setRegions] = useState<Region[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [regionId, setRegionId] = useState<string>("");
  const [cityId, setCityId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const restoringRef = useRef(false);
  const { lat, lng, loading: geoLoading, error: geoError, getPosition } = useGeolocation();

  const loadRegions = useCallback(async () => {
    try {
      const data = await getRegions();
      setRegions(data);
      const storedCity = localStorage.getItem(CITY_STORAGE_KEY);
      const storedRegion = localStorage.getItem(REGION_STORAGE_KEY);
      if (storedCity) setCityId(storedCity);
      if (storedRegion) {
        setRegionId(storedRegion);
      } else if (storedCity) {
        restoringRef.current = true;
        getCityById(Number(storedCity))
          .then((city) => {
            if (city) setRegionId(String(city.region_id));
          })
          .catch((e) => {
            console.error("[CitySelect] loadRegions failed:", e);
          })
          .finally(() => {
            restoringRef.current = false;
          });
      }
    } catch (e) {
      console.error("[CitySelect] loadRegions failed:", e);
      setError("Не удалось загрузить области");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRegions();
  }, [loadRegions]);

  useEffect(() => {
    if (!regionId) {
      setCities([]);
      if (!restoringRef.current) setCityId("");
      return;
    }
    let cancelled = false;
    setCitiesLoading(true);
    getCities(Number(regionId))
      .then((data) => {
        if (!cancelled) setCities(data);
      })
      .catch((e) => {
        if (!cancelled) {
          console.error("[CitySelect] loadCities failed:", e);
          setError("Не удалось загрузить города");
        }
      })
      .finally(() => {
        if (!cancelled) setCitiesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [regionId]);

  useEffect(() => {
    if (cities.length > 0 && cityId) {
      const id = Number(cityId);
      if (!cities.some((c) => c.id === id)) setCityId("");
    }
  }, [cities, cityId]);

  useEffect(() => {
    if (lat == null || lng == null || regions.length === 0) return;
    let cancelled = false;
    reverseGeocode(lat, lng)
      .then((city) => {
        if (cancelled || !city) return;
        setRegionId(String(city.region_id));
        setCityId(String(city.id));
        localStorage.setItem(CITY_STORAGE_KEY, String(city.id));
        localStorage.setItem(REGION_STORAGE_KEY, String(city.region_id));
      })
      .catch((e) => {
        if (!cancelled) console.error("[CitySelect] reverseGeocode failed:", e);
      });
  }, [lat, lng, regions.length]);

  const handleDetect = () => {
    setError("");
    getPosition();
  };

  const handleSave = () => {
    if (cityId) {
      localStorage.setItem(CITY_STORAGE_KEY, cityId);
      localStorage.setItem(REGION_STORAGE_KEY, regionId);
      navigate(`/sto?city_id=${cityId}`);
    }
  };

  const handleRegionChange = (value: string) => {
    setRegionId(value);
    setCityId("");
  };

  const regionOptions: CustomSelectOption[] = regions.map((r) => ({
    value: String(r.id),
    label: r.name,
  }));
  const cityOptions: CustomSelectOption[] = cities.map((c) => ({
    value: String(c.id),
    label: c.name,
  }));

  if (loading) {
    return (
      <PageBackground>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card h-40 w-full max-w-md animate-pulse"
        />
        <p className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/60">
          Загрузка областей...
        </p>
      </PageBackground>
    );
  }

  if (error) {
    return (
      <PageBackground>
        <p className="text-red-400">{error}</p>
      </PageBackground>
    );
  }

  return (
    <PageBackground>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="glass-card w-full max-w-md p-6 sm:p-8"
      >
        <motion.h1
          variants={itemVariants}
          className="text-2xl font-semibold text-white sm:text-3xl"
        >
          Выбор города
        </motion.h1>
        <motion.p variants={itemVariants} className="mt-2 text-white/70">
          Выберите область и город для просмотра СТО
        </motion.p>

        <motion.div variants={itemVariants} className="mt-8 space-y-4">
          <Button
            variant="secondary"
            onClick={handleDetect}
            disabled={geoLoading}
            className="w-full rounded-2xl border-white/20 bg-white/10 text-white hover:bg-white/20"
          >
            <MapPin className="mr-2 inline h-4 w-4" />
            {geoLoading ? "Определение..." : "Определить автоматически"}
          </Button>
          {geoError && <p className="text-sm text-amber-400">{geoError}</p>}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/20" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-transparent px-2 text-white/50">или</span>
            </div>
          </div>

          <div className="space-y-4">
            <CustomSelect
              label="Область"
              options={regionOptions}
              value={regionId}
              onChange={handleRegionChange}
              placeholder="Выберите область"
            />
            <CustomSelect
              label="Город"
              options={cityOptions}
              value={cityId}
              onChange={setCityId}
              placeholder={
                citiesLoading
                  ? "Загрузка..."
                  : regionId
                    ? "Выберите город"
                    : "Сначала выберите область"
              }
              disabled={!regionId || citiesLoading}
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={!cityId}
            className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-violet-500 text-white shadow-lg shadow-emerald-500/20 hover:opacity-90"
          >
            Сохранить
          </Button>
        </motion.div>
      </motion.div>
    </PageBackground>
  );
}
