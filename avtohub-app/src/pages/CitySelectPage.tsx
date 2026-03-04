import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import { getCities } from "../api/cities";
import type { City } from "../api/cities";
import { getRegions } from "../api/regions";
import type { Region } from "../api/regions";
import { reverseGeocode } from "../api/geo";
import { useGeolocation } from "../hooks/useGeolocation";
import { useCity } from "../context/CityContext";
import { CustomSelect } from "../components/ui/CustomSelect";
import type { CustomSelectOption } from "../components/ui/CustomSelect";
import { Button } from "../components/ui/Button";

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

function PageBackground({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[url('/map-kazakhstan.svg')] bg-cover bg-center bg-no-repeat">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" aria-hidden />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12 pt-24">
        {children}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="glass-card h-64 w-full max-w-md animate-pulse rounded-2xl" />
  );
}

export function CitySelectPage() {
  const navigate = useNavigate();
  const { setCity } = useCity();

  const [regions, setRegions] = useState<Region[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [regionId, setRegionId] = useState<string>("");
  const [cityId, setCityId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const { lat, lng, loading: geoLoading, error: geoError, getPosition } =
    useGeolocation();

  const loadRegions = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const data = await getRegions();
      setRegions(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("[CitySelectPage] loadRegions failed:", e);
      setError("Не удалось загрузить области");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRegions();
  }, [loadRegions]);

  const loadCitiesForRegion = useCallback(async (rid: string) => {
    if (!rid) return;
    setError("");
    setCitiesLoading(true);
    try {
      const data = await getCities(Number(rid));
      setCities(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("[CitySelectPage] loadCities failed:", e);
      setError("Не удалось загрузить города");
    } finally {
      setCitiesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!regionId) {
      setCities([]);
      setCityId("");
      return;
    }
    let cancelled = false;
    setCitiesLoading(true);
    setError("");
    getCities(Number(regionId))
      .then((data) => {
        if (!cancelled) setCities(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        if (!cancelled) {
          console.error("[CitySelectPage] loadCities failed:", e);
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
    if (lat == null || lng == null || regions.length === 0) return;
    let cancelled = false;
    reverseGeocode(lat, lng)
      .then((city) => {
        if (cancelled || !city) return;
        setRegionId(String(city.region_id));
        setCityId(String(city.id));
      })
      .catch(() => {
        if (!cancelled) {
          /* geo error handled by geoError */
        }
      });
  }, [lat, lng, regions.length]);

  const handleRetry = () => {
    if (error === "Не удалось загрузить области") {
      loadRegions();
    } else if (error === "Не удалось загрузить города" && regionId) {
      loadCitiesForRegion(regionId);
    } else {
      loadRegions();
    }
  };

  const handleDetect = () => {
    setError("");
    getPosition();
  };

  const handleRegionChange = (value: string) => {
    setRegionId(value);
    setCityId("");
  };

  const handleSave = () => {
    if (!cityId) return;
    const city = cities.find((c) => String(c.id) === cityId);
    if (!city) return;
    setSaving(true);
    setCity(city.id, city.name);
    setSaving(false);
    navigate("/", { replace: true });
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
        <SkeletonCard />
        <p className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/60">
          Загрузка областей...
        </p>
      </PageBackground>
    );
  }

  if (error) {
    return (
      <PageBackground>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card w-full max-w-md p-6"
        >
          <p className="text-red-400">{error}</p>
          <Button
            variant="secondary"
            onClick={handleRetry}
            className="mt-4 w-full"
          >
            Повторить
          </Button>
        </motion.div>
      </PageBackground>
    );
  }

  if (regions.length === 0) {
    return (
      <PageBackground>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card w-full max-w-md p-6"
        >
          <p className="text-white/80">Города пока недоступны</p>
          <Button
            variant="secondary"
            onClick={loadRegions}
            className="mt-4 w-full"
          >
            Повторить
          </Button>
        </motion.div>
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
            disabled={!cityId || saving}
            className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-violet-500 text-white shadow-lg shadow-emerald-500/20 hover:opacity-90"
          >
            {saving ? "Сохранение..." : "Сохранить"}
          </Button>
        </motion.div>
      </motion.div>
    </PageBackground>
  );
}
