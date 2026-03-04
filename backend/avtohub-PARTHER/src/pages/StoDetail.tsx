import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getStoDetail, getStoAnalytics, getStoServices } from "../api/admin";

interface StoDetail {
  id: number;
  name: string;
  address: string;
  description: string | null;
  phone: string | null;
  whatsapp: string | null;
  status: string;
  rating: number;
  city: { id: number; name: string };
  owner: { id: number; email: string } | null;
}

interface StoService {
  service_id: number;
  name: string;
  category: string;
  price: number;
  duration_minutes: number;
}

interface StoAnalytics {
  total_bookings: number;
  completed: number;
  cancelled: number;
  revenue: number;
  average_rating: number;
  clients_count: number;
  popular_services: { service_name: string; count: number }[];
  chart: { date: string; bookings: number }[];
}

function formatDate(d: string): string {
  try {
    const [, m, day] = d.split("-");
    return `${day}.${m}`;
  } catch {
    return d;
  }
}

export function StoDetail() {
  const { id } = useParams<{ id: string }>();
  const stoId = id ? parseInt(id, 10) : 0;
  const [detail, setDetail] = useState<StoDetail | null>(null);
  const [services, setServices] = useState<StoService[]>([]);
  const [analytics, setAnalytics] = useState<StoAnalytics | null>(null);
  const [period, setPeriod] = useState<7 | 30 | 90 | 365>(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!stoId) return;
    setLoading(true);
    setError("");
    try {
      const [d, s, a] = await Promise.all([
        getStoDetail(stoId),
        getStoServices(stoId),
        getStoAnalytics(stoId, period),
      ]);
      setDetail(d as StoDetail);
      setServices((s as StoService[]) ?? []);
      setAnalytics(a as StoAnalytics);
    } catch {
      setError("Не удалось загрузить данные СТО");
      setDetail(null);
      setServices([]);
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, [stoId, period]);

  useEffect(() => {
    load();
  }, [load]);

  if (!stoId) {
    return (
      <div className="text-red-400">Неверный ID СТО</div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="space-y-4">
        <Link to="/stos" className="text-emerald-400 hover:text-emerald-300">
          ← Назад к списку
        </Link>
        <p className="text-red-400">{error || "СТО не найдено"}</p>
      </div>
    );
  }

  const chartData = (analytics?.chart ?? []).map((p) => ({
    date: formatDate(p.date),
    count: p.bookings,
  }));

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link to="/stos" className="text-emerald-400 hover:text-emerald-300">
          ← Назад
        </Link>
        <h1 className="text-2xl font-semibold text-white">{detail.name}</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
          <p className="text-sm text-slate-400">Записи</p>
          <p className="text-xl font-semibold text-white">{analytics?.total_bookings ?? 0}</p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
          <p className="text-sm text-slate-400">Выполнено</p>
          <p className="text-xl font-semibold text-white">{analytics?.completed ?? 0}</p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
          <p className="text-sm text-slate-400">Доход</p>
          <p className="text-xl font-semibold text-white">
            {(analytics?.revenue ?? 0).toLocaleString("ru-KZ")} ₸
          </p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
          <p className="text-sm text-slate-400">Рейтинг</p>
          <p className="text-xl font-semibold text-white">{analytics?.average_rating ?? detail.rating}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Информация</h2>
        <dl className="grid gap-2 sm:grid-cols-2">
          <dt className="text-slate-400">Город</dt>
          <dd className="text-white">{detail.city?.name ?? "—"}</dd>
          <dt className="text-slate-400">Адрес</dt>
          <dd className="text-white">{detail.address}</dd>
          <dt className="text-slate-400">Владелец</dt>
          <dd className="text-white">{detail.owner?.email ?? "—"}</dd>
          <dt className="text-slate-400">Телефон</dt>
          <dd className="text-white">{detail.phone ?? "—"}</dd>
          <dt className="text-slate-400">WhatsApp</dt>
          <dd className="text-white">{detail.whatsapp ?? "—"}</dd>
          <dt className="text-slate-400">Статус</dt>
          <dd className="text-white">{detail.status}</dd>
        </dl>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Услуги и цены</h2>
        {services.length === 0 ? (
          <p className="text-slate-400">Нет услуг</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="px-4 py-2 text-left text-sm text-slate-400">Услуга</th>
                  <th className="px-4 py-2 text-left text-sm text-slate-400">Категория</th>
                  <th className="px-4 py-2 text-left text-sm text-slate-400">Цена</th>
                  <th className="px-4 py-2 text-left text-sm text-slate-400">Длительность</th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => (
                  <tr key={s.service_id} className="border-b border-slate-700/50">
                    <td className="px-4 py-3 text-white">{s.name}</td>
                    <td className="px-4 py-3 text-slate-300">{s.category}</td>
                    <td className="px-4 py-3 text-slate-300">{s.price.toLocaleString("ru-KZ")} ₸</td>
                    <td className="px-4 py-3 text-slate-300">{s.duration_minutes} мин</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6" style={{ minHeight: 300 }}>
        <h2 className="mb-4 text-lg font-semibold text-white">График активности</h2>
        <div className="mb-4 flex gap-2">
          {([7, 30, 90, 365] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                period === p ? "bg-emerald-500/20 text-emerald-400" : "text-slate-400 hover:text-white"
              }`}
            >
              {p === 7 ? "7 дней" : p === 30 ? "30 дней" : p === 90 ? "90 дней" : "Год"}
            </button>
          ))}
        </div>
        {chartData.length === 0 ? (
          <p className="py-8 text-center text-slate-400">Нет данных</p>
        ) : (
          <div style={{ width: "100%", height: 300, minHeight: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                  }}
                />
                <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={{ fill: "#10b981", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {analytics && analytics.popular_services.length > 0 && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Популярные услуги</h2>
          <ul className="space-y-2">
            {analytics.popular_services.map((ps, i) => (
              <li key={i} className="flex justify-between text-slate-300">
                <span>{ps.service_name}</span>
                <span>{ps.count} записей</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
