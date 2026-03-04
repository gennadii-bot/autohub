import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Building2, FileCheck, LogOut } from "lucide-react";
import {
  approveSto,
  getAdminStats,
  getStoRequests,
  rejectSto,
} from "../api/admin";
import type { AdminStats, AdminStoRequest } from "../api/admin";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Container } from "../components/layout/Container";
import { Button } from "../components/ui/Button";

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("ru-KZ", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function Admin() {
  const { logout } = useAuth();
  const { addToast } = useToast();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [requests, setRequests] = useState<AdminStoRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [actionId, setActionId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [statsData, requestsData] = await Promise.all([
        getAdminStats(),
        getStoRequests(),
      ]);
      setStats(statsData);
      setRequests(requestsData);
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
        setStats(null);
        setRequests([]);
        return;
      }
      setError("Не удалось загрузить данные");
      setStats(null);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApprove = async (id: number) => {
    setActionId(id);
    try {
      await approveSto(id);
      setRequests((prev) => prev.filter((r) => r.id !== id));
      setStats((prev) =>
        prev
          ? {
              ...prev,
              pending_requests_count: Math.max(0, prev.pending_requests_count - 1),
            }
          : null
      );
      addToast("Заявка одобрена", "success");
    } catch (err: unknown) {
      const res =
        err && typeof err === "object" && "response" in err
          ? (err as {
              response?: {
                status?: number;
                data?: { error?: { message?: string } };
              };
            }).response
          : null;
      const msg = res?.data?.error?.message ?? "Ошибка одобрения";
      addToast(msg, "error");
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (id: number) => {
    setActionId(id);
    try {
      await rejectSto(id);
      setRequests((prev) => prev.filter((r) => r.id !== id));
      setStats((prev) =>
        prev
          ? {
              ...prev,
              pending_requests_count: Math.max(0, prev.pending_requests_count - 1),
            }
          : null
      );
      addToast("Заявка отклонена", "success");
    } catch (err: unknown) {
      const res =
        err && typeof err === "object" && "response" in err
          ? (err as {
              response?: {
                status?: number;
                data?: { error?: { message?: string } };
              };
            }).response
          : null;
      const msg = res?.data?.error?.message ?? "Ошибка отклонения";
      addToast(msg, "error");
    } finally {
      setActionId(null);
    }
  };

  return (
    <Container className="py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-white sm:text-3xl">
            Админ-панель
          </h1>
          <Button
            variant="secondary"
            onClick={logout}
            className="flex items-center gap-2 border-white/20 bg-white/10 text-white hover:bg-white/20"
          >
            <LogOut className="h-4 w-4" />
            Выйти
          </Button>
        </div>

        {stats && (
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/20 bg-white/5 p-6 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-emerald-500/20 p-3">
                  <Users className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-white/60">Пользователи</p>
                  <p className="text-2xl font-semibold text-white">
                    {stats.users_count}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/5 p-6 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-blue-500/20 p-3">
                  <Building2 className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-white/60">СТО</p>
                  <p className="text-2xl font-semibold text-white">
                    {stats.stos_count}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/5 p-6 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-amber-500/20 p-3">
                  <FileCheck className="h-6 w-6 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-white/60">Заявки (pending)</p>
                  <p className="text-2xl font-semibold text-white">
                    {stats.pending_requests_count}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <h2 className="mt-10 text-lg font-semibold text-white">
          Заявки на подключение СТО
        </h2>

        {loading ? (
          <div className="mt-8 flex justify-center py-16">
            <div
              className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500"
              aria-label="Загрузка"
            />
          </div>
        ) : error ? (
          <p className="mt-6 text-red-400">{error}</p>
        ) : requests.length === 0 ? (
          <p className="mt-8 text-center text-white/70">Нет заявок на модерацию</p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="pb-3 text-left text-sm font-medium text-white/80">
                    Название
                  </th>
                  <th className="pb-3 text-left text-sm font-medium text-white/80">
                    Город
                  </th>
                  <th className="pb-3 text-left text-sm font-medium text-white/80">
                    Телефон
                  </th>
                  <th className="pb-3 text-left text-sm font-medium text-white/80">
                    Владелец
                  </th>
                  <th className="pb-3 text-left text-sm font-medium text-white/80">
                    Дата
                  </th>
                  <th className="pb-3 text-right text-sm font-medium text-white/80">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-white/10 transition-colors hover:bg-white/5"
                  >
                    <td className="py-4 text-white">{r.name}</td>
                    <td className="py-4 text-white/80">{r.city.name}</td>
                    <td className="py-4 text-white/80">{r.phone ?? "—"}</td>
                    <td className="py-4 text-white/80">{r.owner.email}</td>
                    <td className="py-4 text-white/70">{formatDate(r.created_at)}</td>
                    <td className="py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleApprove(r.id)}
                          disabled={actionId !== null}
                          className="rounded-xl bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {actionId === r.id ? "..." : "Одобрить"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(r.id)}
                          disabled={actionId !== null}
                          className="rounded-xl bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {actionId === r.id ? "..." : "Отклонить"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </Container>
  );
}
