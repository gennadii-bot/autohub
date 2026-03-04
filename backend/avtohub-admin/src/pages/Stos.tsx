import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getStos } from "../api/data";
import type { AdminSto } from "../types/admin";

export function Stos() {
  const [stos, setStos] = useState<AdminSto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { items, total: t } = await getStos(1, 50);
      setStos(items);
      setTotal(t);
    } catch {
      setError("Не удалось загрузить СТО");
      setStos([]);
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
      <div className="flex justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500" />
      </div>
    );
  }

  if (error) {
    return <p className="text-red-400">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">Все STO</h1>
      <p className="text-slate-400">Всего: {total}</p>
      {stos.length === 0 ? (
        <p className="rounded-xl border border-slate-700 bg-slate-800/50 py-12 text-center text-slate-400">
          Нет СТО
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-800/50">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Название</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Город</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Адрес</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Рейтинг</th>
              </tr>
            </thead>
            <tbody>
              {stos.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-slate-700/50 last:border-0 hover:bg-slate-800/50"
                >
                  <td className="px-4 py-4">
                    <Link
                      to={`/stos/${s.id}`}
                      className="font-medium text-emerald-400 hover:text-emerald-300 hover:underline"
                    >
                      {s.id}
                    </Link>
                  </td>
                  <td className="px-4 py-4 text-white">
                    <Link
                      to={`/stos/${s.id}`}
                      className="text-emerald-400 hover:text-emerald-300 hover:underline"
                    >
                      {s.name}
                    </Link>
                  </td>
                  <td className="px-4 py-4 text-slate-300">{s.city?.name ?? "—"}</td>
                  <td className="px-4 py-4 text-slate-300">{s.address}</td>
                  <td className="px-4 py-4 text-slate-300">{s.rating ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
