import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getStos } from "../api/data";
import type { AdminSto } from "../types/admin";

export function Stos() {
  const [stos, setStos] = useState<AdminSto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { items, total: t } = await getStos(page, 20, search || undefined);
      setStos(items);
      setTotal(t);
    } catch {
      setError("Не удалось загрузить СТО");
      setStos([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.ceil(total / 20) || 1;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">Все STO</h1>
      <div className="flex flex-wrap gap-4">
        <input
          type="text"
          placeholder="Поиск по названию..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && setPage(1)}
          className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
        />
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
      ) : stos.length === 0 ? (
        <p className="rounded-xl border border-slate-700 bg-slate-800/50 py-12 text-center text-slate-400">
          Нет СТО
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-800/50">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">ID</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Название</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Город</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Адрес</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Рейтинг</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Действия</th>
                </tr>
              </thead>
              <tbody>
                {stos.map((s) => (
                  <tr key={s.id} className="border-b border-slate-700/50 last:border-0 hover:bg-slate-800/50">
                    <td className="px-4 py-4 text-white">{s.id}</td>
                    <td className="px-4 py-4 text-white">{s.name}</td>
                    <td className="px-4 py-4 text-slate-300">{s.city?.name ?? "—"}</td>
                    <td className="px-4 py-4 text-slate-300">{s.address}</td>
                    <td className="px-4 py-4 text-slate-300">{s.rating ?? "—"}</td>
                    <td className="px-4 py-4">
                      <Link
                        to={`/stos/${s.id}`}
                        className="text-emerald-400 hover:text-emerald-300"
                      >
                        Подробнее
                      </Link>
                    </td>
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
