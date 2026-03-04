import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import type { RegisterPayload } from "../../context/AuthContext";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Container } from "../../components/layout/Container";

const MIN_PASSWORD_LENGTH = 8;
const MIN_CAR_YEAR = 1980;
const MAX_CAR_YEAR = new Date().getFullYear();

export function Register() {
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    first_name: "",
    last_name: "",
    phone: "",
    birth_date: "",
    car_brand: "",
    car_model: "",
    car_year: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const update = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const passwordMatch = form.password === form.confirmPassword;
  const passwordLongEnough = form.password.length >= MIN_PASSWORD_LENGTH;
  const confirmFilled = form.confirmPassword.length > 0;
  const carYearNum = parseInt(form.car_year, 10);
  const carYearValid = !form.car_year || (carYearNum >= MIN_CAR_YEAR && carYearNum <= MAX_CAR_YEAR);
  const birthDateValid = !form.birth_date || !isNaN(new Date(form.birth_date).getTime());

  const hasError =
    error.length > 0 ||
    (confirmFilled && !passwordMatch) ||
    (form.password.length > 0 && !passwordLongEnough) ||
    !carYearValid ||
    !birthDateValid;

  const canSubmit =
    form.email.length > 0 &&
    form.password.length >= MIN_PASSWORD_LENGTH &&
    passwordMatch &&
    form.first_name.trim().length > 0 &&
    form.last_name.trim().length > 0 &&
    form.phone.trim().length > 0 &&
    form.birth_date.length > 0 &&
    form.car_brand.trim().length > 0 &&
    form.car_model.trim().length > 0 &&
    form.car_year.length > 0 &&
    carYearValid &&
    !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password.length < MIN_PASSWORD_LENGTH) {
      setError(`Пароль должен быть не менее ${MIN_PASSWORD_LENGTH} символов`);
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }
    const year = parseInt(form.car_year, 10);
    if (year < MIN_CAR_YEAR || year > MAX_CAR_YEAR) {
      setError(`Год автомобиля: ${MIN_CAR_YEAR}–${MAX_CAR_YEAR}`);
      return;
    }
    setLoading(true);
    try {
      const payload: RegisterPayload = {
        email: form.email,
        password: form.password,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone.trim(),
        birth_date: form.birth_date,
        car_brand: form.car_brand.trim(),
        car_model: form.car_model.trim(),
        car_year: year,
      };
      await register(payload, rememberMe);
      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data
              ?.error?.message
          : null;
      setError(msg ?? "Ошибка регистрации. Попробуйте снова.");
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
        className="w-full max-w-lg"
      >
        <Card className="p-6 sm:p-8">
          <h1 className="text-2xl font-semibold text-neutral-900">Регистрация</h1>
          <p className="mt-2 text-sm text-neutral-600">Создайте аккаунт для записи в СТО</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Имя"
                type="text"
                required
                value={form.first_name}
                onChange={(e) => update("first_name", e.target.value)}
                placeholder="Иван"
              />
              <Input
                label="Фамилия"
                type="text"
                required
                value={form.last_name}
                onChange={(e) => update("last_name", e.target.value)}
                placeholder="Иванов"
              />
            </div>

            <Input
              label="Email"
              type="email"
              required
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="email@example.com"
            />

            <Input
              label="Телефон"
              type="tel"
              required
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              placeholder="+7 777 123 45 67"
            />

            <div>
              <label className="block text-sm font-medium text-neutral-700">Дата рождения</label>
              <input
                type="date"
                required
                value={form.birth_date}
                onChange={(e) => update("birth_date", e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                className="mt-1 w-full rounded-xl border border-neutral-300 px-4 py-3 text-neutral-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="Марка авто"
                type="text"
                required
                value={form.car_brand}
                onChange={(e) => update("car_brand", e.target.value)}
                placeholder="Toyota"
              />
              <Input
                label="Модель"
                type="text"
                required
                value={form.car_model}
                onChange={(e) => update("car_model", e.target.value)}
                placeholder="Camry"
              />
              <div>
                <label className="block text-sm font-medium text-neutral-700">Год</label>
                <input
                  type="number"
                  required
                  min={MIN_CAR_YEAR}
                  max={MAX_CAR_YEAR}
                  value={form.car_year}
                  onChange={(e) => update("car_year", e.target.value)}
                  placeholder={String(MAX_CAR_YEAR)}
                  className={`mt-1 w-full rounded-xl border px-4 py-3 text-neutral-900 outline-none transition focus:ring-2 focus:ring-blue-500 ${
                    form.car_year && !carYearValid ? "border-red-500" : "border-neutral-300"
                  }`}
                />
                {form.car_year && !carYearValid && (
                  <p className="mt-1 text-sm text-red-600">
                    Год: {MIN_CAR_YEAR}–{MAX_CAR_YEAR}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700">Пароль</label>
              <div className="relative mt-1">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  placeholder={`Минимум ${MIN_PASSWORD_LENGTH} символов`}
                  className={`w-full rounded-xl border px-4 py-3 pr-10 text-neutral-900 outline-none transition focus:ring-2 focus:ring-blue-500 ${
                    form.password.length > 0 && !passwordLongEnough
                      ? "border-red-500"
                      : "border-neutral-300"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700"
                  aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {form.password.length > 0 && !passwordLongEnough && (
                <p className="mt-1 text-sm text-red-600">Минимум {MIN_PASSWORD_LENGTH} символов</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700">
                Подтверждение пароля
              </label>
              <div className="relative mt-1">
                <input
                  type={showConfirm ? "text" : "password"}
                  required
                  value={form.confirmPassword}
                  onChange={(e) => update("confirmPassword", e.target.value)}
                  placeholder="Повторите пароль"
                  className={`w-full rounded-xl border px-4 py-3 pr-10 text-neutral-900 outline-none transition focus:ring-2 focus:ring-blue-500 ${
                    confirmFilled && !passwordMatch ? "border-red-500" : "border-neutral-300"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700"
                  aria-label={showConfirm ? "Скрыть пароль" : "Показать пароль"}
                >
                  {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {confirmFilled && !passwordMatch && (
                <p className="mt-1 text-sm text-red-600">Пароли не совпадают</p>
              )}
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

            <Button type="submit" fullWidth disabled={!canSubmit || hasError}>
              {loading ? "Регистрация..." : "Зарегистрироваться"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-neutral-600">
            Уже есть аккаунт?{" "}
            <Link to="/login" className="font-medium text-blue-600 hover:underline">
              Войти
            </Link>
          </p>
        </Card>
      </motion.div>
    </Container>
  );
}
