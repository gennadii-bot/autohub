import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  getCatalog,
  getStoServices,
  updateStoServices,
} from "../api/stoServices";
import type { CatalogItem, StoServiceItem } from "../api/stoServices";
import { useToast } from "../context/ToastContext";
import { Container } from "../components/layout/Container";

interface ServiceState {
  service_id: number;
  name: string;
  category: string;
  price: string;
  is_active: boolean;
}

function groupByCategory(items: CatalogItem[]): Map<string, CatalogItem[]> {
  const map = new Map<string, CatalogItem[]>();
  for (const item of items) {
    const list = map.get(item.category) ?? [];
    list.push(item);
    map.set(item.category, list);
  }
  return map;
}

export function ServicesPage() {
  const { stoId } = useParams<{ stoId: string }>();
  const { addToast } = useToast();
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [stoServices, setStoServices] = useState<StoServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");
  const [state, setState] = useState<Map<number, ServiceState>>(new Map());

  const loadData = useCallback(async () => {
    const id = stoId ? parseInt(stoId, 10) : NaN;
    if (!id || Number.isNaN(id)) {
      setError("Неверный ID");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [cat, svc] = await Promise.all([
        getCatalog(),
        getStoServices(id),
      ]);
      setCatalog(cat);
      setStoServices(svc);

      const svcByServiceId = new Map(svc.map((s) => [s.service_id, s]));
      const newState = new Map<number, ServiceState>();
      for (const c of cat) {
        const existing = svcByServiceId.get(c.id);
        newState.set(c.id, {
          service_id: c.id,
          name: c.name,
          category: c.category,
          price: existing ? String(existing.price) : "",
          is_active: existing?.is_active ?? false,
        });
      }
      setState(newState);
    } catch (err: unknown) {
      const res =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { status?: number } }).response
          : null;
      if (res?.status === 401) {
        addToast("Требуется авторизация", "error");
        return;
      }
      if (res?.status === 403) {
        setError("Недостаточно прав");
        return;
      }
      setError("Не удалось загрузить данные");
    } finally {
      setLoading(false);
    }
  }, [stoId, addToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const grouped = useMemo(() => groupByCategory(catalog), [catalog]);

  const updateItem = (serviceId: number, patch: Partial<ServiceState>) => {
    setState((prev) => {
      const next = new Map(prev);
      const cur = next.get(serviceId);
      if (!cur) return prev;
      next.set(serviceId, { ...cur, ...patch });
      return next;
    });
  };

  const initialSvcMap = useMemo(
    () => new Map(stoServices.map((s) => [s.service_id, s])),
    [stoServices]
  );

  const hasChanges = useMemo(() => {
    for (const [, s] of state) {
      const init = initialSvcMap.get(s.service_id);
      const wasActive = init?.is_active ?? false;
      if (s.is_active !== wasActive) return true;
      if (s.is_active) {
        const priceNum = parseFloat(s.price);
        const initPrice = init?.price ?? 0;
        if (Number.isNaN(priceNum) || Math.abs(priceNum - initPrice) > 0.001)
          return true;
      }
    }
    return false;
  }, [state, initialSvcMap]);

  const payloadValid = useMemo(() => {
    for (const [, s] of state) {
      if (s.is_active) {
        const p = parseFloat(s.price);
        if (Number.isNaN(p) || p < 0) return false;
      }
    }
    return true;
  }, [state]);

  const canSave = hasChanges && payloadValid && !saving;

  const handleSave = async () => {
    const id = stoId ? parseInt(stoId, 10) : NaN;
    if (!id || Number.isNaN(id) || !hasChanges || !payloadValid) return;

    const items = Array.from(state.values())
      .filter((s) => s.is_active)
      .map((s) => ({
        service_id: s.service_id,
        price: parseFloat(s.price) || 0,
        is_active: true,
      }));

    setSaving(true);
    try {
      await updateStoServices(id, items);
      setStoServices(
        items.map((i) => ({
          service_id: i.service_id,
          price: i.price,
          is_active: true,
        }))
      );
      addToast("Изменения сохранены", "success");
      loadData();
    } catch (err: unknown) {
      const res =
        err && typeof err === "object" && "response" in err
          ? (err as {
              response?: { data?: { error?: { message?: string } } };
            }).response
          : null;
      addToast(res?.data?.error?.message ?? "Ошибка сохранения", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-12">
        <div className="flex justify-center py-16">
          <div
            className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500"
            aria-label="Загрузка"
          />
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-12">
        <p className="text-red-400">{error}</p>
        <Link
          to="/sto-panel"
          className="mt-4 inline-block text-emerald-400 hover:underline"
        >
          ← Мои СТО
        </Link>
      </Container>
    );
  }

  const categories = Array.from(grouped.keys()).sort();

  return (
    <Container className="py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Link
          to={`/sto-panel/${stoId}`}
          className="mb-6 inline-block text-sm text-white/70 hover:text-emerald-400"
        >
          ← Назад
        </Link>

        <h1 className="text-2xl font-semibold text-white sm:text-3xl">
          Услуги СТО
        </h1>

        <div className="mt-8 space-y-10">
          {categories.map((category, catIndex) => (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: catIndex * 0.05 }}
            >
              <h2 className="mb-4 text-lg font-medium text-emerald-400">
                {category}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(grouped.get(category) ?? []).map((item) => {
                  const s = state.get(item.id);
                  if (!s) return null;
                  return (
                    <div
                      key={item.id}
                      className="glass-card flex flex-col gap-4 rounded-2xl border border-white/10 p-4 transition-all hover:border-white/20"
                    >
                      <label className="flex cursor-pointer items-center gap-3">
                        <input
                          type="checkbox"
                          checked={s.is_active}
                          onChange={(e) =>
                            updateItem(item.id, {
                              is_active: e.target.checked,
                              price: e.target.checked ? s.price : "",
                            })
                          }
                          className="h-4 w-4 rounded border-white/30 bg-white/5 text-emerald-500 focus:ring-emerald-500/50"
                        />
                        <span className="font-medium text-white">
                          {item.name}
                        </span>
                      </label>
                      <div>
                        <label className="mb-1 block text-xs text-white/60">
                          Цена (₸)
                        </label>
                        <input
                          type="number"
                          min={0}
                          step={100}
                          value={s.price}
                          onChange={(e) =>
                            updateItem(item.id, { price: e.target.value })
                          }
                          disabled={!s.is_active}
                          placeholder="0"
                          className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-white placeholder-white/40 outline-none transition focus:border-emerald-500/70 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-10">
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="rounded-2xl bg-gradient-to-r from-emerald-500 to-violet-500 px-8 py-3 font-medium text-white shadow-lg shadow-emerald-500/20 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Сохранение..." : "Сохранить изменения"}
          </button>
        </div>
      </motion.div>
    </Container>
  );
}
