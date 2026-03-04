import { useCallback, useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getAnalytics } from "../api/admin";

const PERIODS = [
  { value: 7, label: "7 дней" },
  { value: 30, label: "30 дней" },
  { value: 90, label: "90 дней" },
  { value: 365, label: "Год" },
] as const;

const TYPES = [
  { value: "users" as const, label: "Активность пользователей" },
  { value: "stos" as const, label: "Добавление СТО" },
  { value: "services" as const, label: "Выполненные услуги" },
] as const;

function formatDate(d: string): string {
  try {
    const [, m, day] = d.split("-");
    return `${day}.${m}`;
  } catch {
    return d;
  }
}

export function AnalyticsChart() {
  const [period, setPeriod] = useState<7 | 30 | 90 | 365>(30);
  const [type, setType] = useState<"users" | "stos" | "services">("users");
  const [data, setData] = useState<{ date: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getAnalytics(type, period);
      setData(res.map((p) => ({ date: formatDate(p.date), count: p.count })));
    } catch {
      setError("Не удалось загрузить график");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [period, type]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-sm" style={{ minHeight: 300 }}>
      <h2 className="mb-4 text-lg font-semibold text-white">Аналитика</h2>
      <div className="mb-4 flex flex-wrap gap-2">
        {TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setType(t.value)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              type === t.value
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setPeriod(p.value as 7 | 30 | 90 | 365)}
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
              period === p.value
                ? "bg-emerald-500/20 text-emerald-400"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500" />
        </div>
      ) : error ? (
        <p className="py-8 text-center text-red-400">{error}</p>
      ) : data.length === 0 ? (
        <p className="py-8 text-center text-slate-400">Нет данных за выбранный период</p>
      ) : (
        <div style={{ width: "100%", height: 300, minHeight: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
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
                dataKey="count"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: "#10b981", r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
