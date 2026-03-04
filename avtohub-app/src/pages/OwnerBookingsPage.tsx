import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  getStoBookings,
  acceptBooking,
  cancelBooking,
  completeBooking,
  rescheduleBooking,
} from "../api/booking";
import type { Booking } from "../api/booking";
import { getStoSlots, getStoSchedule } from "../api/sto";
import { useToast } from "../context/ToastContext";
import { Container } from "../components/layout/Container";
import { DateCalendar } from "../components/booking/DateCalendar";
import { TimeSlotsGrid } from "../components/booking/TimeSlotsGrid";

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

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("ru-KZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(timeStr: string): string {
  if (timeStr.length >= 5) return timeStr.slice(0, 5);
  return timeStr;
}

export function OwnerBookingsPage() {
  const { stoId } = useParams<{ stoId: string }>();
  const { addToast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState<number | null>(null);

  const [rescheduleTarget, setRescheduleTarget] = useState<Booking | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string | null>(null);
  const [rescheduleTime, setRescheduleTime] = useState<string | null>(null);
  const [rescheduleSlots, setRescheduleSlots] = useState<{ time: string; available: boolean }[]>([]);
  const [rescheduleSlotsLoading, setRescheduleSlotsLoading] = useState(false);
  const [schedule, setSchedule] = useState<{ day_of_week: number; is_working: boolean }[]>([]);

  const fetchBookings = useCallback(async () => {
    const id = stoId ? parseInt(stoId, 10) : NaN;
    if (!id || Number.isNaN(id)) return;
    const data = await getStoBookings(id);
    setBookings(data);
  }, [stoId]);

  useEffect(() => {
    fetchBookings()
      .catch(() => setError("Не удалось загрузить записи"))
      .finally(() => setLoading(false));
  }, [fetchBookings]);

  useEffect(() => {
    const id = stoId ? parseInt(stoId, 10) : NaN;
    if (!id || Number.isNaN(id)) return;
    getStoSchedule(id)
      .then((s) => setSchedule(s ?? []))
      .catch(() => setSchedule([]));
  }, [stoId]);

  useEffect(() => {
    if (!rescheduleTarget || !stoId || !rescheduleDate) {
      setRescheduleSlots([]);
      setRescheduleTime(null);
      return;
    }
    setRescheduleSlotsLoading(true);
    getStoSlots(parseInt(stoId, 10), rescheduleDate, rescheduleTarget.service_id)
      .then((data) => setRescheduleSlots(Array.isArray(data) ? data : []))
      .catch(() => setRescheduleSlots([]))
      .finally(() => setRescheduleSlotsLoading(false));
  }, [rescheduleTarget, stoId, rescheduleDate]);

  const openReschedule = (b: Booking) => {
    setRescheduleTarget(b);
    setRescheduleDate(b.date);
    setRescheduleTime(null);
  };

  const closeReschedule = () => {
    setRescheduleTarget(null);
    setRescheduleDate(null);
    setRescheduleTime(null);
  };

  const handleReschedule = async () => {
    if (!rescheduleTarget || !rescheduleDate || !rescheduleTime) return;
    setActionId(rescheduleTarget.id);
    try {
      await rescheduleBooking(
        rescheduleTarget.id,
        { new_date: rescheduleDate, new_time: rescheduleTime }
      );
      addToast("Запись перенесена", "success");
      closeReschedule();
      await fetchBookings();
    } catch (err: unknown) {
      const res =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response
          : null;
      addToast(res?.data?.detail ?? "Не удалось перенести запись", "error");
    } finally {
      setActionId(null);
    }
  };

  const handleAccept = async (id: number) => {
    setActionId(id);
    try {
      await acceptBooking(id);
      addToast("Запись принята", "success");
      await fetchBookings();
    } catch {
      addToast("Не удалось принять запись", "error");
    } finally {
      setActionId(null);
    }
  };

  const handleCancel = async (id: number) => {
    setActionId(id);
    try {
      await cancelBooking(id);
      addToast("Запись отменена", "success");
      await fetchBookings();
    } catch {
      addToast("Не удалось отменить запись", "error");
    } finally {
      setActionId(null);
    }
  };

  const handleComplete = async (id: number) => {
    setActionId(id);
    try {
      await completeBooking(id);
      addToast("Запись завершена", "success");
      await fetchBookings();
    } catch {
      addToast("Не удалось завершить запись", "error");
    } finally {
      setActionId(null);
    }
  };

  if (loading) {
    return (
      <Container className="py-12">
        <div className="flex justify-center py-16">
          <div
            className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500"
            aria-label="Загрузка"
          />
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Link
          to={stoId ? `/sto-panel/${stoId}` : "/sto-panel"}
          className="mb-6 inline-block text-sm text-white/70 hover:text-emerald-400"
        >
          ← Назад к СТО
        </Link>

        <h1 className="text-2xl font-semibold text-white sm:text-3xl">
          Записи
        </h1>
        <p className="mt-2 text-white/70">
          Управление записями клиентов
        </p>

        {error ? (
          <p className="mt-6 text-red-400">{error}</p>
        ) : bookings.length === 0 ? (
          <p className="mt-6 text-white/60">Нет записей</p>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-2xl border border-white/20 bg-white/5 backdrop-blur-sm">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="px-4 py-3 text-left text-sm font-medium text-white/80">
                    Клиент
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-white/80">
                    Услуга
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-white/80">
                    Дата
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-white/80">
                    Время
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-white/80">
                    Статус
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-white/80">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr
                    key={b.id}
                    className="border-b border-white/10 last:border-0"
                  >
                    <td className="px-4 py-3 text-white">
                      {b.client_email || `Клиент #${b.client_id}`}
                    </td>
                    <td className="px-4 py-3 text-white/90">
                      {b.service_name || `Услуга #${b.service_id}`}
                    </td>
                    <td className="px-4 py-3 text-white/90">
                      {formatDate(b.date)}
                    </td>
                    <td className="px-4 py-3 text-white/90">
                      {formatTime(b.time)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                          STATUS_STYLES[b.status] ?? "bg-white/10 text-white/70"
                        }`}
                      >
                        {STATUS_LABELS[b.status] ?? b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {b.status === "pending" && (
                          <>
                            <button
                              type="button"
                              disabled={actionId === b.id}
                              onClick={() => handleAccept(b.id)}
                              className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
                            >
                              {actionId === b.id ? "..." : "Подтвердить"}
                            </button>
                            <button
                              type="button"
                              disabled={actionId === b.id}
                              onClick={() => openReschedule(b)}
                              className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-sm font-medium text-blue-300 hover:bg-blue-500/20 disabled:opacity-50"
                            >
                              Перенести
                            </button>
                            <button
                              type="button"
                              disabled={actionId === b.id}
                              onClick={() => handleCancel(b.id)}
                              className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                            >
                              {actionId === b.id ? "..." : "Отклонить"}
                            </button>
                          </>
                        )}
                        {(b.status === "accepted" || b.status === "rescheduled") && (
                          <>
                            <button
                              type="button"
                              disabled={actionId === b.id}
                              onClick={() => openReschedule(b)}
                              className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-sm font-medium text-blue-300 hover:bg-blue-500/20 disabled:opacity-50"
                            >
                              Перенести
                            </button>
                            <button
                              type="button"
                              disabled={actionId === b.id}
                              onClick={() => handleComplete(b.id)}
                              className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
                            >
                              {actionId === b.id ? "..." : "Завершить"}
                            </button>
                            <button
                              type="button"
                              disabled={actionId === b.id}
                              onClick={() => handleCancel(b.id)}
                              className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                            >
                              {actionId === b.id ? "..." : "Отклонить"}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {rescheduleTarget && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && closeReschedule()}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#0B0F1A] p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-white">
                Перенести запись
              </h3>
              <p className="mt-1 text-sm text-white/70">
                {rescheduleTarget.service_name} — выберите новую дату и время
              </p>
              <div className="mt-6 space-y-4">
                <div>
                  <p className="mb-2 text-sm font-medium text-white/80">
                    Новая дата
                  </p>
                  <DateCalendar
                    value={rescheduleDate}
                    onChange={(d) => {
                      setRescheduleDate(d);
                      setRescheduleTime(null);
                    }}
                    closedDaysOfWeek={schedule
                      .filter((s) => !s.is_working)
                      .map((s) => s.day_of_week)}
                  />
                </div>
                {rescheduleDate && (
                  <div>
                    <p className="mb-2 text-sm font-medium text-white/80">
                      Новое время
                    </p>
                    <TimeSlotsGrid
                      slots={rescheduleSlots}
                      value={rescheduleTime}
                      onChange={setRescheduleTime}
                      loading={rescheduleSlotsLoading}
                    />
                  </div>
                )}
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={closeReschedule}
                  className="flex-1 rounded-xl border border-white/20 bg-white/5 py-3 font-medium text-white transition hover:bg-white/10"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  disabled={!rescheduleDate || !rescheduleTime || actionId === rescheduleTarget.id}
                  onClick={handleReschedule}
                  className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-violet-500 py-3 font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {actionId === rescheduleTarget.id ? "Перенос..." : "Перенести"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>
    </Container>
  );
}
