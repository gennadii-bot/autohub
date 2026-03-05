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
import { Users, Building2, Calendar } from "lucide-react";
import { getAnalyticsChartData } from "../api/admin";
import type { AnalyticsPoint } from "../api/admin";

type ChartType = "users" | "stos" | "services";
type Period = 7 | 30 | 90 | 365;

const TYPE_OPTIONS: { value: ChartType; label: string; icon: typeof Users }[] = [
  { value: "users", label: "Активность пользователей", icon: Users },
  { value: "stos", label: "Добавление СТО", icon: Building2 },
  { value: "services", label: "Выполненные услуги", icon: Calendar },
];

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 7, label: "7 дней" },
  { value: 30, label: "30 дней" },
  { value: 90, label: "90 дней" },
  { value: 365, label: "365 дней" },
];

export function AnalyticsChart() {
  const [type, setType] = useState<ChartType>("users");
  const [period, setPeriod] = useState<Period>(30);
  const [data, setData] = useState<AnalyticsPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAnalyticsChartData(type, period);
      setData(Array.isArray(result) ? result : []);
    } catch {
      setError("Не удалось загрузить аналитику");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [type, period]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-sm" style={{ minHeight: 300 }}>
      <h2 className="mb-6 text-lg font-semibold text-white">Аналитика</h2>

      {/* Переключатель типа */}
      <div className="mb-4 flex flex-wrap gap-2">
        {TYPE_OPTIONS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => setType(value)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition-colors ${
              type === value
                ? "bg-emerald-500/30 text-emerald-400 ring-1 ring-emerald-500/50"
                : "bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-300"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Переключатель периода */}
      <div className="mb-6 flex flex-wrap gap-2">
        {PERIOD_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setPeriod(value)}
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
              period === value
                ? "bg-emerald-500/20 text-emerald-400"
                : "text-slate-400 hover:bg-slate-700 hover:text-slate-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* График */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-400">
          {error}
          <button
            type="button"
            onClick={load}
            className="ml-4 rounded bg-red-500/20 px-3 py-1 text-sm hover:bg-red-500/30"
          >
            Повторить
          </button>
        </div>
      ) : data.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-slate-500">
          Нет данных за выбранный период
        </div>
      ) : (
        <div style={{ width: "100%", height: 300, minHeight: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="date"
                stroke="#94a3b8"
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                tickFormatter={(v) => {
                  const d = new Date(v);
                  return `${d.getDate()}.${d.getMonth() + 1}`;
                }}
              />
              <YAxis
                stroke="#94a3b8"
                tick={{ fill: "#94a3b8", fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "#94a3b8" }}
                formatter={(value: number | undefined) => [value ?? 0, "Кол-во"]}
                labelFormatter={(label) => `Дата: ${String(label)}`}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: "#10b981", r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
