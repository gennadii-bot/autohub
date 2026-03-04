import { useCallback, useEffect, useState } from "react";
import { getStoRequests, approveSto, rejectSto } from "../api/admin";
import type { AdminStoRequest } from "../types/admin";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("ru-KZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export function StoRequests() {
  const [requests, setRequests] = useState<AdminStoRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getStoRequests();
      setRequests(data);
    } catch {
      setError("Не удалось загрузить заявки");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async (id: number) => {
    setActionId(id);
    try {
      await approveSto(id);
      setRequests((p) => p.filter((r) => r.id !== id));
      setToast({ msg: "Заявка одобрена", type: "success" });
    } catch (err: unknown) {
      const res = err && typeof err === "object" && "response" in err ? (err as { response?: { data?: { detail?: string } } }).response : null;
      setToast({ msg: typeof res?.data?.detail === "string" ? res.data.detail : "Ошибка", type: "error" });
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (id: number) => {
    setActionId(id);
    try {
      await rejectSto(id);
      setRequests((p) => p.filter((r) => r.id !== id));
      setToast({ msg: "Заявка отклонена", type: "success" });
    } catch (err: unknown) {
      const res = err && typeof err === "object" && "response" in err ? (err as { response?: { data?: { detail?: string } } }).response : null;
      setToast({ msg: typeof res?.data?.detail === "string" ? res.data.detail : "Ошибка", type: "error" });
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">Заявки STO</h1>
      {toast && <div className={`rounded-xl px-4 py-3 ${toast.type === "success" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>{toast.msg}</div>}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500" />
        </div>
      ) : error ? (
        <p className="text-red-400">{error}</p>
      ) : requests.length === 0 ? (
        <p className="rounded-xl border border-slate-700 bg-slate-800/50 py-12 text-center text-slate-400">Нет заявок</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-800/50">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Название</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Город</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Телефон</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Владелец</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Дата</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-300">Действия</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b border-slate-700/50 last:border-0 hover:bg-slate-800/50">
                  <td className="px-4 py-4 text-white">{r.name}</td>
                  <td className="px-4 py-4 text-slate-300">{r.city.name}</td>
                  <td className="px-4 py-4 text-slate-300">{r.phone ?? "—"}</td>
                  <td className="px-4 py-4 text-slate-300">{r.owner.email}</td>
                  <td className="px-4 py-4 text-slate-400">{formatDate(r.created_at)}</td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => handleApprove(r.id)} disabled={actionId !== null} className="rounded-lg bg-emerald-500/20 px-4 py-2 text-sm text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50">Одобрить</button>
                      <button type="button" onClick={() => handleReject(r.id)} disabled={actionId !== null} className="rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-400 hover:bg-red-500/30 disabled:opacity-50">Отклонить</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
