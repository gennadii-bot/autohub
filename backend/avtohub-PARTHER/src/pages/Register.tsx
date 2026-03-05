import { Link } from "react-router-dom";

export function Register() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/95 p-8">
        <h1 className="mb-2 text-2xl font-bold text-white">Регистрация СТО</h1>
        <p className="mb-6 text-slate-400">
          Оставьте заявку на подключение вашего автосервиса к платформе AutoHub. Мы свяжемся с
          вами для завершения регистрации.
        </p>
        <div className="mb-6 rounded-xl border border-slate-700 bg-slate-800/50 p-4 text-slate-300">
          <p className="text-sm">
            Для регистрации СТО заполните заявку на основном сайте AutoHub или свяжитесь с нами
            по email.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <a
            href={`${import.meta.env.VITE_MAIN_APP_URL || "https://avtohub.kz"}/become-partner`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl bg-emerald-600 px-6 py-3 text-center font-medium text-white transition hover:bg-emerald-500"
          >
            Оставить заявку на сайте
          </a>
          <Link
            to="/login"
            className="rounded-xl border border-slate-600 bg-slate-800/80 px-6 py-3 text-center font-medium text-white transition hover:border-blue-500/50 hover:bg-blue-500/20"
          >
            Войти в кабинет
          </Link>
        </div>
        <p className="mt-4 text-center text-sm text-slate-400">
          Уже есть аккаунт?{" "}
          <Link to="/login" className="text-emerald-400 hover:underline">
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
}
