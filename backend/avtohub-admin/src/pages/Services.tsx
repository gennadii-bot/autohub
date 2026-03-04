import { useCallback, useEffect, useState } from "react";
import { getAdminCatalog, createCatalogItem, updateCatalogItem, deleteCatalogItem } from "../api/admin";
import type { AdminCatalogItem } from "../types/admin";
import { useAuth } from "../context/AuthContext";

const CATEGORY_OPTIONS = ["Диагностика", "ТО", "Ремонт", "Шиномонтаж", "Другое"];

export function Services() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";

  const [items, setItems] = useState<AdminCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editItem, setEditItem] = useState<AdminCatalogItem | null>(null);
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formActive, setFormActive] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getAdminCatalog();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setError("Не удалось загрузить каталог");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditItem(null);
    setFormName("");
    setFormCategory(CATEGORY_OPTIONS[0] ?? "");
    setFormDescription("");
    setFormActive(true);
    setModal("create");
  };

  const openEdit = (item: AdminCatalogItem) => {
    setEditItem(item);
    setFormName(item.name);
    setFormCategory(item.category);
    setFormDescription(item.description ?? "");
    setFormActive(item.is_active);
    setModal("edit");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCategory.trim()) return;
    try {
      await createCatalogItem({
        name: formName.trim(),
        category: formCategory.trim(),
        description: formDescription.trim() || null,
        is_active: formActive,
      });
      setModal(null);
      load();
    } catch {
      setError("Не удалось создать");
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem || !formName.trim() || !formCategory.trim()) return;
    try {
      await updateCatalogItem(editItem.id, {
        name: formName.trim(),
        category: formCategory.trim(),
        description: formDescription.trim() || null,
        is_active: formActive,
      });
      setModal(null);
      setEditItem(null);
      load();
    } catch {
      setError("Не удалось сохранить");
    }
  };

  const handleToggleActive = async (item: AdminCatalogItem) => {
    try {
      await updateCatalogItem(item.id, { is_active: !item.is_active });
      load();
    } catch {
      setError("Не удалось изменить");
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteId === null) return;
    try {
      await deleteCatalogItem(deleteId);
      setDeleteId(null);
      load();
    } catch {
      setError("Не удалось удалить");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500" />
      </div>
    );
  }

  if (error) return <p className="text-red-400">{error}</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-white">Каталог услуг</h1>
        {isSuperAdmin && (
          <button
            type="button"
            onClick={openCreate}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            Добавить услугу
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border border-slate-700 bg-slate-800/50 py-12 text-center text-slate-400">
          Нет услуг
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-800/50">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Название</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Категория</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Описание</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Активность</th>
                {isSuperAdmin && (
                  <th className="px-4 py-3 text-right text-sm font-medium text-slate-300">Действия</th>
                )}
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(items) ? items : []).map((s) => (
                <tr key={s.id} className="border-b border-slate-700/50 last:border-0 hover:bg-slate-800/50">
                  <td className="px-4 py-4 text-white">{s.id}</td>
                  <td className="px-4 py-4 text-white">{s.name}</td>
                  <td className="px-4 py-4 text-slate-300">{s.category ?? "—"}</td>
                  <td className="max-w-xs truncate px-4 py-4 text-slate-400">{s.description ?? "—"}</td>
                  <td className="px-4 py-4">
                    {isSuperAdmin ? (
                      <button
                        type="button"
                        onClick={() => handleToggleActive(s)}
                        className={s.is_active ? "text-emerald-400" : "text-slate-500"}
                      >
                        {s.is_active ? "Вкл" : "Выкл"}
                      </button>
                    ) : (
                      <span className={s.is_active ? "text-emerald-400" : "text-slate-500"}>
                        {s.is_active ? "Вкл" : "Выкл"}
                      </span>
                    )}
                  </td>
                  {isSuperAdmin && (
                    <td className="px-4 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(s)}
                        className="mr-2 text-slate-400 hover:text-white"
                      >
                        Редактировать
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteId(s.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        Удалить
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">
              {modal === "create" ? "Добавить услугу" : "Редактировать услугу"}
            </h2>
            <form onSubmit={modal === "create" ? handleCreate : handleUpdate} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-slate-400">Название</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-400">Категория</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white"
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-400">Описание</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="formActive"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="rounded border-slate-600"
                />
                <label htmlFor="formActive" className="text-sm text-slate-400">Активна</label>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="rounded-xl bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-500">
                  {modal === "create" ? "Добавить" : "Сохранить"}
                </button>
                <button
                  type="button"
                  onClick={() => { setModal(null); setEditItem(null); }}
                  className="rounded-xl border border-slate-600 px-4 py-2 text-slate-300 hover:bg-slate-800"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6">
            <p className="mb-4 text-slate-300">Удалить эту услугу из каталога?</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="rounded-xl bg-red-600 px-4 py-2 text-white hover:bg-red-500"
              >
                Удалить
              </button>
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="rounded-xl border border-slate-600 px-4 py-2 text-slate-300 hover:bg-slate-800"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
