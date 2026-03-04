import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { getMySto } from "../api/stoOwner";
import { updateStoSettings } from "../api/stoSettings";
import { useToast } from "../context/ToastContext";
import { Container } from "../components/layout/Container";
import { Button } from "../components/ui/Button";

export function OwnerSettingsPage() {
  const { stoId } = useParams<{ stoId: string }>();
  const { addToast } = useToast();
  const [maxParallel, setMaxParallel] = useState(3);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchSto = useCallback(async () => {
    const id = stoId ? parseInt(stoId, 10) : NaN;
    if (!id || Number.isNaN(id)) return;
    try {
      const data = await getMySto(id);
      setMaxParallel(data.max_parallel_bookings ?? 3);
    } catch {
      setError("Не удалось загрузить настройки");
    } finally {
      setLoading(false);
    }
  }, [stoId]);

  useEffect(() => {
    fetchSto();
  }, [fetchSto]);

  const handleSave = async () => {
    const id = stoId ? parseInt(stoId, 10) : NaN;
    if (!id || Number.isNaN(id)) return;
    setSubmitting(true);
    try {
      await updateStoSettings(id, { max_parallel_bookings: maxParallel });
      addToast("Настройки сохранены", "success");
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
          Настройки
        </h1>
        <p className="mt-2 text-white/70">
          Ограничение параллельных записей
        </p>

        {error && <p className="mt-4 text-red-400">{error}</p>}

        <div className="mt-6 rounded-2xl border border-white/20 bg-white/5 p-6">
          <label className="block text-sm font-medium text-white/80">
            Макс. параллельных записей на один слот
          </label>
          <p className="mt-1 text-sm text-white/60">
            Сколько клиентов могут записаться на одно и то же время
          </p>
          <p className="mt-1 text-sm text-white/60">
            (1–20, по умолчанию 3)
          </p>
          <input
            type="number"
            min={1}
            max={20}
            value={maxParallel}
            onChange={(e) =>
              setMaxParallel(Math.min(20, Math.max(1, parseInt(e.target.value, 10) || 1)))
            }
            className="mt-4 w-24 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-white"
          />
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
