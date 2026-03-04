import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getUsers } from "../api/data";
import type { AdminUser } from "../types/admin";

export function Users() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getUsers(1, 100);
      setUsers(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setError("Не удалось загрузить пользователей");
      setUsers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500" />
        <p className="text-slate-400">Загрузка пользователей...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-white">Пользователи</h1>
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-red-400">
          <p>{error}</p>
          <button
            type="button"
            onClick={load}
            className="mt-4 rounded-lg bg-red-500/20 px-4 py-2 text-sm hover:bg-red-500/30"
          >
            Повторить
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">Пользователи</h1>
      <p className="text-slate-400">Всего: {total}</p>
      {users.length === 0 ? (
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 py-12 text-center text-slate-400">
          Нет данных
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-800/50">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Имя</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Фамилия</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Email</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Телефон</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Марка авто</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Модель авто</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Год авто</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Дата регистрации</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Роль</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-slate-700/50 last:border-0 hover:bg-slate-800/50"
                >
                  <td className="px-4 py-4">
                    <Link
                      to={`/users/${u.id}`}
                      className="font-medium text-emerald-400 hover:text-emerald-300 hover:underline"
                    >
                      {u.id}
                    </Link>
                  </td>
                  <td className="px-4 py-4 text-slate-300">{u.first_name ?? "—"}</td>
                  <td className="px-4 py-4 text-slate-300">{u.last_name ?? "—"}</td>
                  <td className="px-4 py-4 text-white">
                    <Link
                      to={`/users/${u.id}`}
                      className="text-emerald-400 hover:text-emerald-300 hover:underline"
                    >
                      {u.email}
                    </Link>
                  </td>
                  <td className="px-4 py-4 text-slate-300">{u.phone ?? "—"}</td>
                  <td className="px-4 py-4 text-slate-300">{u.car_brand ?? "—"}</td>
                  <td className="px-4 py-4 text-slate-300">{u.car_model ?? "—"}</td>
                  <td className="px-4 py-4 text-slate-300">{u.car_year ?? "—"}</td>
                  <td className="px-4 py-4 text-slate-300">
                    {u.created_at
                      ? new Date(u.created_at).toLocaleDateString("ru-RU")
                      : "—"}
                  </td>
                  <td className="px-4 py-4 text-slate-300">{u.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
