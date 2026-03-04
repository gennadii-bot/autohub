import { useCallback, useEffect, useState } from "react";
import { getPartnerBookings, updateBookingStatus } from "../api/partner";
import type { PartnerBooking } from "../api/partner";

const STATUS_LABELS: Record<string, string> = {
  pending: "Ожидает",
  accepted: "Подтверждена",
  completed: "Выполнена",
  cancelled: "Отменена",
};

export function PartnerBookings() {
  const [bookings, setBookings] = useState<PartnerBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getPartnerBookings();
      setBookings(data);
    } catch {
      setError("Не удалось загрузить записи");
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleStatus = async (id: number, newStatus: string) => {
    setActionId(id);
    try {
      const updated = await updateBookingStatus(id, newStatus);
      setBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
    } catch {
      // keep list as is
    } finally {
      setActionId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500" />
      </div>
    );
  }

  if (error) return <p className="text-red-400">{error}</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">Записи</h1>
      {bookings.length === 0 ? (
        <p className="rounded-xl border border-slate-700 bg-slate-800/50 py-12 text-center text-slate-400">
          Нет записей
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-800/50">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Клиент</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Услуга</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Дата</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Статус</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Цена</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-300">Действия</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr
                  key={b.id}
                  className="border-b border-slate-700/50 last:border-0 hover:bg-slate-800/50"
                >
                  <td className="px-4 py-4">
                    <div className="text-white">
                      {b.client?.first_name || b.client?.last_name
                        ? [b.client.first_name, b.client.last_name].filter(Boolean).join(" ")
                        : b.client_email}
                    </div>
                    {b.client?.phone && (
                      <div className="text-sm text-slate-400">{b.client.phone}</div>
                    )}
                    {(b.client?.car_brand || b.client?.car_model || b.client?.car_year) && (
                      <div className="text-sm text-slate-500">
                        {[b.client.car_brand, b.client.car_model, b.client.car_year]
                          .filter(Boolean)
                          .join(" ")}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 text-slate-300">{b.service_name}</td>
                  <td className="px-4 py-4 text-slate-300">
                    {b.date} {b.time}
                  </td>
                  <td className="px-4 py-4 text-slate-300">
                    {STATUS_LABELS[b.status] ?? b.status}
                  </td>
                  <td className="px-4 py-4 text-slate-300">
                    {b.price != null ? `${b.price} ₸` : "—"}
                  </td>
                  <td className="px-4 py-4 text-right">
                    {b.status === "pending" && (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleStatus(b.id, "accepted")}
                          disabled={actionId !== null}
                          className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-sm text-emerald-400 disabled:opacity-50"
                        >
                          Принять
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatus(b.id, "cancelled")}
                          disabled={actionId !== null}
                          className="rounded-lg bg-red-500/20 px-3 py-1.5 text-sm text-red-400 disabled:opacity-50"
                        >
                          Отменить
                        </button>
                      </div>
                    )}
                    {b.status === "accepted" && (
                      <button
                        type="button"
                        onClick={() => handleStatus(b.id, "completed")}
                        disabled={actionId !== null}
                        className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-sm text-emerald-400 disabled:opacity-50"
                      >
                        Завершить
                      </button>
                    )}
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
