import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
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
  bookings?: number;
  stos?: number;
  revenue?: number;
  bookings_completed?: number;
  average_rating?: number;
}

export interface PieChartPoint {
  name: string;
  value: number;
}

interface StatsChartProps {
  data: StatsChartPoint[] | PieChartPoint[];
  comparisonData?: StatsChartPoint[];
  title?: string;
  variant?: "line" | "area" | "bar" | "pie";
  dataKey?: string;
}

const PIE_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];

function formatDate(v: string): string {
  try {
    const d = new Date(v);
    return `${d.getDate()}.${d.getMonth() + 1}`;
  } catch {
    return v;
  }
}

/** Безопасно приводит к массиву */
function ensureArray<T>(data: T[] | T | null | undefined): T[] {
  if (data == null) return [];
  if (Array.isArray(data)) return data;
  return [];
}

const EmptyPlaceholder = () => (
  <div className="flex min-h-[300px] items-center justify-center">
    <span className="text-slate-500">Нет данных</span>
  </div>
);

export function StatsChart({
  data,
  comparisonData,
  title = "Системная аналитика",
  variant = "line",
  dataKey = "revenue",
}: StatsChartProps) {
  const safeData = (data == null ? [] : Array.isArray(data) ? data : []) as (
    | StatsChartPoint
    | PieChartPoint
  )[];
  const safeComparison = ensureArray(comparisonData) as StatsChartPoint[];

  if (variant === "pie") {
    const pieData = safeData as PieChartPoint[];
    if (pieData.length === 0) {
      return (
        <div
          className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-sm"
          style={{ minHeight: 350 }}
        >
          <h2 className="mb-6 text-lg font-semibold text-white">{title}</h2>
          <EmptyPlaceholder />
        </div>
      );
    }
    return (
      <div
        className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-sm"
        style={{ minHeight: 350 }}
      >
        <h2 className="mb-6 text-lg font-semibold text-white">{title}</h2>
        <div style={{ width: "100%", height: 350 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={120}
                label={({ name, percent }) =>
                  `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                }
                labelLine={{ stroke: "#94a3b8" }}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                }}
                formatter={(value) => [(value ?? 0), "Записей"]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  const chartData = safeData as StatsChartPoint[];
  const hasComparison = safeComparison.length > 0;

  const mergedData = hasComparison
    ? chartData.map((row) => {
        const comp = safeComparison.find((c) => c.date === row.date);
        return {
          ...row,
          users_compare: comp?.users ?? 0,
          bookings_compare: comp?.bookings ?? 0,
          stos_compare: comp?.stos ?? 0,
          revenue_compare: comp?.revenue ?? 0,
        };
      })
    : chartData;

  if (chartData.length === 0) {
    return (
      <div
        className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-sm"
        style={{ minHeight: 350 }}
      >
        <h2 className="mb-6 text-lg font-semibold text-white">{title}</h2>
        <EmptyPlaceholder />
      </div>
    );
  }

  const commonProps = {
    data: mergedData,
    margin: { top: 5, right: 20, left: 0, bottom: 5 },
  };

  const xAxis = (
    <XAxis
      dataKey="date"
      stroke="#94a3b8"
      tick={{ fill: "#94a3b8", fontSize: 12 }}
      tickFormatter={formatDate}
    />
  );
  const tooltip = (
    <Tooltip
      contentStyle={{
        backgroundColor: "#1e293b",
        border: "1px solid #334155",
        borderRadius: "8px",
      }}
      labelStyle={{ color: "#94a3b8" }}
      formatter={(value: number | undefined) => [value ?? 0, ""]}
      labelFormatter={(label) => `Дата: ${String(label)}`}
    />
  );

  if (variant === "area") {
    return (
      <div
        className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-sm"
        style={{ minHeight: 350 }}
      >
        <h2 className="mb-6 text-lg font-semibold text-white">{title}</h2>
        <div style={{ width: "100%", height: 350 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              {xAxis}
              <YAxis stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 12 }} />
              {tooltip}
              <Area
                type="monotone"
                dataKey={dataKey}
                name="Выручка"
                stroke="#8b5cf6"
                fill="#8b5cf6"
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (variant === "bar") {
    return (
      <div
        className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-sm"
        style={{ minHeight: 350 }}
      >
        <h2 className="mb-6 text-lg font-semibold text-white">{title}</h2>
        <div style={{ width: "100%", height: 350 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              {xAxis}
              <YAxis stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 12 }} />
              {tooltip}
              <Bar dataKey={dataKey} name="Записи" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-sm"
      style={{ minHeight: 350 }}
    >
      <h2 className="mb-6 text-lg font-semibold text-white">{title}</h2>
      <div style={{ width: "100%", height: 350 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            {xAxis}
            <YAxis stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 12 }} />
            {tooltip}
            <Legend
              wrapperStyle={{ paddingTop: 8 }}
              formatter={(value) => <span className="text-slate-300">{value}</span>}
            />
            <Line
              type="monotone"
              dataKey="users"
              name="Пользователи"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: "#10b981", r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="bookings"
              name="Записи"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: "#3b82f6", r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="stos"
              name="СТО"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ fill: "#f59e0b", r: 3 }}
              activeDot={{ r: 5 }}
            />
            {chartData.some((r) => (r.revenue ?? 0) > 0) && (
              <Line
                type="monotone"
                dataKey="revenue"
                name="Выручка"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ fill: "#8b5cf6", r: 3 }}
                activeDot={{ r: 5 }}
              />
            )}
            {hasComparison && (
              <>
                <Line
                  type="monotone"
                  dataKey="users_compare"
                  name="Пользователи (сравн.)"
                  stroke="#10b981"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="bookings_compare"
                  name="Записи (сравн.)"
                  stroke="#3b82f6"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="stos_compare"
                  name="СТО (сравн.)"
                  stroke="#f59e0b"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
