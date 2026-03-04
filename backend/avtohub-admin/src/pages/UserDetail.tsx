import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { getUserDetail } from "../api/admin";

interface UserDetailData {
  id: number;
  email: string;
  name?: string;
  role: string;
  city_name?: string;
  created_at?: string;
  status?: string;
  bookings_count?: number;
  reviews_count?: number;
  bookings?: Array<{
    id: number;
    sto_name?: string;
    service_name?: string;
    date: string;
    time: string;
    status: string;
  }>;
  owned_stos?: Array<{ id: number; name: string; address: string }>;
}

export function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<UserDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getUserDetail(parseInt(id, 10));
      setData(res as UserDetailData);
    } catch {
      setError("Не удалось загрузить данные пользователя");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500" />
        <p className="text-slate-400">Загрузка...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Link
          to="/users"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад к списку
        </Link>
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-red-400">
          <p>{error ?? "Пользователь не найден"}</p>
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

  const bookings = data.bookings ?? [];
  const ownedStos = data.owned_stos ?? [];

  return (
    <div className="space-y-8">
      <Link
        to="/users"
        className="inline-flex items-center gap-2 text-slate-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад к списку
      </Link>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h1 className="mb-6 text-2xl font-semibold text-white">
          {data.name ?? data.email}
        </h1>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-slate-400">ID</dt>
            <dd className="text-white">{data.id}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-400">Email</dt>
            <dd className="text-white">{data.email}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-400">Роль</dt>
            <dd className="text-white">{data.role}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-400">Город</dt>
            <dd className="text-white">{data.city_name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-400">Дата регистрации</dt>
            <dd className="text-white">
              {data.created_at
                ? new Date(data.created_at).toLocaleDateString("ru-RU")
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-slate-400">Статус</dt>
            <dd className="text-white">{data.status ?? "active"}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-400">Записей</dt>
            <dd className="text-white">{data.bookings_count ?? 0}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-400">Отзывов</dt>
            <dd className="text-white">{data.reviews_count ?? 0}</dd>
          </div>
        </dl>
      </div>

      {ownedStos.length > 0 && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Мои СТО</h2>
          <div className="space-y-2">
            {ownedStos.map((s) => (
              <Link
                key={s.id}
                to={`/stos/${s.id}`}
                className="block rounded-lg border border-slate-600 bg-slate-800/50 p-4 text-emerald-400 hover:border-emerald-500/50 hover:bg-slate-800"
              >
                {s.name} — {s.address}
              </Link>
            ))}
          </div>
        </div>
      )}

      {bookings.length > 0 && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Записи</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="px-4 py-2 text-left text-sm text-slate-400">СТО</th>
                  <th className="px-4 py-2 text-left text-sm text-slate-400">Услуга</th>
                  <th className="px-4 py-2 text-left text-sm text-slate-400">Дата</th>
                  <th className="px-4 py-2 text-left text-sm text-slate-400">Статус</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-b border-slate-700/50">
                    <td className="px-4 py-3 text-slate-300">{b.sto_name ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-300">{b.service_name ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-300">
                      {b.date} {b.time}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{b.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
