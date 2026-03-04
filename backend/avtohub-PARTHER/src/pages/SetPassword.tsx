import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { setPassword } from "../api/auth";

export function SetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";

  const [password, setPasswordValue] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) setError("Отсутствует токен активации.");
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!token) return;
    if (password.length < 8) {
      setError("Пароль не менее 8 символов.");
      return;
    }
    if (password !== confirm) {
      setError("Пароли не совпадают.");
      return;
    }
    setLoading(true);
    try {
      await setPassword(token, password);
      setSuccess(true);
      setTimeout(() => navigate("/login", { replace: true }), 2000);
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: { message?: string }; detail?: string } } })
              .response?.data?.error?.message ??
              (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : null;
      setError(typeof msg === "string" ? msg : "Ошибка активации. Проверьте ссылку или повторите позже.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/95 p-8 text-center">
          <h1 className="mb-4 text-xl font-bold text-white">AvtoHub Партнёр</h1>
          <p className="text-red-400">Неверная или устаревшая ссылка активации.</p>
          <a href="/login" className="mt-4 inline-block text-emerald-400 hover:underline">
            Перейти на вход
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/95 p-8">
        <h1 className="mb-2 text-2xl font-bold text-white">Установка пароля</h1>
        <p className="mb-6 text-sm text-slate-400">Задайте пароль для входа в партнёрскую панель.</p>

        {success ? (
          <div className="rounded-xl bg-emerald-500/20 p-4 text-emerald-400">
            Аккаунт активирован. Перенаправление на вход...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-slate-300">Пароль (мин. 8 символов)</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPasswordValue(e.target.value)}
                  required
                  minLength={8}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 pr-10 text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-300">Повторите пароль</label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 pr-10 text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  aria-label={showConfirm ? "Скрыть пароль" : "Показать пароль"}
                >
                  {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            {error && (
              <div className="rounded-xl bg-red-500/20 px-4 py-3 text-red-400">{error}</div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-emerald-600 py-3 text-white disabled:opacity-50"
            >
              {loading ? "Сохранение..." : "Сохранить и войти"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
