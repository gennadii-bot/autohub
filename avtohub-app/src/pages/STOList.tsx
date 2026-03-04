import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { getStos, getStoServices } from "../api/sto";
import type { STOItem } from "../api/sto";
import { getFavorites, addFavorite, removeFavorite } from "../api/favorites";
import { useCity } from "../context/CityContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { CustomSelect } from "../components/ui/CustomSelect";
import type { CustomSelectOption } from "../components/ui/CustomSelect";
import { STOCard } from "../components/sto/STOCard";
import { MockSTOCard } from "../components/sto/MockSTOCard";
import { MOCK_STOS } from "../data/mockStos";
import { Container } from "../components/layout/Container";

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white/5 backdrop-blur animate-pulse">
      <div className="h-48 bg-white/10" />
      <div className="space-y-3 p-4">
        <div className="h-5 w-3/4 rounded bg-white/10" />
        <div className="h-4 w-full rounded bg-white/10" />
        <div className="h-4 w-1/2 rounded bg-white/10" />
      </div>
    </div>
  );
}

export function STOList() {
  const { selectedCityId } = useCity();
  const { isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const cityId = selectedCityId != null ? String(selectedCityId) : "";

  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [favoriteLoading, setFavoriteLoading] = useState<number | null>(null);
  const [services, setServices] = useState<CustomSelectOption[]>([]);
  const [stos, setStos] = useState<STOItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [ratingMin, setRatingMin] = useState<string>("");
  const [serviceId, setServiceId] = useState<string>("");
  const [sort, setSort] = useState<string>("name");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!isAuthenticated) {
      setFavoriteIds(new Set());
      return;
    }
    getFavorites()
      .then((favs) => setFavoriteIds(new Set(favs.map((f) => f.sto_id))))
      .catch(() => {});
  }, [isAuthenticated]);

  const handleFavoriteClick = useCallback(
    async (stoId: number) => {
      setFavoriteLoading(stoId);
      try {
        const isFav = favoriteIds.has(stoId);
        if (isFav) {
          await removeFavorite(stoId);
          setFavoriteIds((prev) => {
            const next = new Set(prev);
            next.delete(stoId);
            return next;
          });
          addToast("Удалено из избранного", "success");
        } else {
          await addFavorite(stoId);
          setFavoriteIds((prev) => new Set([...prev, stoId]));
          addToast("Добавлено в избранное", "success");
        }
      } catch {
        addToast("Не удалось обновить избранное", "error");
      } finally {
        setFavoriteLoading(null);
      }
    },
    [favoriteIds, addToast]
  );

  useEffect(() => {
    if (!cityId) return;
    setLoading(true);
    setError("");
    getStos({
      city_id: Number(cityId),
      page,
      per_page: 12,
      search: searchDebounced || undefined,
      rating_min: ratingMin ? Number(ratingMin) : undefined,
      service_id: serviceId ? Number(serviceId) : undefined,
      sort: sort as "name" | "rating",
    })
      .then((data) => {
        setStos(data.items);
        setTotal(data.total);
      })
      .catch(() => {
        setError("Не удалось загрузить список СТО");
        setStos([]);
      })
      .finally(() => setLoading(false));
  }, [cityId, page, searchDebounced, ratingMin, serviceId, sort]);

  const loadServicesForFilter = () => {
    if (!cityId) return;
    getStos({ city_id: Number(cityId), per_page: 50 })
      .then((r) => {
        const stoIds = r.items.map((s) => s.id);
        return Promise.all(stoIds.map((id) => getStoServices(id)));
      })
      .then((results) => {
        const seen = new Set<number>();
        const opts: CustomSelectOption[] = [];
        results.flat().forEach((s) => {
          if (!seen.has(s.id)) {
            seen.add(s.id);
            opts.push({ value: String(s.id), label: `${s.name} — ${s.price} ₸` });
          }
        });
        setServices(opts);
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (cityId) loadServicesForFilter();
    else setServices([]);
  }, [cityId]);

  const pages = Math.ceil(total / 12) || 1;

  return (
    <Container className="py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white sm:text-3xl">
            СТО
          </h1>
          <p className="mt-1 text-white/70">
            Выберите автосервис для записи
          </p>
        </div>

        {/* Фильтры: 1 строка на desktop, stack на mobile */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          <div className="relative flex-1 sm:max-w-[220px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
            <input
              type="text"
              placeholder="Поиск по названию..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-white/20 bg-white/5 py-3 pl-10 pr-4 text-white placeholder-white/50 backdrop-blur-sm transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
          <div className="w-full sm:w-auto sm:min-w-[140px]">
            <CustomSelect
              options={[
                { value: "", label: "Любой рейтинг" },
                { value: "3", label: "3+ звёзд" },
                { value: "4", label: "4+ звёзд" },
              ]}
              value={ratingMin}
              onChange={setRatingMin}
              placeholder="Рейтинг"
            />
          </div>
          <div className="w-full sm:w-auto sm:min-w-[160px]">
            <CustomSelect
              options={[
                { value: "", label: "Любая услуга" },
                ...services,
              ]}
              value={serviceId}
              onChange={setServiceId}
              placeholder="Услуга"
            />
          </div>
          <div className="w-full sm:w-auto sm:min-w-[140px]">
            <CustomSelect
              options={[
                { value: "name", label: "По названию" },
                { value: "rating", label: "По рейтингу" },
              ]}
              value={sort}
              onChange={setSort}
              placeholder="Сортировка"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : error ? (
          <p className="py-12 text-center text-red-400">{error}</p>
        ) : stos.length === 0 ? (
          <>
            <p className="mb-6 text-center text-white/70">
              В выбранном городе пока нет СТО. Примеры карточек:
            </p>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {MOCK_STOS.map((sto, i) => (
                <MockSTOCard key={sto.id} sto={sto} index={i} />
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {stos.map((sto, i) => (
                <STOCard
                  key={sto.id}
                  sto={sto}
                  index={i}
                  isFavorite={isAuthenticated && favoriteIds.has(sto.id)}
                  onFavoriteClick={isAuthenticated ? handleFavoriteClick : undefined}
                  favoriteLoading={favoriteLoading === sto.id}
                />
              ))}
            </div>
            {pages > 1 && (
              <div className="mt-8 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-white transition-all hover:bg-white/10 disabled:opacity-50"
                >
                  Назад
                </button>
                <span className="flex items-center px-4 text-white/70">
                  {page} / {pages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  disabled={page >= pages}
                  className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-white transition-all hover:bg-white/10 disabled:opacity-50"
                >
                  Вперёд
                </button>
              </div>
            )}
          </>
        )}
      </motion.div>
    </Container>
  );
}
