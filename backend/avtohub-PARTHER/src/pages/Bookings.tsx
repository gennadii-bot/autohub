import { useCallback, useEffect, useMemo, useState } from "react";
import { getBookings, updateBookingStatus } from "../api/partnerApi";
import type { PartnerBooking, PartnerBookingClient } from "../api/partnerApi";
import { Loading } from "../components/Loading";

function clientDisplayName(b: PartnerBooking): string {
  const c = b.client;
  if (c && (c.first_name || c.last_name)) {
    return [c.first_name, c.last_name].filter(Boolean).join(" ").trim();
  }
  return b.client_email || "Клиент";
}

function clientCarString(c: PartnerBookingClient | null | undefined): string {
  if (!c) return "—";
  const parts = [c.car_brand, c.car_model, c.car_year ? String(c.car_year) : null].filter(Boolean);
  return parts.length ? parts.join(" ") : "—";
}

function formatDateTime(dateStr: string, timeStr: string): string {
  try {
    const d = new Date(dateStr + "T" + (timeStr?.slice(0, 5) || "00:00"));
    return d.toLocaleString("ru-KZ", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return `${dateStr} ${timeStr}`;
  }
}

function ClientProfileModal({
  client,
  clientEmail,
  onClose,
}: {
  client: PartnerBookingClient | null | undefined;
  clientEmail: string;
  onClose: () => void;
}) {
  const name = client
    ? [client.first_name, client.last_name].filter(Boolean).join(" ").trim() || clientEmail
    : clientEmail;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-lg font-semibold text-white">Профиль клиента</h3>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-slate-500">Имя</dt>
            <dd className="text-white">{name}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Email</dt>
            <dd className="text-white">{clientEmail}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Телефон</dt>
            <dd className="text-white">{client?.phone || "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Автомобиль</dt>
            <dd className="text-white">{clientCarString(client)}</dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl border border-slate-600 px-4 py-2 text-slate-300 hover:bg-slate-800"
        >
          Закрыть
        </button>
      </div>
    </div>
  );
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Ожидает",
  accepted: "Подтверждена",
  completed: "Выполнена",
  cancelled: "Отменена",
};

const STATUS_OPTIONS = [
  { value: "", label: "Все" },
  { value: "pending", label: "Ожидает" },
  { value: "accepted", label: "Подтверждена" },
  { value: "completed", label: "Выполнена" },
  { value: "cancelled", label: "Отменена" },
];

export function Bookings() {
  const [bookings, setBookings] = useState<PartnerBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [actionId, setActionId] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<{ id: number; status: string; label: string } | null>(null);
  const [profileClient, setProfileClient] = useState<PartnerBooking | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getBookings();
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

  const filtered = useMemo(() => {
    let list = [...bookings];
    if (statusFilter) list = list.filter((b) => b.status === statusFilter);
    list.sort((a, b) => {
      const da = `${a.date} ${a.time}`;
      const db = `${b.date} ${b.time}`;
      return db.localeCompare(da);
    });
    return list;
  }, [bookings, statusFilter]);

  const openConfirm = (id: number, newStatus: string, label: string) => {
    setConfirm({ id, status: newStatus, label });
  };

  const handleStatus = async () => {
    if (!confirm) return;
    const { id, status: newStatus } = confirm;
    setConfirm(null);
    setActionId(id);
    try {
      const updated = await updateBookingStatus(id, newStatus);
      setBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
    } catch {
      /**/
    } finally {
      setActionId(null);
    }
  };

  if (loading) return <Loading />;
  if (error) return <p className="text-red-400">{error}</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">Записи</h1>
      <div className="flex flex-wrap items-center gap-4">
        <label className="text-sm text-slate-400">Статус:</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value || "all"} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 py-12 text-center text-slate-400">
          Нет записей
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-800/50">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Клиент</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Авто</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Услуга</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Дата и время</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Статус</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Цена</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-300">Действия</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr
                  key={b.id}
                  className="border-b border-slate-700/50 last:border-0 hover:bg-slate-800/50"
                >
                  <td className="px-4 py-4">
                    <button
                      type="button"
                      onClick={() => setProfileClient(b)}
                      className="text-left font-medium text-emerald-400 hover:text-emerald-300 hover:underline"
                    >
                      {clientDisplayName(b)}
                    </button>
                  </td>
                  <td className="px-4 py-4 text-slate-300">{clientCarString(b.client)}</td>
                  <td className="px-4 py-4 text-slate-300">{b.service_name}</td>
                  <td className="px-4 py-4 text-slate-300">
                    {formatDateTime(b.date, b.time)}
                  </td>
                  <td className="px-4 py-4 text-slate-300">{STATUS_LABELS[b.status] ?? b.status}</td>
                  <td className="px-4 py-4 text-slate-300">
                    {b.price != null ? `${b.price} ₸` : "—"}
                  </td>
                  <td className="px-4 py-4 text-right">
                    {b.status === "pending" && (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openConfirm(b.id, "accepted", "принять запись")}
                          disabled={actionId !== null}
                          className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-sm text-emerald-400 disabled:opacity-50"
                        >
                          Принять
                        </button>
                        <button
                          type="button"
                          onClick={() => openConfirm(b.id, "cancelled", "отменить запись")}
                          disabled={actionId !== null}
                          className="rounded-lg bg-red-500/20 px-3 py-1.5 text-sm text-red-400 disabled:opacity-50"
                        >
                          Отменить
                        </button>
                      </div>
                    )}
                    {b.status === "accepted" && (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openConfirm(b.id, "completed", "завершить запись")}
                          disabled={actionId !== null}
                          className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-sm text-emerald-400 disabled:opacity-50"
                        >
                          Завершить
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {profileClient && (
        <ClientProfileModal
          client={profileClient.client}
          clientEmail={profileClient.client_email}
          onClose={() => setProfileClient(null)}
        />
      )}

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6">
            <p className="mb-4 text-slate-300">
              Вы уверены, что хотите {confirm.label}?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleStatus}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-500"
              >
                Подтвердить
              </button>
              <button
                type="button"
                onClick={() => setConfirm(null)}
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
