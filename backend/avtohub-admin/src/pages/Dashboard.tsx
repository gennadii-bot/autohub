import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { getAdminStats, getAnalytics } from "../api/admin";
import type { AnalyticsResponse } from "../api/admin";
import { DashboardStats } from "../components/DashboardStats";
import { StatsChart } from "../components/StatsChart";
import { AnalyticsKPICards } from "../components/AnalyticsKPICards";
import { getCities, getStos, getBookings } from "../api/data";
import { normalizeChartData, normalizeByCity } from "../utils/analytics";
import type { AdminStats } from "../types/admin";
import type { AdminBooking } from "../types/admin";

const REFRESH_INTERVAL_MS = 30_000;

function defaultFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function defaultTo(): string {
  return new Date().toISOString().slice(0, 10);
}

function compareFrom(from: string): string {
  const d = new Date(from);
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function SkeletonLoader() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 w-64 rounded bg-slate-700" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-slate-700/50" />
        ))}
      </div>
      <div className="h-[350px] rounded-xl bg-slate-700/50" />
    </div>
  );
}

function EmptyState({ message = "Нет данных за выбранный период" }: { message?: string }) {
  return (
    <div className="flex h-[280px] items-center justify-center rounded-xl border border-slate-700 bg-slate-800/50 text-slate-500">
      {message}
    </div>
  );
}

export function Dashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [from, setFrom] = useState(() => defaultFrom());
  const [to, setTo] = useState(() => defaultTo());
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [compareFromVal, setCompareFromVal] = useState("");
  const [compareToVal, setCompareToVal] = useState("");
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("day");
  const [cityId, setCityId] = useState<number | "">("");
  const [stoId, setStoId] = useState<number | "">("");
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [cities, setCities] = useState<{ id: number; name: string }[]>([]);
  const [stos, setStos] = useState<{ id: number; name: string; city_id: number }[]>([]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const data = await getAdminStats();
      setStats(data ?? null);
    } catch (err) {
      console.error("[Dashboard] Stats error:", err);
      setStatsError("Не удалось загрузить статистику");
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadFilters = useCallback(async () => {
    try {
      const [citiesData, stosData] = await Promise.all([getCities(), getStos(1, 500)]);
      setCities(Array.isArray(citiesData) ? citiesData : []);
      const items = stosData?.items ?? [];
      setStos(
        items.map((s) => ({
          id: s.id,
          name: s.name,
          city_id: s.city?.id ?? 0,
        }))
      );
    } catch {
      setCities([]);
      setStos([]);
    }
  }, []);

  const loadAnalytics = useCallback(async () => {
    if (!from || !to) return;
    setAnalyticsLoading(true);
    try {
      const params: Parameters<typeof getAnalytics>[0] = {
        from,
        to,
        group_by: groupBy,
      };
      if (cityId) params.city_id = Number(cityId);
      if (stoId) params.sto_id = Number(stoId);
      if (compareEnabled && compareFromVal && compareToVal) {
        params.compare_from = compareFromVal;
        params.compare_to = compareToVal;
      }
      const response = await getAnalytics(params);
      const safe = response != null && typeof response === "object" ? (response as AnalyticsResponse) : null;
      setAnalytics(safe);
    } catch (err) {
      console.error("[Dashboard] Analytics error:", err);
      setAnalytics(null);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [from, to, groupBy, cityId, stoId, compareEnabled, compareFromVal, compareToVal]);

  const loadBookings = useCallback(async () => {
    setBookingsLoading(true);
    try {
      const data = await getBookings({
        date_from: from,
        date_to: to,
        ...(stoId ? { sto_id: Number(stoId) } : {}),
        limit: 100,
      });
      setBookings(Array.isArray(data) ? data : []);
    } catch {
      setBookings([]);
    } finally {
      setBookingsLoading(false);
    }
  }, [from, to, stoId]);

  const applyFilter = useCallback(() => {
    loadAnalytics();
    loadBookings();
  }, [loadAnalytics, loadBookings]);

  useEffect(() => {
    loadStats();
    loadFilters();
  }, [loadStats, loadFilters]);

  useEffect(() => {
    if (REFRESH_INTERVAL_MS && !statsError) {
      const id = setInterval(loadStats, REFRESH_INTERVAL_MS);
      return () => clearInterval(id);
    }
  }, [loadStats, statsError]);

  useEffect(() => {
    if (compareEnabled && !compareFromVal && from) setCompareFromVal(compareFrom(from));
    if (compareEnabled && !compareToVal && from) setCompareToVal(from);
  }, [compareEnabled, from, compareFromVal, compareToVal]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const data = analytics ?? null;
  const groupedData = Array.isArray(data?.grouped_data) ? data.grouped_data : null;
  const current = data?.current ?? null;
  const byCityRaw = data?.by_city ?? null;
  const comparisonRaw = data?.comparison ?? null;
  const kpi = data?.kpi ?? null;

  const chartData = normalizeChartData(groupedData ?? current);
  const pieData = normalizeByCity(byCityRaw);
  const comparisonData = normalizeChartData(comparisonRaw);

  const hasChartData = chartData.length > 0;
  const hasPieData = pieData.length > 0;
  const hasAnyData = hasChartData || hasPieData;

  if (statsLoading && stats == null) {
    return (
      <div className="space-y-8">
        <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
        <SkeletonLoader />
      </div>
    );
  }

  if (statsError && stats == null) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-red-400">
          <p>{statsError}</p>
          <button
            type="button"
            onClick={loadStats}
            className="mt-4 rounded-lg bg-red-500/20 px-4 py-2 text-sm hover:bg-red-500/30"
          >
            Повторить
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">Dashboard</h1>
        <button
          type="button"
          onClick={loadStats}
          disabled={statsLoading}
          className="flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm text-slate-300 transition-colors hover:border-emerald-500/50 hover:bg-slate-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${statsLoading ? "animate-spin" : ""}`} />
          Обновить
        </button>
      </div>

      <DashboardStats stats={stats} />

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
          <div className="flex gap-2">
            {(["day", "week", "month"] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGroupBy(g)}
                className={`rounded-lg px-3 py-2 text-sm ${
                  groupBy === g ? "bg-emerald-500/30 text-emerald-400" : "bg-slate-700/50 text-slate-400 hover:bg-slate-700"
                }`}
              >
                {g === "day" ? "День" : g === "week" ? "Неделя" : "Месяц"}
              </button>
            ))}
          </div>
          <select
            value={cityId}
            onChange={(e) => {
              setCityId(e.target.value ? Number(e.target.value) : "");
              setStoId("");
            }}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200"
          >
            <option value="">Все города</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={stoId}
            onChange={(e) => setStoId(e.target.value ? Number(e.target.value) : "")}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200"
          >
            <option value="">Все СТО</option>
            {(cityId ? stos.filter((s) => s.city_id === Number(cityId)) : stos).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-slate-400">
            <input
              type="checkbox"
              checked={compareEnabled}
              onChange={(e) => setCompareEnabled(e.target.checked)}
              className="rounded border-slate-600"
            />
            Сравнить
          </label>
          {compareEnabled && (
            <>
              <label className="flex items-center gap-2 text-slate-400">
                <span>Сравн. с</span>
                <input
                  type="date"
                  value={compareFromVal}
                  onChange={(e) => setCompareFromVal(e.target.value)}
                  className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200"
                />
              </label>
              <label className="flex items-center gap-2 text-slate-400">
                <span>по</span>
                <input
                  type="date"
                  value={compareToVal}
                  onChange={(e) => setCompareToVal(e.target.value)}
                  className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200"
                />
              </label>
            </>
          )}
          <button
            type="button"
            onClick={applyFilter}
            disabled={analyticsLoading}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            Применить
          </button>
        </div>

        {kpi != null && typeof kpi === "object" && (
          <AnalyticsKPICards kpi={kpi} />
        )}

        {analyticsLoading ? (
          <div className="flex h-[350px] items-center justify-center rounded-xl border border-slate-700 bg-slate-800/50">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500" />
          </div>
        ) : !hasAnyData ? (
          <EmptyState message="Нет данных за выбранный период" />
        ) : (
          <>
            <div className="grid gap-6 lg:grid-cols-2">
              {hasChartData ? (
                <>
                  <StatsChart
                    data={chartData}
                    comparisonData={comparisonData.length > 0 ? comparisonData : undefined}
                    title="Пользователи, записи, СТО"
                  />
                  <StatsChart data={chartData} variant="area" title="Выручка" dataKey="revenue" />
                  <StatsChart data={chartData} variant="bar" title="Записи по периодам" dataKey="bookings" />
                </>
              ) : (
                <EmptyState message="Нет данных для графиков" />
              )}
              {hasPieData ? (
                <StatsChart data={pieData} variant="pie" title="Распределение по городам" />
              ) : null}
            </div>

            {hasChartData && (
              <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
                <h2 className="p-4 text-lg font-semibold text-white">Данные по периодам</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-600 bg-slate-800/80">
                        <th className="px-4 py-3 text-left text-slate-400">Дата</th>
                        <th className="px-4 py-3 text-right text-slate-400">Пользователи</th>
                        <th className="px-4 py-3 text-right text-slate-400">Записи</th>
                        <th className="px-4 py-3 text-right text-slate-400">Выполнено</th>
                        <th className="px-4 py-3 text-right text-slate-400">СТО</th>
                        <th className="px-4 py-3 text-right text-slate-400">Выручка</th>
                        <th className="px-4 py-3 text-right text-slate-400">Рейтинг</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chartData.map((row, i) => (
                        <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                          <td className="px-4 py-3 text-slate-200">{row.date}</td>
                          <td className="px-4 py-3 text-right text-slate-300">{row.users ?? 0}</td>
                          <td className="px-4 py-3 text-right text-slate-300">{row.bookings ?? 0}</td>
                          <td className="px-4 py-3 text-right text-slate-300">{row.bookings_completed ?? 0}</td>
                          <td className="px-4 py-3 text-right text-slate-300">{row.stos ?? 0}</td>
                          <td className="px-4 py-3 text-right text-slate-300">{(row.revenue ?? 0).toLocaleString("ru-KZ")}</td>
                          <td className="px-4 py-3 text-right text-slate-300">{(row.average_rating ?? 0).toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
              <h2 className="p-4 text-lg font-semibold text-white">Записи</h2>
              {bookingsLoading ? (
                <div className="flex h-32 items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500" />
                </div>
              ) : bookings.length === 0 ? (
                <EmptyState message="Нет записей за период" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-600 bg-slate-800/80">
                        <th className="px-4 py-3 text-left text-slate-400">Дата</th>
                        <th className="px-4 py-3 text-left text-slate-400">СТО</th>
                        <th className="px-4 py-3 text-left text-slate-400">Услуга</th>
                        <th className="px-4 py-3 text-left text-slate-400">Клиент</th>
                        <th className="px-4 py-3 text-left text-slate-400">Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((b) => (
                        <tr key={b.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                          <td className="px-4 py-3 text-slate-200">{b.date}</td>
                          <td className="px-4 py-3 text-slate-300">{b.sto_name ?? "—"}</td>
                          <td className="px-4 py-3 text-slate-300">{b.service_name ?? "—"}</td>
                          <td className="px-4 py-3 text-slate-300">{b.client_email ?? "—"}</td>
                          <td className="px-4 py-3 text-slate-300">{b.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
