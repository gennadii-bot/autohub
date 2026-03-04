import { useCallback, useEffect, useState } from "react";
import { getReviews } from "../api/data";
import type { AdminReview } from "../types/admin";

export function Reviews() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getReviews();
      setReviews(data);
    } catch {
      setError("Не удалось загрузить отзывы");
      setReviews([]);
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
      <h1 className="text-2xl font-semibold text-white">Отзывы</h1>
      {reviews.length === 0 ? (
        <p className="rounded-xl border border-slate-700 bg-slate-800/50 py-12 text-center text-slate-400">
          Нет данных. Добавьте endpoint GET /admin/reviews на backend.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-800/50">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">СТО</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Рейтинг</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Текст</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Дата</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r) => (
                <tr key={r.id} className="border-b border-slate-700/50 last:border-0 hover:bg-slate-800/50">
                  <td className="px-4 py-4 text-white">{r.id}</td>
                  <td className="px-4 py-4 text-slate-300">{r.sto_name ?? r.sto_id}</td>
                  <td className="px-4 py-4 text-slate-300">{r.rating}</td>
                  <td className="max-w-xs truncate px-4 py-4 text-slate-300">{r.text}</td>
                  <td className="px-4 py-4 text-slate-400">{r.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
