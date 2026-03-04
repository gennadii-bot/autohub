import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { getMyBookings } from "../../api/booking";
import type { Booking } from "../../api/booking";
import { getStoImageUrl } from "../../utils/media";
import { useToast } from "../../context/ToastContext";

const STATUS_LABELS: Record<string, string> = {
  pending: "Ожидание",
  accepted: "Подтверждено",
  rescheduled: "Перенесено",
  cancelled: "Отменено",
  completed: "Выполнено",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  accepted: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  rescheduled: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  cancelled: "bg-red-500/20 text-red-300 border-red-500/30",
  completed: "bg-gray-500/20 text-gray-300 border-gray-500/30",
};

function formatDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("ru-KZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(timeStr: string) {
  return timeStr.length >= 5 ? timeStr.slice(0, 5) : timeStr;
}

function formatPrice(price: number | null | undefined) {
  if (price == null) return "—";
  return `${price.toLocaleString("ru-KZ")} ₸`;
}

export function DashboardHistory() {
  const { addToast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = useCallback(async () => {
    try {
      const data = await getMyBookings();
      setBookings(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const status = err && typeof err === "object" && "response" in err
        ? (err as { response?: { status?: number } }).response?.status
        : null;
      if (status !== 401) addToast("Не удалось загрузить историю", "error");
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const historyBookings = bookings.filter(
    (b) => b.status === "completed" || b.status === "cancelled"
  );

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-400" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <h1 className="text-2xl font-semibold text-white sm:text-3xl">История</h1>

      {historyBookings.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-white/[0.04] p-12 text-center backdrop-blur-xl">
          <p className="text-white/70">Нет записей в истории</p>
        </div>
      ) : (
        <div className="space-y-4">
          {historyBookings.map((b) => (
            <motion.div
              key={b.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-4 rounded-2xl border border-white/5 bg-white/[0.04] p-4 backdrop-blur-xl sm:flex-row sm:items-center"
            >
              <div className="h-20 w-full shrink-0 overflow-hidden rounded-xl sm:h-16 sm:w-24">
                <img
                  src={getStoImageUrl(b.sto_image_url)}
                  alt={b.sto_name ?? ""}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <Link
                  to={`/sto/${b.sto_id}`}
                  className="font-medium text-white hover:text-emerald-400"
                >
                  {b.sto_name ?? `СТО #${b.sto_id}`}
                </Link>
                <p className="text-sm text-white/70">{b.service_name ?? `Услуга #${b.service_id}`}</p>
                <p className="mt-1 text-sm text-white/60">
                  {formatDate(b.date)} в {formatTime(b.time)}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${
                  STATUS_STYLES[b.status] ?? "bg-white/10 text-white/70"
                }`}
              >
                {STATUS_LABELS[b.status] ?? b.status}
              </span>
              <span className="shrink-0 font-medium text-white/80">
                {formatPrice(b.price)}
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
