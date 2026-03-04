import { useCallback, useEffect, useState } from "react";
import {
  getStos,
  getServices,
  getCatalogServices,
  addService,
  updateService,
  deleteService,
} from "../api/partnerApi";
import type { PartnerServiceItem, PartnerStoItem, PartnerCatalogItem } from "../api/partnerApi";
import { Loading } from "../components/Loading";

export function Services() {
  const [stos, setStos] = useState<PartnerStoItem[]>([]);
  const [selectedStoId, setSelectedStoId] = useState<number | null>(null);
  const [services, setServices] = useState<PartnerServiceItem[]>([]);
  const [catalog, setCatalog] = useState<PartnerCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formServiceId, setFormServiceId] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formDuration, setFormDuration] = useState("30");

  const loadStos = useCallback(async () => {
    try {
      const data = await getStos();
      setStos(data);
      if (data.length > 0 && !selectedStoId) setSelectedStoId(data[0].id);
    } catch {
      setStos([]);
    }
  }, [selectedStoId]);

  const loadCatalog = useCallback(async () => {
    try {
      const data = await getCatalogServices();
      setCatalog(data);
    } catch {
      setCatalog([]);
    }
  }, []);

  const loadServices = useCallback(async () => {
    if (!selectedStoId) {
      setServices([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await getServices(selectedStoId);
      setServices(data);
    } catch {
      setError("Не удалось загрузить услуги");
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, [selectedStoId]);

  useEffect(() => {
    loadStos();
  }, [loadStos]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStoId || !formServiceId || !formPrice) return;
    const serviceId = Number(formServiceId);
    const price = Number(formPrice);
    const duration = Number(formDuration) || 30;
    if (!serviceId || price < 0) return;
    try {
      await addService(selectedStoId, {
        service_id: serviceId,
        price,
        duration_minutes: duration,
        is_active: true,
      });
      setModalOpen(false);
      setFormServiceId("");
      setFormPrice("");
      setFormDuration("30");
      loadServices();
    } catch (err) {
      setError("Не удалось добавить услугу");
    }
  };

  const handleToggle = async (item: PartnerServiceItem) => {
    if (!selectedStoId) return;
    try {
      await updateService(item.id, { is_active: !item.is_active });
      loadServices();
    } catch {
      /**/
    }
  };

  const handlePriceBlur = async (item: PartnerServiceItem, newPrice: number) => {
    if (newPrice === item.price) return;
    try {
      await updateService(item.id, { price: newPrice });
      loadServices();
    } catch {
      /**/
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteId === null) return;
    try {
      await deleteService(deleteId);
      setDeleteId(null);
      loadServices();
    } catch {
      setError("Не удалось удалить");
    }
  };

  const addedIds = new Set(services.map((s) => s.service_id));
  const catalogAvailable = catalog.filter((c) => !addedIds.has(c.id));

  if (stos.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-white">Услуги</h1>
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 py-12 text-center text-slate-400">
          Нет СТО. Обратитесь к администратору.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">Услуги</h1>
      <div className="flex flex-wrap items-center gap-4">
        <label className="text-sm text-slate-400">СТО:</label>
        <select
          value={selectedStoId ?? ""}
          onChange={(e) => setSelectedStoId(Number(e.target.value))}
          className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white"
        >
          {stos.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} — {s.city_name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          Добавить услугу
        </button>
      </div>

      {loading ? (
        <Loading />
      ) : error ? (
        <p className="text-red-400">{error}</p>
      ) : services.length === 0 ? (
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 py-12 text-center text-slate-400">
          Нет услуг. Добавьте из каталога.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-800/50">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Услуга</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Цена</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Длительность</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Вкл/выкл</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-300">Удалить</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id} className="border-b border-slate-700/50 last:border-0 hover:bg-slate-800/50">
                  <td className="px-4 py-4 text-white">{s.name}</td>
                  <td className="px-4 py-4 text-slate-300">
                    <input
                      type="number"
                      min={0}
                      step={100}
                      defaultValue={s.price}
                      onBlur={(e) => handlePriceBlur(s, Number(e.target.value) || 0)}
                      className="w-24 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-white"
                    />
                  </td>
                  <td className="px-4 py-4 text-slate-300">{s.duration_minutes} мин</td>
                  <td className="px-4 py-4">
                    <button
                      type="button"
                      onClick={() => handleToggle(s)}
                      className={
                        s.is_active
                          ? "rounded-lg bg-emerald-500/20 px-3 py-1.5 text-sm text-emerald-400"
                          : "rounded-lg bg-slate-600/50 px-3 py-1.5 text-sm text-slate-400"
                      }
                    >
                      {s.is_active ? "Вкл" : "Выкл"}
                    </button>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => setDeleteId(s.id)}
                      className="rounded-lg bg-red-500/20 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/30"
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">Добавить услугу</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-slate-400">Услуга из каталога</label>
                <select
                  value={formServiceId}
                  onChange={(e) => setFormServiceId(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white"
                >
                  <option value="">Выберите</option>
                  {catalogAvailable.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.category ? `(${c.category})` : ""}
                    </option>
                  ))}
                </select>
                {catalogAvailable.length === 0 && (
                  <p className="mt-1 text-sm text-slate-500">Все услуги уже добавлены</p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-400">Цена, ₸</label>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-400">Длительность, мин</label>
                <input
                  type="number"
                  min={1}
                  max={480}
                  value={formDuration}
                  onChange={(e) => setFormDuration(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={!formServiceId || !formPrice || catalogAvailable.length === 0}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-white disabled:opacity-50"
                >
                  Добавить
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-600 px-4 py-2 text-slate-300 hover:bg-slate-800"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6">
            <p className="mb-4 text-slate-300">Удалить эту услугу из СТО?</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="rounded-xl bg-red-600 px-4 py-2 text-white hover:bg-red-500"
              >
                Удалить
              </button>
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="rounded-xl border border-slate-600 px-4 py-2 text-slate-300 hover:bg-slate-800"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
