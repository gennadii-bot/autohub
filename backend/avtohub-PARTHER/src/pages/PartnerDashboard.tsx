import { useCallback, useEffect, useState } from "react";
import { getPartnerDashboard } from "../api/partner";
import type { PartnerDashboard as DashboardType } from "../api/partner";
import { Calendar, CheckCircle, XCircle, DollarSign, Star } from "lucide-react";

const CARDS: Array<{
  label: string;
  key: keyof DashboardType;
  icon: typeof Calendar;
}> = [
  { label: "Всего записей", key: "total_bookings", icon: Calendar },
  { label: "Выполнено", key: "completed", icon: CheckCircle },
  { label: "Отменено", key: "cancelled", icon: XCircle },
  { label: "Доход", key: "revenue", icon: DollarSign },
  { label: "Средний рейтинг", key: "average_rating", icon: Star },
];

export function PartnerDashboard() {
  const [stats, setStats] = useState<DashboardType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getPartnerDashboard();
      setStats(data);
    } catch {
      setError("Не удалось загрузить статистику");
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-white sm:text-3xl">Дашборд</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {CARDS.map(({ label, key, icon: Icon }) => {
          let value: string | number = stats ? (stats[key] as number) : "—";
          if (key === "revenue" && typeof value === "number") value = value.toFixed(0);
          if (key === "average_rating" && typeof value === "number") value = value.toFixed(1);
          return (
            <div
              key={key}
              className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-sm"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-500/20 p-3">
                  <Icon className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">{label}</p>
                  <p className="text-2xl font-semibold text-white">{value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
