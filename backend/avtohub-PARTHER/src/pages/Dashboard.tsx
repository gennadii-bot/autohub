import { useCallback, useEffect, useState } from "react";
import { getDashboard, getAnalyticsRange } from "../api/partnerApi";
import type { PartnerDashboardData, PartnerAnalyticsFull } from "../api/partnerApi";
import { StatsCard } from "../components/StatsCard";
import { StatsChart } from "../components/StatsChart";
import { Loading } from "../components/Loading";
import { Calendar, CheckCircle, XCircle, DollarSign, Star } from "lucide-react";

const CARDS = [
  { label: "Всего записей", key: "total_bookings", icon: Calendar },
  { label: "Выполнено", key: "completed", icon: CheckCircle },
  { label: "Отменено", key: "cancelled", icon: XCircle },
  { label: "Доход", key: "revenue", icon: DollarSign },
];

function defaultFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function defaultTo(): string {
  return new Date().toISOString().slice(0, 10);
}

export function Dashboard() {
  const [stats, setStats] = useState<PartnerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [from, setFrom] = useState(() => defaultFrom());
  const [to, setTo] = useState(() => defaultTo());
  const [analytics, setAnalytics] = useState<PartnerAnalyticsFull | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getDashboard();
      setStats(data);
    } catch {
      setError("Не удалось загрузить статистику");
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAnalytics = useCallback(async () => {
    if (!from || !to) return;
    setAnalyticsLoading(true);
    try {
      const data = await getAnalyticsRange(from, to);
      setAnalytics(data);
    } catch {
      setAnalytics(null);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [from, to]);

  const applyFilter = useCallback(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  if (loading) return <Loading />;
  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-white sm:text-3xl">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map(({ label, key, icon: Icon }) => {
          let value: string | number = stats ? (stats[key as keyof PartnerDashboardData] as number) : "—";
          if (key === "revenue" && typeof value === "number") value = value.toFixed(0);
          return <StatsCard key={key} label={label} value={value} icon={Icon} />;
        })}
      </div>

      {/* Date filter + chart */}
      <div className="space-y-4">
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
          <button
            type="button"
            onClick={applyFilter}
            disabled={analyticsLoading}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            Применить
          </button>
        </div>

        {analytics?.kpi && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
              <div className="flex items-center gap-3">
                <Calendar className="h-6 w-6 text-emerald-400" />
                <div>
                  <p className="text-sm text-slate-400">Записей за период</p>
                  <p className="text-2xl font-semibold text-white">{analytics.kpi.bookings_total}</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-emerald-400" />
                <div>
                  <p className="text-sm text-slate-400">Выполнено</p>
                  <p className="text-2xl font-semibold text-white">{analytics.kpi.completed}</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
              <div className="flex items-center gap-3">
                <DollarSign className="h-6 w-6 text-emerald-400" />
                <div>
                  <p className="text-sm text-slate-400">Выручка</p>
                  <p className="text-2xl font-semibold text-white">
                    {analytics.kpi.revenue.toLocaleString("ru-KZ", { maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
              <div className="flex items-center gap-3">
                <Star className="h-6 w-6 text-emerald-400" />
                <div>
                  <p className="text-sm text-slate-400">Рейтинг</p>
                  <p className="text-2xl font-semibold text-white">{analytics.kpi.average_rating.toFixed(1)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {analyticsLoading ? (
          <div className="flex h-[350px] items-center justify-center rounded-xl border border-slate-700 bg-slate-800/50">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500" />
          </div>
        ) : !analytics?.chart?.length ? (
          <div className="flex h-[350px] items-center justify-center rounded-xl border border-slate-700 bg-slate-800/50 text-slate-500">
            Нет данных за выбранный период
          </div>
        ) : (
          <StatsChart data={analytics.chart} title="Записи по дням (ваши СТО)" variant="partner" />
        )}

        {analytics?.top_services && analytics.top_services.length > 0 && (
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">Топ услуг</h2>
            <ul className="space-y-2">
              {analytics.top_services.map((s, i) => (
                <li key={i} className="flex justify-between text-slate-300">
                  <span>{s.service_name}</span>
                  <span className="text-emerald-400">
                    {s.bookings_count} записей · {s.revenue.toLocaleString("ru-KZ")} ₸
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
