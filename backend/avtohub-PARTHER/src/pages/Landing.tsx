import { Link } from "react-router-dom";
import { Wrench, Calendar, BarChart3 } from "lucide-react";

const BG_IMAGE =
  "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=1920&q=80";

export function Landing() {
  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950"
      style={{
        backgroundImage: `url(${BG_IMAGE})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px]" />
      <div className="relative z-10 mx-4 flex w-full max-w-lg flex-col items-center">
        <div className="w-full rounded-2xl border border-white/10 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl sm:p-10">
          <div className="mb-6 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-500/20">
              <Wrench className="h-8 w-8 text-emerald-400" />
            </div>
          </div>
          <h1 className="mb-2 text-center text-2xl font-bold text-white sm:text-3xl">
            AutoHub для СТО
          </h1>
          <p className="mb-8 text-center text-slate-400">
            Онлайн запись клиентов и управление автосервисом
          </p>
          <div className="mb-6 flex flex-wrap justify-center gap-4 text-slate-500">
            <span className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4" />
              Онлайн-запись
            </span>
            <span className="flex items-center gap-2 text-sm">
              <BarChart3 className="h-4 w-4" />
              Аналитика
            </span>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/register"
              className="rounded-xl bg-emerald-600 px-6 py-3 text-center font-medium text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              Зарегистрировать СТО
            </Link>
            <Link
              to="/login"
              className="rounded-xl border border-slate-600 bg-slate-800/80 px-6 py-3 text-center font-medium text-white transition hover:border-blue-500/50 hover:bg-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              Войти в кабинет
            </Link>
          </div>
        </div>
        <p className="mt-6 text-center text-sm text-slate-500">
          Управляйте записями, услугами и клиентами в одном месте
        </p>
      </div>
    </div>
  );
}
