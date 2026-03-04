import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string }; detail?: { message?: string } }; status?: number } };
      const msg =
        axiosErr?.response?.data?.error?.message ??
        axiosErr?.response?.data?.detail?.message ??
        (axiosErr?.response?.status === 401 ? "Неверный email или пароль" : null) ??
        (err instanceof Error ? err.message : "Ошибка входа");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/95 p-8">
        <h1 className="mb-2 text-2xl font-bold text-white">AvtoHub Партнёр</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-slate-300">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-300">Пароль</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
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
          {error && <div className="rounded-xl bg-red-500/20 px-4 py-3 text-red-400">{error}</div>}
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-emerald-600 py-3 text-white disabled:opacity-50">
            {loading ? "Вход..." : "Войти"}
          </button>
        </form>
      </div>
    </div>
  );
}
