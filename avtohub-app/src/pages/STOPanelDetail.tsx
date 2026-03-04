import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, MapPin, Calendar, Clock, Image as ImageIcon, Settings } from "lucide-react";
import { getMySto } from "../api/stoOwner";
import type { MySto } from "../api/stoOwner";
import { useToast } from "../context/ToastContext";
import { Container } from "../components/layout/Container";

function StubSection({
  title,
  icon: Icon,
  href,
}: {
  title: string;
  icon: React.ElementType;
  href?: string;
}) {
  const content = (
    <>
      <div className="flex items-center gap-2 text-white/70">
        <Icon className="h-5 w-5" />
        <span className="font-medium">{title}</span>
      </div>
      {href ? (
        <span className="mt-2 text-sm text-emerald-400">Управлять →</span>
      ) : (
        <p className="mt-2 text-sm text-white/50">Раздел в разработке</p>
      )}
    </>
  );
  const cardClass =
    "glass-card rounded-2xl border border-white/10 p-6 transition-all hover:border-white/20";
  return href ? (
    <Link to={href} className={`block ${cardClass}`}>
      {content}
    </Link>
  ) : (
    <div className={cardClass}>{content}</div>
  );
}

export function STOPanelDetail() {
  const { stoId } = useParams<{ stoId: string }>();
  const { addToast } = useToast();
  const [sto, setSto] = useState<MySto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const loadSto = useCallback(async () => {
    const id = stoId ? parseInt(stoId, 10) : NaN;
    if (!id || Number.isNaN(id)) {
      setError("Неверный ID");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await getMySto(id);
      setSto(data);
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
        setSto(null);
        return;
      }
      setError("Не удалось загрузить данные СТО");
      setSto(null);
    } finally {
      setLoading(false);
    }
  }, [stoId, addToast]);

  useEffect(() => {
    loadSto();
  }, [loadSto]);

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

  if (error || !sto) {
    return (
      <Container className="py-12">
        <p className="text-red-400">{error ?? "СТО не найдена"}</p>
        <Link
          to="/sto-panel"
          className="mt-4 inline-block text-emerald-400 hover:underline"
        >
          ← Вернуться к списку
        </Link>
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
          to="/sto-panel"
          className="mb-6 inline-block text-sm text-white/70 hover:text-emerald-400"
        >
          ← Мои СТО
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white sm:text-3xl">
            {sto.name}
          </h1>
          <p className="mt-2 flex items-center gap-2 text-white/70">
            <Building2 className="h-4 w-4 shrink-0" />
            {sto.city_name}
          </p>
          <p className="mt-1 flex items-center gap-2 text-white/70">
            <MapPin className="h-4 w-4 shrink-0" />
            {sto.address}
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <StubSection
            title="Услуги"
            icon={Clock}
            href={sto ? `/sto-panel/${sto.id}/services` : undefined}
          />
          <StubSection
            title="Записи"
            icon={Calendar}
            href={sto ? `/sto-panel/${sto.id}/bookings` : undefined}
          />
          <StubSection
            title="Рабочее время"
            icon={Clock}
            href={sto ? `/sto-panel/${sto.id}/schedule` : undefined}
          />
          <StubSection
            title="Настройки"
            icon={Settings}
            href={sto ? `/sto-panel/${sto.id}/settings` : undefined}
          />
          <StubSection title="Галерея" icon={ImageIcon} />
        </div>
      </motion.div>
    </Container>
  );
}
