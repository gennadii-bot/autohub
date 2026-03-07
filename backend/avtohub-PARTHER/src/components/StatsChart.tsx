import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export interface StatsChartPoint {
  date: string;
  users?: number;
  bookings: number;
  stos?: number;
  completed?: number;
  revenue?: number;
}

interface StatsChartProps {
  data: StatsChartPoint[];
  title?: string;
  /** Partner mode: bookings, completed, revenue */
  variant?: "admin" | "partner";
}

const LINES = {
  admin: [
    { dataKey: "users", name: "Пользователи", stroke: "#10b981" },
    { dataKey: "bookings", name: "Записи", stroke: "#3b82f6" },
    { dataKey: "stos", name: "СТО", stroke: "#f59e0b" },
    { dataKey: "revenue", name: "Выручка", stroke: "#8b5cf6" },
  ],
  partner: [
    { dataKey: "bookings", name: "Записи", stroke: "#3b82f6" },
    { dataKey: "completed", name: "Выполнено", stroke: "#10b981" },
    { dataKey: "revenue", name: "Выручка", stroke: "#8b5cf6" },
  ],
};

export function StatsChart({ data, title = "Системная аналитика", variant = "admin" }: StatsChartProps) {
  const lines = LINES[variant];
  return (
    <div className="w-full min-w-0 rounded-xl border border-slate-700 bg-slate-800/50 p-4 backdrop-blur-sm sm:p-6">
      <h2 className="mb-4 text-lg font-semibold text-white sm:mb-6">{title}</h2>
      <div className="h-[280px] w-full min-h-0 sm:h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
              labelStyle={{ color: "#94a3b8" }}
              formatter={(value: number | undefined) => [value ?? 0, ""]}
              labelFormatter={(label) => `Дата: ${label}`}
            />
            <Legend
              wrapperStyle={{ paddingTop: 8 }}
              formatter={(value) => <span className="text-slate-300">{value}</span>}
            />
            {lines.map(({ dataKey, name, stroke }) => (
              <Line
                key={dataKey}
                type="monotone"
                dataKey={dataKey}
                name={name}
                stroke={stroke}
                strokeWidth={2}
                dot={{ fill: stroke, r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
