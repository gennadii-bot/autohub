import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  getMyStoSchedule,
  updateMyStoSchedule,
} from "../api/schedule";
import type { ScheduleItem } from "../api/schedule";
import { useToast } from "../context/ToastContext";
import { Container } from "../components/layout/Container";
import { Button } from "../components/ui/Button";

const DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export function OwnerSchedulePage() {
  const { stoId } = useParams<{ stoId: string }>();
  const { addToast } = useToast();
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchSchedule = useCallback(async () => {
    const id = stoId ? parseInt(stoId, 10) : NaN;
    if (!id || Number.isNaN(id)) return;
    try {
      const data = await getMyStoSchedule(id);
      setSchedule(data.length === 7 ? data : fillSchedule(data));
    } catch {
      setError("Не удалось загрузить расписание");
      setSchedule(defaultSchedule());
    } finally {
      setLoading(false);
    }
  }, [stoId]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  function defaultSchedule(): ScheduleItem[] {
    return Array.from({ length: 7 }, (_, i) => ({
      day_of_week: i,
      start_time: "09:00",
      end_time: "18:00",
      is_working: i < 5,
    }));
  }

  function fillSchedule(items: ScheduleItem[]): ScheduleItem[] {
    const byDay = new Map(items.map((s) => [s.day_of_week, s]));
    return Array.from({ length: 7 }, (_, i) => {
      const existing = byDay.get(i);
      return (
        existing ?? {
          day_of_week: i,
          start_time: "09:00",
          end_time: "18:00",
          is_working: i < 5,
        }
      );
    });
  }

  const updateDay = (dayIndex: number, patch: Partial<ScheduleItem>) => {
    setSchedule((prev) =>
      prev.map((s) =>
        s.day_of_week === dayIndex ? { ...s, ...patch } : s
      )
    );
  };

  const handleSave = async () => {
    const id = stoId ? parseInt(stoId, 10) : NaN;
    if (!id || Number.isNaN(id)) return;
    setSubmitting(true);
    try {
      const data = await updateMyStoSchedule(id, schedule);
      setSchedule(data);
      addToast("Расписание сохранено", "success");
    } catch {
      addToast("Не удалось сохранить", "error");
    } finally {
      setSubmitting(false);
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
          Рабочее время
        </h1>
        <p className="mt-2 text-white/70">
          Укажите часы работы по дням недели
        </p>

        {error && <p className="mt-4 text-red-400">{error}</p>}

        <div className="mt-6 space-y-4">
          {schedule.map((day) => (
            <div
              key={day.day_of_week}
              className="flex flex-wrap items-center gap-4 rounded-xl border border-white/20 bg-white/5 p-4"
            >
              <div className="w-24 font-medium text-white">
                {DAY_NAMES[day.day_of_week]}
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={day.is_working}
                  onChange={(e) =>
                    updateDay(day.day_of_week, {
                      is_working: e.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded border-white/30"
                />
                <span className="text-white/80">Рабочий день</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={day.start_time}
                  onChange={(e) =>
                    updateDay(day.day_of_week, {
                      start_time: e.target.value,
                    })
                  }
                  disabled={!day.is_working}
                  className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white disabled:opacity-50"
                />
                <span className="text-white/60">—</span>
                <input
                  type="time"
                  value={day.end_time}
                  onChange={(e) =>
                    updateDay(day.day_of_week, {
                      end_time: e.target.value,
                    })
                  }
                  disabled={!day.is_working}
                  className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white disabled:opacity-50"
                />
              </div>
            </div>
          ))}
        </div>

        <Button
          onClick={handleSave}
          disabled={submitting}
          className="mt-6 bg-emerald-500 text-white hover:bg-emerald-600"
        >
          {submitting ? "Сохранение..." : "Сохранить"}
        </Button>
      </motion.div>
    </Container>
  );
}
