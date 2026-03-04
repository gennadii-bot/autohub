import type { LucideIcon } from "lucide-react";

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
}

export function StatsCard({ label, value, icon: Icon }: StatsCardProps) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-sm">
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
}
