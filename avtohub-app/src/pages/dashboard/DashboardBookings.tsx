import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getMyBookings, cancelBooking } from "../../api/booking";
import type { Booking } from "../../api/booking";
import { getStoImageUrl } from "../../utils/media";
import { useToast } from "../../context/ToastContext";

const STATUS_LABELS: Record<string, string> = {
  pending: "Ожидает",
  accepted: "Подтверждена",
  rescheduled: "Перенесена",
  cancelled: "Отменена",
  completed: "Завершена",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  accepted: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  rescheduled: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  cancelled: "bg-red-500/20 text-red-300 border-red-500/30",
  completed: "bg-gray-500/20 text-gray-300 border-gray-500/30",
};

type Tab = "all" | "active" | "history";

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

function BookingRow({
  b,
  onCancel,
  cancelling,
}: {
  b: Booking;
  onCancel: (id: number) => void;
  cancelling: number | null;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex flex-col gap-4 rounded-2xl border border-white/5 bg-white/[0.04] p-4 backdrop-blur-xl transition-all duration-200 hover:scale-[1.01] hover:shadow-[0_0_30px_rgba(34,197,94,0.08)] sm:flex-row sm:items-center"
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
      <span className="shrink-0 font-medium text-white/80">{formatPrice(b.price)}</span>
      {b.status === "pending" && (
        <button
          type="button"
          disabled={cancelling === b.id}
          onClick={() => onCancel(b.id)}
          className="shrink-0 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 transition-all duration-200 hover:bg-red-500/20 disabled:opacity-50"
        >
          {cancelling === b.id ? "Отмена..." : "Отменить"}
        </button>
      )}
    </motion.div>
  );
}

export function DashboardBookings() {
  const { addToast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const fetchBookings = useCallback(async () => {
    try {
      const data = await getMyBookings();
      setBookings(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const status = err && typeof err === "object" && "response" in err
        ? (err as { response?: { status?: number } }).response?.status
        : null;
      if (status === 500) {
        addToast("Ошибка сервера", "error");
      } else if (status !== 401) {
        addToast("Не удалось загрузить записи", "error");
      }
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleCancel = async (id: number) => {
    setCancellingId(id);
    try {
      await cancelBooking(id);
      addToast("Запись отменена", "success");
      await fetchBookings();
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { error?: { message?: string } } } })?.response
        ?.data;
      const msg = data?.error?.message ?? "Не удалось отменить запись";
      addToast(msg, "error");
    } finally {
      setCancellingId(null);
    }
  };

  const activeBookings = bookings.filter(
    (b) => b.status === "pending" || b.status === "accepted" || b.status === "rescheduled"
  );
  const historyBookings = bookings.filter(
    (b) => b.status === "completed" || b.status === "cancelled"
  );

  const filtered =
    tab === "all" ? bookings : tab === "active" ? activeBookings : historyBookings;

  const tabs: { key: Tab; label: string }[] = [
    { key: "all", label: "Все" },
    { key: "active", label: "Активные" },
    { key: "history", label: "История" },
  ];

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        <div className="h-10 w-48 animate-pulse rounded-xl bg-white/10" />
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 w-24 animate-pulse rounded-xl bg-white/10" />
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex animate-pulse gap-4 rounded-2xl border border-white/5 bg-white/[0.04] p-4"
            >
              <div className="h-16 w-24 shrink-0 rounded-xl bg-white/10" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 rounded bg-white/10" />
                <div className="h-3 w-48 rounded bg-white/5" />
                <div className="h-3 w-24 rounded bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <h1 className="text-2xl font-semibold text-white sm:text-3xl">Мои записи</h1>

      <div className="flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 ${
              tab === t.key
                ? "bg-gradient-to-r from-emerald-500/30 to-violet-500/30 text-white shadow-[0_0_20px_rgba(34,197,94,0.2)]"
                : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-white/[0.04] p-12 text-center backdrop-blur-xl">
          <p className="text-white/70">
            {tab === "all"
              ? "У вас пока нет записей"
              : tab === "active"
                ? "У вас пока нет активных записей"
                : "Нет записей в истории"}
          </p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-4">
            {filtered.map((b) => (
              <BookingRow
                key={b.id}
                b={b}
                onCancel={handleCancel}
                cancelling={cancellingId}
              />
            ))}
          </div>
        </AnimatePresence>
      )}
    </motion.div>
  );
}
