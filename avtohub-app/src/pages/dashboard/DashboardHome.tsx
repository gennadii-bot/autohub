import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { getMyBookings, cancelBooking } from "../../api/booking";
import type { Booking } from "../../api/booking";
import { getStoImageUrl } from "../../utils/media";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { ReviewForm } from "../../components/reviews/ReviewForm";

const STATUS_LABELS: Record<string, string> = {
  pending: "Ожидает",
  accepted: "Подтверждена",
  rescheduled: "Перенесена",
  cancelled: "Отменена",
  completed: "Завершена",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  accepted: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  rescheduled: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  completed: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  cancelled: "bg-red-500/20 text-red-300 border-red-500/30",
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

function displayName(email: string) {
  const name = email.split("@")[0];
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : email;
}

export function DashboardHome() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [reviewFor, setReviewFor] = useState<Booking | null>(null);

  const fetchBookings = useCallback(async () => {
    const data = await getMyBookings();
    setBookings(data);
  }, []);

  useEffect(() => {
    fetchBookings()
      .catch(() => addToast("Не удалось загрузить записи", "error"))
      .finally(() => setLoading(false));
  }, [fetchBookings, addToast]);

  const handleCancel = async (id: number) => {
    setCancellingId(id);
    try {
      await cancelBooking(id);
      addToast("Запись отменена", "success");
      await fetchBookings();
    } catch {
      addToast("Не удалось отменить запись", "error");
    } finally {
      setCancellingId(null);
    }
  };

  const active = bookings.filter((b) => b.status === "pending" || b.status === "accepted" || b.status === "rescheduled");
  const completed = bookings.filter((b) => b.status === "completed");
  const cancelled = bookings.filter((b) => b.status === "cancelled");
  const nextBooking = active
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))
    [0];

  if (!user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-400" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 animate-pulse rounded-xl bg-white/10" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-white/5" />
          ))}
        </div>
        <div className="h-48 animate-pulse rounded-2xl bg-white/5" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      <h1 className="text-2xl font-semibold text-white sm:text-3xl">
        Здравствуйте, {displayName(user?.email ?? "")} 👋
      </h1>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-white/5 bg-gradient-to-br from-emerald-500/10 to-violet-500/10 p-6 shadow-[0_0_30px_rgba(34,197,94,0.1)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(34,197,94,0.15)]"
        >
          <p className="text-3xl font-bold text-white">{active.length}</p>
          <p className="mt-1 text-sm text-white/60">Активные записи</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl border border-white/5 bg-gradient-to-br from-emerald-500/10 to-violet-500/10 p-6 shadow-[0_0_30px_rgba(34,197,94,0.1)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(34,197,94,0.15)]"
        >
          <p className="text-3xl font-bold text-white">{completed.length}</p>
          <p className="mt-1 text-sm text-white/60">Завершённые</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-white/5 bg-gradient-to-br from-emerald-500/10 to-violet-500/10 p-6 shadow-[0_0_30px_rgba(34,197,94,0.1)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(34,197,94,0.15)]"
        >
          <p className="text-3xl font-bold text-white">{cancelled.length}</p>
          <p className="mt-1 text-sm text-white/60">Отменённые</p>
        </motion.div>
      </div>

      {/* Next booking */}
      {nextBooking && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.04] backdrop-blur-xl"
        >
          <h2 className="border-b border-white/5 px-6 py-4 text-lg font-medium text-white">
            Ближайшая запись
          </h2>
          <div className="flex flex-col sm:flex-row">
            <div className="relative h-40 w-full shrink-0 sm:h-auto sm:w-48">
              <img
                src={getStoImageUrl(nextBooking.sto_image_url)}
                alt={nextBooking.sto_name ?? ""}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent sm:bg-gradient-to-r sm:from-transparent sm:via-transparent sm:to-black/20" />
            </div>
            <div className="flex flex-1 flex-col justify-between p-6">
              <div>
                <Link
                  to={`/sto/${nextBooking.sto_id}`}
                  className="text-lg font-semibold text-white hover:text-emerald-400"
                >
                  {nextBooking.sto_name ?? `СТО #${nextBooking.sto_id}`}
                </Link>
                <p className="mt-1 text-white/70">{nextBooking.service_name ?? `Услуга #${nextBooking.service_id}`}</p>
                <p className="mt-2 text-sm text-white/60">
                  {formatDate(nextBooking.date)} в {formatTime(nextBooking.time)}
                </p>
                <span
                  className={`mt-2 inline-block rounded-full border px-3 py-1 text-xs font-medium ${
                    STATUS_STYLES[nextBooking.status] ?? "bg-white/10 text-white/70"
                  }`}
                >
                  {STATUS_LABELS[nextBooking.status] ?? nextBooking.status}
                </span>
              </div>
              {(nextBooking.status === "pending" || nextBooking.status === "accepted" || nextBooking.status === "rescheduled") && (
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    disabled
                    className="rounded-xl bg-gradient-to-r from-emerald-500/20 to-violet-500/20 px-4 py-2 text-sm font-medium text-white/70 transition-all duration-200 hover:from-emerald-500/30 hover:to-violet-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                    title="Скоро"
                  >
                    Перенести
                  </button>
                  {nextBooking.status === "pending" && (
                    <button
                      type="button"
                      disabled={cancellingId === nextBooking.id}
                      onClick={() => handleCancel(nextBooking.id)}
                      className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 transition-all duration-200 hover:bg-red-500/20"
                    >
                      {cancellingId === nextBooking.id ? "Отмена..." : "Отменить"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {!nextBooking && active.length === 0 && (
        <div className="rounded-2xl border border-white/5 bg-white/[0.04] p-8 text-center backdrop-blur-xl">
          <p className="text-white/70">У вас пока нет активных записей</p>
        </div>
      )}

      {reviewFor && (
        <ReviewForm
          bookingId={reviewFor.id}
          stoName={reviewFor.sto_name ?? `СТО #${reviewFor.sto_id}`}
          onSuccess={() => {
            setReviewFor(null);
            fetchBookings();
          }}
          onCancel={() => setReviewFor(null)}
        />
      )}
    </motion.div>
  );
}
