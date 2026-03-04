import { useCallback, useEffect, useState } from "react";
import {
  getPartnerStos,
  getPartnerServices,
  updatePartnerServices,
} from "../api/partner";
import type { PartnerServiceItem, PartnerStoItem } from "../api/partner";

export function PartnerServices() {
  const [stos, setStos] = useState<PartnerStoItem[]>([]);
  const [selectedStoId, setSelectedStoId] = useState<number | null>(null);
  const [services, setServices] = useState<PartnerServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStos = useCallback(async () => {
    try {
      const data = await getPartnerStos();
      setStos(data);
      if (data.length > 0 && !selectedStoId) setSelectedStoId(data[0].id);
    } catch {
      setStos([]);
    }
  }, [selectedStoId]);

  const loadServices = useCallback(async () => {
    if (!selectedStoId) {
      setServices([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await getPartnerServices(selectedStoId);
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
    loadServices();
  }, [loadServices]);

  const handleToggleActive = async (item: PartnerServiceItem) => {
    if (!selectedStoId) return;
    const next = services.map((s) =>
      s.service_id === item.service_id ? { ...s, is_active: !s.is_active } : s
    );
    const payload = next.map((s) => ({
      service_id: s.service_id,
      price: s.price,
      duration_minutes: s.duration_minutes,
      is_active: s.is_active,
    }));
    try {
      const updated = await updatePartnerServices(selectedStoId, payload);
      setServices(updated);
    } catch {
      /**/
    }
  };

  const handlePriceChange = async (item: PartnerServiceItem, newPrice: number) => {
    if (!selectedStoId) return;
    const next = services.map((s) =>
      s.service_id === item.service_id ? { ...s, price: newPrice } : s
    );
    const payload = next.map((s) => ({
      service_id: s.service_id,
      price: s.price,
      duration_minutes: s.duration_minutes,
      is_active: s.is_active,
    }));
    try {
      const updated = await updatePartnerServices(selectedStoId, payload);
      setServices(updated);
    } catch {
      /**/
    }
  };

  if (stos.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-white">Услуги</h1>
        <p className="rounded-xl border border-slate-700 bg-slate-800/50 py-12 text-center text-slate-400">
          Нет СТО. Обратитесь к администратору.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">Услуги</h1>
      <div>
        <label className="mb-2 block text-sm text-slate-400">СТО</label>
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
      </div>
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500" />
        </div>
      ) : error ? (
        <p className="text-red-400">{error}</p>
      ) : services.length === 0 ? (
        <p className="rounded-xl border border-slate-700 bg-slate-800/50 py-12 text-center text-slate-400">
          Нет услуг для выбранного СТО
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-800/50">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Услуга</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Цена</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Длительность</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Вкл/выкл</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.service_id} className="border-b border-slate-700/50 last:border-0 hover:bg-slate-800/50">
                  <td className="px-4 py-4 text-white">{s.name}</td>
                  <td className="px-4 py-4 text-slate-300">
                    <input
                      type="number"
                      min={0}
                      step={100}
                      value={s.price}
                      onChange={(e) => handlePriceChange(s, Number(e.target.value) || 0)}
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (v !== s.price) handlePriceChange(s, v);
                      }}
                      className="w-24 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-white"
                    />
                  </td>
                  <td className="px-4 py-4 text-slate-300">{s.duration_minutes} мин</td>
                  <td className="px-4 py-4">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(s)}
                      className={s.is_active ? "rounded-lg bg-emerald-500/20 px-3 py-1.5 text-sm text-emerald-400" : "rounded-lg bg-slate-600/50 px-3 py-1.5 text-sm text-slate-400"}
                    >
                      {s.is_active ? "Вкл" : "Выкл"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
