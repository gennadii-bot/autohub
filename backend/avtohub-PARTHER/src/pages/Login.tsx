import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";

function CarServiceIllustration() {
  return (
    <svg
      viewBox="0 0 400 320"
      className="h-full w-full max-h-[280px] md:max-h-none opacity-60"
      aria-hidden
    >
      <defs>
        <linearGradient id="carGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      {/* Car body */}
      <path
        d="M80 180 Q80 140 120 120 L200 120 L280 120 Q320 140 320 180 L320 220 L80 220 Z"
        fill="url(#carGrad)"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="2"
      />
      {/* Wheels */}
      <circle cx="130" cy="220" r="28" fill="#1e293b" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
      <circle cx="130" cy="220" r="18" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
      <circle cx="270" cy="220" r="28" fill="#1e293b" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
      <circle cx="270" cy="220" r="18" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
      {/* Windshield */}
      <path d="M140 120 L180 120 L200 160 L160 160 Z" fill="rgba(14,165,233,0.3)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      {/* Wrench */}
      <g transform="translate(260, 80)">
        <path d="M0 0 L0 40 L40 40 L40 0 Z" fill="none" stroke="rgba(16,185,129,0.5)" strokeWidth="4" strokeLinecap="round" />
        <path d="M20 20 m-12 0 a 12 12 0 1 1 24 0 a 12 12 0 1 1 -24 0" fill="none" stroke="rgba(16,185,129,0.5)" strokeWidth="4" />
      </g>
      {/* Gear/cog */}
      <circle cx="320" cy="100" r="35" fill="none" stroke="rgba(14,165,233,0.3)" strokeWidth="3" />
      <circle cx="320" cy="100" r="25" fill="none" stroke="rgba(14,165,233,0.3)" strokeWidth="2" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <line
          key={deg}
          x1={320 + 35 * Math.cos((deg * Math.PI) / 180)}
          y1={100 + 35 * Math.sin((deg * Math.PI) / 180)}
          x2={320 + 25 * Math.cos((deg * Math.PI) / 180)}
          y2={100 + 25 * Math.sin((deg * Math.PI) / 180)}
          stroke="rgba(14,165,233,0.3)"
          strokeWidth="2"
        />
      ))}
    </svg>
  );
}

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
      const axiosErr = err as {
        response?: {
          data?: { error?: { message?: string }; detail?: { message?: string } };
          status?: number;
        };
      };
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
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8"
      style={{
        background:
          "radial-gradient(circle at 20% 20%, #1e293b 0%, transparent 40%), radial-gradient(circle at 80% 80%, #0ea5e9 0%, transparent 40%), linear-gradient(135deg, #020617, #0f172a, #020617)",
      }}
    >
      {/* Grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />

      {/* Illustration - right on desktop, top on mobile */}
      <div className="pointer-events-none absolute right-0 top-0 hidden h-full w-[45%] max-w-[500px] md:block">
        <div className="flex h-full items-center justify-end pr-8 pt-16">
          <CarServiceIllustration />
        </div>
      </div>
      <div className="pointer-events-none absolute left-1/2 top-8 block w-[200px] -translate-x-1/2 md:hidden">
        <CarServiceIllustration />
      </div>

      {/* Card */}
      <div
        className="animate-auth-card relative z-10 w-[90%] max-w-[420px] rounded-xl p-8 shadow-xl"
        style={{
          background: "rgba(15, 23, 42, 0.6)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <h1 className="mb-1 text-2xl font-bold text-white">AutoHub Партнёр</h1>
        <p className="mb-6 text-sm text-slate-400">Вход в кабинет автосервиса</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-600/80 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 outline-none transition focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
              placeholder="email@example.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Пароль</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-600/80 bg-slate-800/50 px-4 py-3 pr-10 text-white placeholder-slate-500 outline-none transition focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                placeholder="••••••••"
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
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg py-3 font-medium text-white transition hover:bg-[#059669] disabled:opacity-50"
            style={{ backgroundColor: "#10b981" }}
          >
            {loading ? "Вход..." : "Войти"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Нет аккаунта?{" "}
          <Link to="/register" className="font-medium text-emerald-400 hover:underline">
            Зарегистрировать СТО
          </Link>
        </p>
      </div>
    </div>
  );
}
