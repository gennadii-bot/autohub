import { useCallback, useEffect, useState } from "react";
import {
  getStoRequests,
  getStoRequestDetail,
  approveStoRequest,
  rejectStoRequest,
} from "../api/admin";
import { api } from "../api/api";
import type { AdminStoRequest } from "../types/admin";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("ru-KZ", {
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

export function StoRequests() {
  const [requests, setRequests] = useState<AdminStoRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage] = useState(20);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [detail, setDetail] = useState<AdminStoRequest | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; reason: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getStoRequests({
        status: statusFilter || undefined,
        page,
        per_page: perPage,
      });
      setRequests(data.items);
      setTotal(data.total);
    } catch {
      setError("Не удалось загрузить заявки");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page, perPage]);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async (id: string) => {
    setActionId(id);
    try {
      await approveStoRequest(id);
      setRequests((p) => p.filter((r) => r.id !== id));
      setTotal((t) => Math.max(0, t - 1));
      setDetail((d) => (d?.id === id ? null : d));
      setToast({ msg: "Заявка одобрена", type: "success" });
    } catch (err: unknown) {
      const res =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: { message?: string }; detail?: string } } })
              .response
          : null;
      const msg = res?.data?.error?.message ?? res?.data?.detail ?? "Ошибка";
      setToast({ msg: typeof msg === "string" ? msg : "Ошибка", type: "error" });
    } finally {
      setActionId(null);
    }
  };

  const openRejectModal = (id: string) => {
    setRejectModal({ id, reason: "" });
  };

  const handleRejectSubmit = async () => {
    if (!rejectModal) return;
    const { id, reason } = rejectModal;
    setActionId(id);
    try {
      await rejectStoRequest(id, reason || undefined);
      setRequests((p) => p.filter((r) => r.id !== id));
      setTotal((t) => Math.max(0, t - 1));
      setDetail((d) => (d?.id === id ? null : d));
      setRejectModal(null);
      setToast({ msg: "Заявка отклонена", type: "success" });
    } catch (err: unknown) {
      const res =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: { message?: string }; detail?: string } } })
              .response
          : null;
      const msg = res?.data?.error?.message ?? res?.data?.detail ?? "Ошибка";
      setToast({ msg: typeof msg === "string" ? msg : "Ошибка", type: "error" });
    } finally {
      setActionId(null);
    }
  };

  const openDetail = async (id: string) => {
    const d = await getStoRequestDetail(id);
    setDetail(d ?? null);
  };

  const totalPages = Math.ceil(total / perPage) || 1;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">Заявки STO</h1>
      {toast && (
        <div
          className={`rounded-xl px-4 py-3 ${
            toast.type === "success"
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-red-500/20 text-red-400"
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
        >
          <option value="">Все статусы</option>
          <option value="pending">На рассмотрении</option>
          <option value="approved">Одобрены</option>
          <option value="rejected">Отклонены</option>
        </select>
        <span className="text-sm text-slate-400">
          Всего: {total} | Страница {page} из {totalPages}
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500" />
        </div>
      ) : error ? (
        <p className="text-red-400">{error}</p>
      ) : requests.length === 0 ? (
        <p className="rounded-xl border border-slate-700 bg-slate-800/50 py-12 text-center text-slate-400">
          Нет заявок
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-800/50">
          <table className="w-full min-w-[820px] border-collapse">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">СТО</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Город</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Адрес</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Статус</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Телефон</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Email</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Дата</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-300">Действия</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-slate-700/50 last:border-0 hover:bg-slate-800/50"
                >
                  <td className="px-4 py-4">
                    <button
                      type="button"
                      onClick={() => openDetail(r.id)}
                      className="text-left font-medium text-white hover:underline"
                    >
                      {r.sto_name}
                    </button>
                  </td>
                  <td className="px-4 py-4 text-slate-300">{r.city_name}</td>
                  <td className="max-w-[180px] truncate px-4 py-4 text-slate-300" title={r.address}>
                    {r.address}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        r.status === "pending"
                          ? "bg-amber-500/20 text-amber-400"
                          : r.status === "approved"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {r.status === "pending"
                        ? "На рассмотрении"
                        : r.status === "approved"
                          ? "Одобрена"
                          : "Отклонена"}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-slate-300">{r.phone}</td>
                  <td className="px-4 py-4 text-slate-300">{r.email}</td>
                  <td className="px-4 py-4 text-slate-400">{formatDate(r.created_at)}</td>
                  <td className="px-4 py-4 text-right">
                    {r.status === "pending" && (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleApprove(r.id)}
                          disabled={actionId !== null}
                          title="Одобрить заявку"
                          className="rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50"
                        >
                          {actionId === r.id ? "..." : "Одобрить"}
                        </button>
                        <button
                          type="button"
                          onClick={() => openRejectModal(r.id)}
                          disabled={actionId !== null}
                          title="Отклонить заявку"
                          className="rounded-lg bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/30 disabled:opacity-50"
                        >
                          {actionId === r.id ? "..." : "Отклонить"}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            Назад
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            Вперёд
          </button>
        </div>
      )}

      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-800 p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">Отклонить заявку</h3>
            <p className="mb-4 text-sm text-slate-400">
              Укажите причину отказа (будет отправлена на email партнёра):
            </p>
            <textarea
              value={rejectModal.reason}
              onChange={(e) =>
                setRejectModal((m) => (m ? { ...m, reason: e.target.value } : null))
              }
              placeholder="Причина отзыва..."
              rows={4}
              className="mb-4 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white placeholder-slate-500"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectModal(null)}
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleRejectSubmit}
                className="rounded-lg bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/30"
              >
                Отклонить
              </button>
            </div>
          </div>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-700 bg-slate-800 p-6">
            <div className="mb-4 flex justify-between">
              <h3 className="text-lg font-semibold text-white">Заявка: {detail.sto_name}</h3>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="space-y-6 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-400">ФИО:</span>{" "}
                  {[detail.last_name, detail.first_name, detail.middle_name]
                    .filter(Boolean)
                    .join(" ")}
                </div>
                <div>
                  <span className="text-slate-400">Email:</span> {detail.email}
                </div>
                <div>
                  <span className="text-slate-400">Телефон:</span> {detail.phone}
                </div>
                <div>
                  <span className="text-slate-400">ИИН:</span> {detail.iin}
                </div>
                {detail.bin && (
                  <div>
                    <span className="text-slate-400">БИН:</span> {detail.bin}
                  </div>
                )}
                {detail.ip_name && (
                  <div>
                    <span className="text-slate-400">ИП / Юр. лицо:</span> {detail.ip_name}
                  </div>
                )}
                <div>
                  <span className="text-slate-400">Регион:</span> {detail.region_name}
                </div>
                <div>
                  <span className="text-slate-400">Город:</span> {detail.city_name}
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400">Адрес:</span> {detail.address}
                </div>
                {detail.sto_description && (
                  <div className="col-span-2">
                    <span className="text-slate-400">Описание / График работы:</span>{" "}
                    {detail.sto_description}
                  </div>
                )}
                {detail.rejection_reason && (
                  <div className="col-span-2">
                    <span className="text-slate-400">Причина отказа:</span>{" "}
                    <span className="text-red-400">{detail.rejection_reason}</span>
                  </div>
                )}
              </div>
              {detail.photo_url && (
                <div>
                  <span className="text-slate-400">Фото:</span>
                  <img
                    src={
                      detail.photo_url.startsWith("/")
                        ? `${api.defaults.baseURL || ""}${detail.photo_url}`
                        : detail.photo_url
                    }
                    alt="СТО"
                    className="mt-2 max-h-48 rounded-lg object-cover"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
