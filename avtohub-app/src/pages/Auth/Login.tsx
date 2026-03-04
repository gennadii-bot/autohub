import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Container } from "../../components/layout/Container";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fromState = (location.state as { from?: { pathname?: string; search?: string } })?.from;
  const fromQuery = new URLSearchParams(location.search).get("from");
  const partnerUrl = import.meta.env.VITE_PARTNER_URL || "http://localhost:5175";
  const adminUrl = import.meta.env.VITE_ADMIN_URL || "http://localhost:5177";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(email, password, rememberMe);
      if (!user) return;
      const role = user.role;
      if (role === "client") {
        const fromPath = fromState?.pathname ?? (fromQuery ? decodeURIComponent(fromQuery) : "");
        const redirectTo =
          fromPath && (fromPath.startsWith("/dashboard") || fromPath.startsWith("/sto/"))
            ? fromPath
            : "/dashboard";
        navigate(redirectTo, { replace: true });
      } else if (role === "sto_owner" || role === "sto") {
        window.location.href = partnerUrl;
      } else if (role === "admin" || role === "super_admin") {
        window.location.href = adminUrl;
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data
              ?.error?.message
          : null;
      setError(msg ?? "Ошибка входа. Проверьте данные.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="flex min-h-[70vh] items-center justify-center py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <Card className="p-6 sm:p-8">
          <h1 className="text-2xl font-semibold text-neutral-900">Вход</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Войдите в личный кабинет
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </p>
            )}
            <Input
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
            />
            <div className="w-full">
              <label className="block text-sm font-medium text-neutral-700">Пароль</label>
              <div className="relative mt-1">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-neutral-300 px-4 py-3 pr-10 text-neutral-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700"
                  aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" aria-hidden />
                  ) : (
                    <Eye className="h-5 w-5" aria-hidden />
                  )}
                </button>
              </div>
            </div>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-neutral-700">Запомнить меня</span>
            </label>
            <Button type="submit" fullWidth disabled={loading}>
              {loading ? "Вход..." : "Войти"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-neutral-600">
            Нет аккаунта?{" "}
            <Link to="/register" className="font-medium text-blue-600 hover:underline">
              Зарегистрироваться
            </Link>
          </p>
        </Card>
      </motion.div>
    </Container>
  );
}
