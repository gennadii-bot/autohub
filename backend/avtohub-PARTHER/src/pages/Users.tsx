import { useCallback, useEffect, useState } from "react";
import { getUsers } from "../api/data";
import type { AdminUser } from "../types/admin";

export function Users() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { items, total: t } = await getUsers(page, 20, search || undefined, role || undefined);
      setUsers(items);
      setTotal(t);
    } catch {
      setError("Не удалось загрузить пользователей");
      setUsers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, search, role]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.ceil(total / 20) || 1;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">Пользователи</h1>
      <div className="flex flex-wrap gap-4">
        <input
          type="text"
          placeholder="Поиск по email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && setPage(1)}
          className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
        />
        <select
          value={role}
          onChange={(e) => { setRole(e.target.value); setPage(1); }}
          className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:border-emerald-500 focus:outline-none"
        >
          <option value="">Все роли</option>
          <option value="client">client</option>
          <option value="sto_owner">sto_owner</option>
          <option value="admin">admin</option>
        </select>
        <button
          type="button"
          onClick={() => load()}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-500"
        >
          Поиск
        </button>
      </div>
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500" />
        </div>
      ) : error ? (
        <p className="text-red-400">{error}</p>
      ) : users.length === 0 ? (
        <p className="rounded-xl border border-slate-700 bg-slate-800/50 py-12 text-center text-slate-400">
          Нет пользователей
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-800/50">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">ID</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Роль</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-700/50 last:border-0 hover:bg-slate-800/50">
                    <td className="px-4 py-4 text-white">{u.id}</td>
                    <td className="px-4 py-4 text-slate-300">{u.email}</td>
                    <td className="px-4 py-4 text-slate-300">{u.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg bg-slate-700 px-4 py-2 text-white disabled:opacity-50"
              >
                Назад
              </button>
              <span className="flex items-center px-4 text-slate-400">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-lg bg-slate-700 px-4 py-2 text-white disabled:opacity-50"
              >
                Вперёд
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
