import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, MapPin } from "lucide-react";
import { getMyStos } from "../api/stoOwner";
import type { MySto } from "../api/stoOwner";
import { useToast } from "../context/ToastContext";
import { Container } from "../components/layout/Container";
import { CustomSelect } from "../components/ui/CustomSelect";
import type { CustomSelectOption } from "../components/ui/CustomSelect";

const SELECTED_STO_KEY = "avtohub_selected_sto_id";

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("ru-KZ", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function STOPanel() {
  const { addToast } = useToast();
  const [stos, setStos] = useState<MySto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [selectedStoId, setSelectedStoId] = useState<string>("");

  const loadStos = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getMyStos();
      setStos(data);
      const stored = localStorage.getItem(SELECTED_STO_KEY);
      if (stored && data.some((s) => String(s.id) === stored)) {
        setSelectedStoId(stored);
      } else if (data.length > 0) {
        setSelectedStoId(String(data[0].id));
        localStorage.setItem(SELECTED_STO_KEY, String(data[0].id));
      } else {
        setSelectedStoId("");
      }
    } catch (err: unknown) {
      const res =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { status?: number } }).response
          : null;
      if (res?.status === 401) {
        addToast("Требуется авторизация", "error");
        return;
      }
      if (res?.status === 403) {
        setError("Недостаточно прав");
        setStos([]);
        return;
      }
      setError("Не удалось загрузить список СТО");
      setStos([]);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadStos();
  }, [loadStos]);

  const handleStoSelect = (value: string) => {
    setSelectedStoId(value);
    localStorage.setItem(SELECTED_STO_KEY, value);
  };

  const stoOptions: CustomSelectOption[] = stos.map((s) => ({
    value: String(s.id),
    label: s.name,
  }));

  return (
    <Container className="py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">
          Мои СТО
        </h1>

        {loading ? (
          <div className="mt-8 flex justify-center py-16">
            <div
              className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500"
              aria-label="Загрузка"
            />
          </div>
        ) : error ? (
          <p className="mt-6 text-red-400">{error}</p>
        ) : stos.length === 0 ? (
          <p className="mt-8 text-center text-white/70">
            У вас нет активных СТО.
          </p>
        ) : (
          <>
            {stos.length > 1 && (
              <div className="mt-6 max-w-xs">
                <CustomSelect
                  label="Выбрать СТО"
                  options={stoOptions}
                  value={selectedStoId}
                  onChange={handleStoSelect}
                  placeholder="Выберите СТО"
                />
              </div>
            )}

            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {stos.map((sto, i) => (
                <motion.div
                  key={sto.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="glass-card group overflow-hidden rounded-2xl border border-white/10 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-emerald-500/5"
                >
                  <div className="p-6">
                    <h2 className="text-xl font-bold text-white">
                      {sto.name}
                    </h2>
                    <p className="mt-2 flex items-center gap-2 text-sm text-white/70">
                      <Building2 className="h-4 w-4 shrink-0" />
                      {sto.city_name}
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-sm text-white/70">
                      <MapPin className="h-4 w-4 shrink-0" />
                      {sto.address}
                    </p>
                    <p className="mt-2 text-xs text-white/50">
                      Создано: {formatDate(sto.created_at)}
                    </p>
                    <Link
                      to={`/sto-panel/${sto.id}`}
                      className="mt-4 inline-block w-full rounded-xl bg-gradient-to-r from-emerald-500 to-violet-500 py-2.5 text-center font-medium text-white transition-opacity hover:opacity-90"
                    >
                      Управлять
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </motion.div>
    </Container>
  );
}
