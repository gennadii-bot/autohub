/**
 * Утилиты для нормализации ответа /admin/analytics.
 * Защита от undefined, разных форматов backend.
 */

export interface ChartDataPoint {
  date: string;
  users?: number;
  bookings?: number;
  bookings_completed?: number;
  stos?: number;
  revenue?: number;
  average_rating?: number;
}

export interface PieDataPoint {
  name: string;
  value: number;
}

/**
 * Нормализует current/grouped_data: массив или объект → всегда массив.
 */
export function normalizeChartData(raw: unknown): ChartDataPoint[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.map((item) => {
      const i = (item ?? {}) as Record<string, unknown>;
      return {
        date: String(i?.date ?? ""),
        users: Number(i?.users ?? 0),
        bookings: Number(i?.bookings ?? 0),
        bookings_completed: Number(i?.bookings_completed ?? i?.completed ?? 0),
        stos: Number(i?.stos ?? i?.sto ?? 0),
        revenue: Number(i?.revenue ?? 0),
        average_rating: Number(i?.average_rating ?? i?.avg_rating ?? 0),
      };
    });
  }
  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    return [
      {
        date: "Период",
        users: Number(o?.users ?? 0),
        bookings: Number(o?.bookings ?? 0),
        bookings_completed: Number(o?.completed ?? o?.bookings_completed ?? 0),
        stos: Number(o?.sto ?? o?.stos ?? 0),
        revenue: Number(o?.revenue ?? 0),
        average_rating: Number(o?.avg_rating ?? o?.average_rating ?? 0),
      },
    ];
  }
  return [];
}

/**
 * Преобразует by_city из объекта в массив для PieChart.
 * Из: { "Almaty": 5, "Astana": 3 }
 * В: [{ name: "Almaty", value: 5 }, { name: "Astana", value: 3 }]
 */
export function normalizeByCity(raw: unknown): PieDataPoint[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return (raw as Array<{ name?: string; value?: number }>)
      .filter((item) => item != null && typeof item === "object")
      .map((item) => ({
        name: String(item?.name ?? ""),
        value: Number(item?.value ?? 0) || 0,
      }))
      .filter((item) => item.name !== "");
  }
  if (typeof raw === "object") {
    const entries = Object.entries(raw as Record<string, unknown>);
    return entries.map(([name, value]) => ({
      name,
      value: Number(value ?? 0) || 0,
    }));
  }
  return [];
}
