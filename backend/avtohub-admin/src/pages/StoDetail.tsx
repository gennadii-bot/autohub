import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { getStoDetail } from "../api/admin";

interface StoDetailData {
  id: number;
  name: string;
  address?: string;
  description?: string;
  phone?: string;
  whatsapp?: string;
  status: string;
  rating: number;
  city?: { id: number; name: string };
  owner?: { id: number; email: string };
  services?: Array<{ id: number; name: string; price: number }>;
  total_bookings?: number;
  completed_bookings?: number;
  revenue?: number;
  clients_count?: number;
}

export function StoDetail() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<StoDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getStoDetail(parseInt(id, 10));
      setData(res as StoDetailData);
    } catch {
      setError("Не удалось загрузить данные СТО");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500" />
        <p className="text-slate-400">Загрузка...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Link
          to="/stos"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад к списку
        </Link>
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-red-400">
          <p>{error ?? "СТО не найдено"}</p>
          <button
            type="button"
            onClick={load}
            className="mt-4 rounded-lg bg-red-500/20 px-4 py-2 text-sm hover:bg-red-500/30"
          >
            Повторить
          </button>
        </div>
      </div>
    );
  }

  const owner = data.owner;
  const city = data.city;
  const services = data.services ?? [];

  return (
    <div className="space-y-8">
      <Link
        to="/stos"
        className="inline-flex items-center gap-2 text-slate-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад к списку
      </Link>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-white">{data.name}</h1>
          <Link
            to={`/stos/${id}/analytics`}
            className="flex items-center gap-2 rounded-lg border border-emerald-500/50 bg-emerald-500/20 px-4 py-2 text-emerald-400 hover:bg-emerald-500/30"
          >
            <BarChart3 className="h-4 w-4" />
            Посмотреть аналитику
          </Link>
        </div>

        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-slate-400">ID</dt>
            <dd className="text-white">{String(data.id)}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-400">Владелец</dt>
            <dd className="text-white">
              {owner ? (
                <Link
                  to={`/users/${owner.id}`}
                  className="text-emerald-400 hover:underline"
                >
                  {String(owner.email)}
                </Link>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-slate-400">Телефон</dt>
            <dd className="text-white">{String(data.phone ?? "—")}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-400">WhatsApp</dt>
            <dd className="text-white">{String(data.whatsapp ?? "—")}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-400">Город</dt>
            <dd className="text-white">{String(city?.name ?? "—")}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-400">Адрес</dt>
            <dd className="text-white">{String(data.address ?? "—")}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-400">Рейтинг</dt>
            <dd className="text-white">{Number(data.rating ?? 0).toFixed(1)}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-400">Статус</dt>
            <dd className="text-white">{String(data.status)}</dd>
          </div>
          {data.description && (
            <div className="sm:col-span-2">
              <dt className="text-sm text-slate-400">Описание</dt>
              <dd className="text-slate-300">{String(data.description)}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
          <p className="text-sm text-slate-400">Всего записей</p>
          <p className="text-2xl font-semibold text-white">
            {String(data.total_bookings ?? 0)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
          <p className="text-sm text-slate-400">Выполнено</p>
          <p className="text-2xl font-semibold text-white">
            {String(data.completed_bookings ?? 0)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
          <p className="text-sm text-slate-400">Выручка</p>
          <p className="text-2xl font-semibold text-white">
            {Number(data.revenue ?? 0).toLocaleString("ru-RU")} ₸
          </p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
          <p className="text-sm text-slate-400">Клиентов</p>
          <p className="text-2xl font-semibold text-white">
            {String(data.clients_count ?? 0)}
          </p>
        </div>
      </div>

      {services.length > 0 && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Услуги</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="px-4 py-2 text-left text-sm text-slate-400">ID</th>
                  <th className="px-4 py-2 text-left text-sm text-slate-400">Название</th>
                  <th className="px-4 py-2 text-left text-sm text-slate-400">Цена</th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => (
                  <tr key={s.id} className="border-b border-slate-700/50">
                    <td className="px-4 py-3 text-slate-300">{s.id}</td>
                    <td className="px-4 py-3 text-white">{s.name}</td>
                    <td className="px-4 py-3 text-slate-300">
                      {Number(s.price ?? 0).toLocaleString("ru-RU")} ₸
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
