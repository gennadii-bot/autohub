import { Link } from "react-router-dom";
import { Users, Building2, FileCheck, Calendar, Star } from "lucide-react";
import type { AdminStats } from "../types/admin";

const CARDS = [
  { label: "Пользователи", key: "users_count", icon: Users, to: "/users" },
  { label: "СТО", key: "stos_count", icon: Building2, to: "/stos" },
  { label: "Заявки (pending)", key: "pending_requests", icon: FileCheck, to: "/sto-requests" },
  { label: "Выполненные услуги", key: "completed_services", icon: Calendar, to: "/bookings" },
  { label: "Средний рейтинг", key: "average_rating", icon: Star, to: "/reviews" },
] as const;

interface DashboardStatsProps {
  stats: AdminStats | null;
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {CARDS.map(({ label, key, icon: Icon, to }) => {
        const value = stats ? (stats as unknown as Record<string, unknown>)[key] : undefined;
        const displayValue: string | number =
          typeof value === "number"
            ? key === "average_rating"
              ? value.toFixed(1)
              : value
            : String(value ?? "—");
        return (
          <Link
            key={key}
            to={to}
            className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-sm transition-colors hover:border-emerald-500/50 hover:bg-slate-800"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-500/20 p-3">
                <Icon className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">{label}</p>
                <p className="text-2xl font-semibold text-white">{displayValue}</p>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
