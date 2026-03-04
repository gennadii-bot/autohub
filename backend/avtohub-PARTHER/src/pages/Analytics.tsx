import { useCallback, useEffect, useState } from "react";
import { getAnalytics } from "../api/partnerApi";
import type { PartnerAnalytics } from "../api/partnerApi";
import { Loading } from "../components/Loading";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const PERIODS = [
  { value: 7, label: "7 дней" },
  { value: 30, label: "30 дней" },
  { value: 90, label: "90 дней" },
];

function formatDate(d: string): string {
  try {
    const [, m, day] = d.split("-");
    return `${day}.${m}`;
  } catch {
    return d;
  }
}

export function Analytics() {
  const [period, setPeriod] = useState(30);
  const [data, setData] = useState<PartnerAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getAnalytics(period);
      setData(res);
    } catch {
      setError("Не удалось загрузить аналитику");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  const chartData = data?.chart.map((c) => ({ date: formatDate(c.date), bookings: c.bookings, revenue: c.revenue })) ?? [];

  if (loading) return <Loading />;
  if (error) return <p className="text-red-400">{error}</p>;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-white">Аналитика</h1>
      <div className="flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setPeriod(p.value)}
            className={period === p.value ? "rounded-lg bg-emerald-500/20 px-4 py-2 text-sm text-emerald-400" : "rounded-lg bg-slate-700/50 px-4 py-2 text-sm text-slate-400 hover:text-white"}
          >
            {p.label}
          </button>
        ))}
      </div>
      {data && (
        <p className="text-slate-400">
          Общий доход: <span className="font-semibold text-white">{data.total_revenue.toFixed(0)} ₸</span>
        </p>
      )}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6" style={{ minHeight: 300 }}>
        <h2 className="mb-4 text-lg font-semibold text-white">Записи по дням</h2>
        {chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <p>Нет данных за выбранный период</p>
          </div>
        ) : (
          <div style={{ width: "100%", height: 300, minHeight: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }} />
                <Line type="monotone" dataKey="bookings" stroke="#10b981" strokeWidth={2} name="Записи" dot={{ fill: "#10b981", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6" style={{ minHeight: 300 }}>
        <h2 className="mb-4 text-lg font-semibold text-white">Доход по дням</h2>
        {chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <p>Нет данных за выбранный период</p>
          </div>
        ) : (
          <div style={{ width: "100%", height: 300, minHeight: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }} />
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} name="Доход, ₸" dot={{ fill: "#3b82f6", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      {data?.popular_services && data.popular_services.length > 0 && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Популярные услуги</h2>
          <ul className="space-y-2">
            {data.popular_services.map((s, i) => (
              <li key={i} className="flex justify-between text-slate-300">
                <span>{s.service_name}</span>
                <span className="text-emerald-400">{s.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
