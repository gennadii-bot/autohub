import { Users, Calendar, Building2, DollarSign } from "lucide-react";
import type { AnalyticsKpi } from "../api/admin";

interface KpiItem {
  key: keyof typeof LABELS;
  icon: typeof Users;
}

const LABELS: Record<string, string> = {
  users: "Пользователи",
  bookings: "Заказы",
  stos: "СТО",
  revenue: "Выручка",
};

const ICONS: Record<string, typeof Users> = {
  users: Users,
  bookings: Calendar,
  stos: Building2,
  revenue: DollarSign,
};

interface AnalyticsKPICardsProps {
  kpi: {
    users: AnalyticsKpi;
    bookings: AnalyticsKpi;
    stos: AnalyticsKpi;
    revenue: AnalyticsKpi;
  };
}

function DeltaBadge({ delta }: { delta: number }) {
  if (delta === 0) {
    return (
      <span className="text-sm text-slate-500">0%</span>
    );
  }
  const isPositive = delta > 0;
  return (
    <span
      className={`text-sm font-medium ${
        isPositive ? "text-emerald-400" : "text-red-400"
      }`}
    >
      {isPositive ? "+" : ""}{delta}%
    </span>
  );
}

export function AnalyticsKPICards({ kpi }: AnalyticsKPICardsProps) {
  const items: KpiItem[] = [
    { key: "users", icon: Users },
    { key: "bookings", icon: Calendar },
    { key: "stos", icon: Building2 },
    { key: "revenue", icon: DollarSign },
  ];

  const safeKpi = kpi ?? {};

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map(({ key, icon: Icon }) => {
        const data = safeKpi[key as keyof typeof safeKpi];
        if (data == null || typeof data !== "object") return null;
        const currentTotal = Number(data.current_total ?? 0);
        const value =
          key === "revenue"
            ? currentTotal.toLocaleString("ru-KZ", { maximumFractionDigits: 0 })
            : currentTotal;
        return (
          <div
            key={key}
            className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-500/20 p-3">
                  <Icon className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">{LABELS[key]}</p>
                  <p className="text-2xl font-semibold text-white">{value}</p>
                </div>
              </div>
              <DeltaBadge delta={Number(data.delta_percent ?? 0)} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
