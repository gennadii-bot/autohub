import { useCallback, useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  FileCheck,
  Users,
  Building2,
  Package,
  LogOut,
} from "lucide-react";
import {
  approveSto,
  getAdminStats,
  getStoRequests,
  rejectSto,
} from "../api/admin";
import type { AdminStats, AdminStoRequest } from "../api/admin";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

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

const SIDEBAR_ITEMS = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/sto-requests", label: "Заявки СТО", icon: FileCheck },
  { to: "/admin/users", label: "Пользователи", icon: Users },
  { to: "/admin/stos", label: "Все СТО", icon: Building2 },
  { to: "/admin/catalog", label: "Каталог услуг", icon: Package },
] as const;

function Sidebar() {
  const { logout } = useAuth();
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-white/10 bg-black/40 backdrop-blur-xl">
      <div className="border-b border-white/10 p-6">
        <Link to="/admin" className="text-lg font-semibold text-white">
          AvtoHub Admin
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {SIDEBAR_ITEMS.map(({ to, label, icon: Icon }) => {
          const isActive =
            to === "/admin"
              ? location.pathname === "/admin"
              : location.pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </NavLink>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-4">
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white/70 transition-colors hover:bg-red-500/20 hover:text-red-400"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          Выйти
        </button>
      </div>
    </aside>
  );
}

function DashboardContent() {
  const { addToast } = useToast();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [requests, setRequests] = useState<AdminStoRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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
          ? (err as { response?: { data?: { detail?: string } } }).response
          : null;
      const msg =
        typeof res?.data?.detail === "string"
          ? res.data.detail
          : "Ошибка одобрения";
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
          ? (err as { response?: { data?: { detail?: string } } }).response
          : null;
      const msg =
        typeof res?.data?.detail === "string"
          ? res.data.detail
          : "Ошибка отклонения";
      addToast(msg, "error");
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-white sm:text-3xl">
        Админ-панель
      </h1>

      {stats && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-white/20 bg-white/5 p-6 backdrop-blur-sm transition-colors hover:border-white/30">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-500/20 p-3">
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
          <div className="rounded-xl border border-white/20 bg-white/5 p-6 backdrop-blur-sm transition-colors hover:border-white/30">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-500/20 p-3">
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
          <div className="rounded-xl border border-white/20 bg-white/5 p-6 backdrop-blur-sm transition-colors hover:border-white/30">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-500/20 p-3">
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

      <div>
        <h2 className="mb-4 text-lg font-semibold text-white">
          Заявки на подключение
        </h2>

        {loading ? (
          <div className="flex justify-center py-16">
            <div
              className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500"
              aria-label="Загрузка"
            />
          </div>
        ) : error ? (
          <p className="text-red-400">{error}</p>
        ) : requests.length === 0 ? (
          <p className="rounded-xl border border-white/20 bg-white/5 py-12 text-center text-white/70 backdrop-blur-sm">
            Нет заявок на модерацию
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/20 bg-white/5 backdrop-blur-sm">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="px-4 py-3 text-left text-sm font-medium text-white/80">
                    Название
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-white/80">
                    Город
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-white/80">
                    Телефон
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-white/80">
                    Владелец
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-white/80">
                    Дата
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-white/80">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-white/10 transition-colors last:border-0 hover:bg-white/5"
                  >
                    <td className="px-4 py-4 text-white">{r.name}</td>
                    <td className="px-4 py-4 text-white/80">{r.city.name}</td>
                    <td className="px-4 py-4 text-white/80">{r.phone ?? "—"}</td>
                    <td className="px-4 py-4 text-white/80">{r.owner.email}</td>
                    <td className="px-4 py-4 text-white/70">
                      {formatDate(r.created_at)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleApprove(r.id)}
                          disabled={actionId !== null}
                          className="rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {actionId === r.id ? "..." : "Одобрить"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(r.id)}
                          disabled={actionId !== null}
                          className="rounded-lg bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-50"
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
      </div>
    </div>
  );
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-white sm:text-3xl">{title}</h1>
      <p className="rounded-xl border border-white/20 bg-white/5 py-12 text-center text-white/70 backdrop-blur-sm">
        Раздел в разработке
      </p>
    </div>
  );
}

export function AdminPanel() {
  const location = useLocation();
  const path = location.pathname;

  const content =
    path === "/admin" || path.startsWith("/admin/sto-requests") ? (
      <DashboardContent />
    ) : path.startsWith("/admin/users") ? (
      <PlaceholderPage title="Пользователи" />
    ) : path.startsWith("/admin/stos") ? (
      <PlaceholderPage title="Все СТО" />
    ) : path.startsWith("/admin/catalog") ? (
      <PlaceholderPage title="Каталог услуг" />
    ) : (
      <DashboardContent />
    );

  return (
    <div className="flex min-h-screen bg-black/20">
      <Sidebar />
      <main className="ml-64 flex-1 p-6 pt-24 md:p-8 md:pt-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {content}
        </motion.div>
      </main>
    </div>
  );
}
