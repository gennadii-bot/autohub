import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { getMyBookings, cancelBooking } from "../api/booking";
import type { Booking } from "../api/booking";
import { ReviewForm } from "../components/reviews/ReviewForm";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Container } from "../components/layout/Container";

const STATUS_LABELS: Record<string, string> = {
  pending: "Ожидает",
  accepted: "Подтверждена",
  cancelled: "Отменена",
  completed: "Завершена",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  accepted: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  completed: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  cancelled: "bg-red-500/20 text-red-300 border-red-500/30",
};

function BookingCard({
  b,
  onCancel,
  onReview,
  cancelling,
}: {
  b: Booking;
  onCancel: (id: number) => void;
  onReview: (b: Booking) => void;
  cancelling: number | null;
}) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("ru-KZ", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };
  const formatTime = (timeStr: string) => {
    if (timeStr.length >= 5) return timeStr.slice(0, 5);
    return timeStr;
  };

  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-white/20 bg-white/5 p-4 backdrop-blur-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-white">
            <Link
              to={`/sto/${b.sto_id}`}
              className="text-emerald-400 hover:underline"
            >
              {b.sto_name || `СТО #${b.sto_id}`}
            </Link>
            {" · "}
            <span className="text-white/90">{b.service_name || `Услуга #${b.service_id}`}</span>
          </p>
          <p className="mt-1 text-sm text-white/70">
            {formatDate(b.date)} в {formatTime(b.time)}
          </p>
          <span
            className={`mt-2 inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${
              STATUS_STYLES[b.status] ?? "bg-white/10 text-white/70"
            }`}
          >
            {STATUS_LABELS[b.status] ?? b.status}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {b.status === "pending" && (
            <button
              type="button"
              disabled={cancelling === b.id}
              onClick={() => onCancel(b.id)}
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-500/20 disabled:opacity-50"
            >
              {cancelling === b.id ? "Отмена..." : "Отменить"}
            </button>
          )}
          {b.status === "completed" && !b.has_review && (
            <button
              type="button"
              onClick={() => onReview(b)}
              className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-300 hover:bg-amber-500/20"
            >
              Оставить отзыв
            </button>
          )}
        </div>
      </div>
    </motion.li>
  );
}

export function Dashboard() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [reviewFor, setReviewFor] = useState<Booking | null>(null);

  const fetchBookings = useCallback(async () => {
    const data = await getMyBookings();
    setBookings(data);
  }, []);

  useEffect(() => {
    fetchBookings()
      .catch(() => {
        setError("Не удалось загрузить записи");
      })
      .finally(() => setLoading(false));
  }, [fetchBookings]);

  const handleReviewSuccess = () => {
    setReviewFor(null);
    fetchBookings();
  };

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

  const active = bookings.filter((b) => b.status === "pending" || b.status === "accepted");
  const completed = bookings.filter((b) => b.status === "completed");
  const cancelled = bookings.filter((b) => b.status === "cancelled");

  return (
    <Container className="py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">
          Личный кабинет
        </h1>
        <p className="mt-2 text-white/70">
          Добро пожаловать, {user?.email?.split("@")[0] ?? user?.email}!
        </p>

        <div className="mt-8 rounded-2xl border border-white/20 bg-white/5 p-6 backdrop-blur-sm">
          <h2 className="font-medium text-white">Профиль</h2>
          <dl className="mt-4 space-y-2">
            <div>
              <dt className="text-sm text-white/60">Email</dt>
              <dd className="text-white">{user?.email}</dd>
            </div>
          </dl>
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-medium text-white">Мои записи</h2>
          {loading ? (
            <div className="mt-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-xl bg-white/10"
                />
              ))}
            </div>
          ) : error ? (
            <p className="mt-4 text-red-400">{error}</p>
          ) : bookings.length === 0 ? (
            <p className="mt-4 text-white/60">У вас пока нет записей</p>
          ) : (
            <div className="mt-6 space-y-8">
              {active.length > 0 && (
                <section>
                  <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-white/60">
                    Активные
                  </h3>
                  <ul className="space-y-3">
                    {active.map((b) => (
                      <BookingCard
                        key={b.id}
                        b={b}
                        onCancel={handleCancel}
                        onReview={setReviewFor}
                        cancelling={cancellingId}
                      />
                    ))}
                  </ul>
                </section>
              )}
              {completed.length > 0 && (
                <section>
                  <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-white/60">
                    Завершённые
                  </h3>
                  <ul className="space-y-3">
                    {completed.map((b) => (
                      <BookingCard
                        key={b.id}
                        b={b}
                        onCancel={handleCancel}
                        onReview={setReviewFor}
                        cancelling={cancellingId}
                      />
                    ))}
                  </ul>
                </section>
              )}
              {cancelled.length > 0 && (
                <section>
                  <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-white/60">
                    Отменённые
                  </h3>
                  <ul className="space-y-3">
                    {cancelled.map((b) => (
                      <BookingCard
                        key={b.id}
                        b={b}
                        onCancel={handleCancel}
                        onReview={setReviewFor}
                        cancelling={cancellingId}
                      />
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </div>

        {reviewFor && (
          <ReviewForm
            bookingId={reviewFor.id}
            stoName={reviewFor.sto_name ?? `СТО #${reviewFor.sto_id}`}
            onSuccess={handleReviewSuccess}
            onCancel={() => setReviewFor(null)}
          />
        )}
      </motion.div>
    </Container>
  );
}
