import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ArrowLeft } from "lucide-react";
import { getStoAnalytics } from "../api/admin";

export function StoAnalytics() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<{ chart?: { date: string; bookings: number }[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getStoAnalytics(parseInt(id, 10), 30);
      setData(res as { chart?: { date: string; bookings: number }[] });
    } catch {
      setError("Не удалось загрузить аналитику");
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
        <p className="text-slate-400">Загрузка аналитики...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Link
          to={`/stos/${id}`}
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад к СТО
        </Link>
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-red-400">
          <p>{error ?? "Данные не найдены"}</p>
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

  const chartData = data.chart ?? [];

  return (
    <div className="space-y-8">
      <Link
        to={`/stos/${id}`}
        className="inline-flex items-center gap-2 text-slate-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад к СТО
      </Link>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6" style={{ minHeight: 300 }}>
        <h1 className="mb-6 text-2xl font-semibold text-white">Аналитика СТО</h1>
        {chartData.length === 0 ? (
          <p className="py-12 text-center text-slate-500">Нет данных за период</p>
        ) : (
          <div style={{ width: "100%", height: 300, minHeight: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
                <YAxis stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number | undefined) => [value ?? 0, "Записей"]}
                />
                <Line
                  type="monotone"
                  dataKey="bookings"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: "#10b981", r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
