import { Link } from "react-router-dom";
import { CheckCircle } from "lucide-react";

export function RegisterSuccess() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/95 p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
          <CheckCircle className="h-10 w-10 text-emerald-500" />
        </div>
        <h1 className="mb-3 text-2xl font-bold text-white">Заявка отправлена</h1>
        <p className="mb-8 text-slate-400">
          Ваша заявка на подключение СТО отправлена. Администратор проверит данные и активирует ваш
          аккаунт. После одобрения вы сможете войти в кабинет партнёра.
        </p>
        <Link
          to="/"
          className="inline-block w-full rounded-xl bg-emerald-600 px-6 py-3 font-medium text-white transition hover:bg-emerald-500"
        >
          Вернуться на главную
        </Link>
      </div>
    </div>
  );
}
