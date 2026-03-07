import { useCallback, useEffect, useState } from "react";
import { getAnalytics } from "../api/admin";
import type { AnalyticsResponse } from "../api/admin";
import { normalizeChartData, normalizeByCity } from "../utils/analytics";

export interface AnalyticsFilters {
  from: string;
  to: string;
  groupBy: "day" | "week" | "month";
  cityId: number | "";
  stoId: number | "";
  compareEnabled: boolean;
  compareFrom: string;
  compareTo: string;
}

export interface UseAdminAnalyticsResult {
  data: AnalyticsResponse | null;
  chartData: ReturnType<typeof normalizeChartData>;
  pieData: ReturnType<typeof normalizeByCity>;
  kpi: AnalyticsResponse["kpi"] | null;
  comparisonData: ReturnType<typeof normalizeChartData>;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  filters: AnalyticsFilters;
  setFilters: React.Dispatch<React.SetStateAction<AnalyticsFilters>>;
}

const defaultFilters: AnalyticsFilters = {
  from: (() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  })(),
  to: new Date().toISOString().slice(0, 10),
  groupBy: "day",
  cityId: "",
  stoId: "",
  compareEnabled: false,
  compareFrom: "",
  compareTo: "",
};

export function useAdminAnalytics(): UseAdminAnalyticsResult {
  const [filters, setFilters] = useState<AnalyticsFilters>(defaultFilters);
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    const { from, to, groupBy, cityId, stoId, compareEnabled, compareFrom, compareTo } = filters;
    if (!from || !to) return;

    setLoading(true);
    setError(null);
    try {
      const params: Parameters<typeof getAnalytics>[0] = {
        from,
        to,
        group_by: groupBy,
      };
      if (cityId) params.city_id = Number(cityId);
      if (stoId) params.sto_id = Number(stoId);
      if (compareEnabled && compareFrom && compareTo) {
        params.compare_from = compareFrom;
        params.compare_to = compareTo;
      }
      const response = await getAnalytics(params);
      const safe = (response != null && typeof response === "object" ? response : null) as AnalyticsResponse | null;
      setData(safe);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      setData(null);
      console.error("[useAdminAnalytics] fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const raw = data ?? null;
  const current = raw?.current ?? null;
  const groupedData = Array.isArray(raw?.grouped_data) ? raw.grouped_data : null;
  const byCityRaw = raw?.by_city ?? null;
  const comparisonRaw = raw?.comparison ?? null;

  const chartData = normalizeChartData(groupedData ?? current);
  const pieData = normalizeByCity(byCityRaw);
  const comparisonData = normalizeChartData(comparisonRaw);
  const kpi = raw?.kpi ?? null;

  return {
    data: raw,
    chartData,
    pieData,
    kpi,
    comparisonData,
    loading,
    error,
    refetch,
    filters,
    setFilters,
  };
}
