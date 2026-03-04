import { useCallback, useEffect, useState } from "react";
import { getPartnerAnalyticsRange } from "../api/partner";
import type { PartnerAnalyticsFull } from "../api/partner";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function defaultFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function defaultTo(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(d: string): string {
  try {
    const [, m, day] = d.split("-");
    return `${day}.${m}`;
  } catch {
    return d;
  }
}

const PIE_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];

export function PartnerAnalytics() {
  const [from, setFrom] = useState(() => defaultFrom());
  const [to, setTo] = useState(() => defaultTo());
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("day");
  const [data, setData] = useState<PartnerAnalyticsFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!from || !to) return;
    setLoading(true);
    setError("");
    try {
      const res = await getPartnerAnalyticsRange(from, to, groupBy);
      setData(res);
    } catch {
      setError("Не удалось загрузить аналитику");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [from, to, groupBy]);

  useEffect(() => {
    load();
  }, [load]);

  const chartData =
    data?.chart.map((c) => ({
      date: formatDate(c.date),
      fullDate: c.date,
      bookings: c.bookings,
      completed: c.completed,
      revenue: c.revenue,
    })) ?? [];

  const pieData =
    data?.top_services.map((s) => ({
      name: s.service_name,
      value: s.bookings_count,
    })) ?? [];

  const hasData = chartData.length > 0 || pieData.length > 0;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-white">Аналитика</h1>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-slate-400">
          <span>С</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200"
          />
        </label>
        <label className="flex items-center gap-2 text-slate-400">
          <span>По</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200"
          />
        </label>
        <div className="flex gap-2">
          {(["day", "week", "month"] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGroupBy(g)}
              className={`rounded-lg px-3 py-2 text-sm ${
                groupBy === g
                  ? "bg-emerald-500/30 text-emerald-400"
                  : "bg-slate-700/50 text-slate-400 hover:bg-slate-700"
              }`}
            >
              {g === "day" ? "День" : g === "week" ? "Неделя" : "Месяц"}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          Применить
        </button>
      </div>

      {data?.kpi && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
            <p className="text-sm text-slate-400">Записи</p>
            <p className="text-2xl font-semibold text-white">{data.kpi.bookings_total}</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
            <p className="text-sm text-slate-400">Выполнено</p>
            <p className="text-2xl font-semibold text-white">{data.kpi.completed}</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
            <p className="text-sm text-slate-400">Выручка</p>
            <p className="text-2xl font-semibold text-white">
              {data.kpi.revenue.toLocaleString("ru-KZ", { maximumFractionDigits: 0 })} ₸
            </p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
            <p className="text-sm text-slate-400">Рейтинг</p>
            <p className="text-2xl font-semibold text-white">{data.kpi.average_rating.toFixed(1)}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex h-[350px] items-center justify-center rounded-xl border border-slate-700 bg-slate-800/50">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500" />
        </div>
      ) : error ? (
        <p className="text-red-400">{error}</p>
      ) : !hasData ? (
        <div className="flex h-[350px] items-center justify-center rounded-xl border border-slate-700 bg-slate-800/50 text-slate-500">
          Нет данных за выбранный период
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">Записи по периодам</h2>
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #334155",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "#94a3b8" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="bookings"
                    name="Записи"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: "#10b981", r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">Выручка</h2>
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #334155",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "#94a3b8" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Выручка, ₸"
                    stroke="#8b5cf6"
                    fill="#8b5cf6"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          {pieData.length > 0 && (
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 lg:col-span-2">
              <h2 className="mb-4 text-lg font-semibold text-white">Популярные услуги</h2>
              <div style={{ width: "100%", height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={{ stroke: "#94a3b8" }}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #334155",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [value, "Записей"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
