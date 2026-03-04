import { useNavigate } from "react-router-dom";
import { ShieldX } from "lucide-react";

export function AccessDenied() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/95 p-12 text-center backdrop-blur-xl">
        <ShieldX className="mx-auto mb-4 h-16 w-16 text-red-400" />
        <h1 className="mb-2 text-2xl font-bold text-white">Access Denied</h1>
        <p className="mb-6 text-slate-400">
          У вас нет прав для доступа к админ-панели. Доступ только для admin и STO Owner.
        </p>
        <button
          type="button"
          onClick={() => navigate("/login", { replace: true })}
          className="rounded-xl bg-slate-700 px-6 py-3 font-medium text-white transition-colors hover:bg-slate-600"
        >
          Выйти
        </button>
      </div>
    </div>
  );
}
