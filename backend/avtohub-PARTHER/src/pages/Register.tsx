import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { getRegions, getCitiesByRegion, type Region, type City } from "../api/regions";
import { submitStoRequest } from "../api/stoRequest";

function parseFio(fio: string): { first_name: string; last_name: string; middle_name: string } {
  const parts = fio.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first_name: "", last_name: "", middle_name: "" };
  if (parts.length === 1) return { first_name: parts[0], last_name: parts[0], middle_name: "" };
  if (parts.length === 2) return { last_name: parts[0], first_name: parts[1], middle_name: "" };
  return {
    last_name: parts[0],
    first_name: parts[1],
    middle_name: parts.slice(2).join(" "),
  };
}

export function Register() {
  const navigate = useNavigate();
  const [photo, setPhoto] = useState<File | null>(null);
  const [stoName, setStoName] = useState("");
  const [ownerFio, setOwnerFio] = useState("");
  const [iin, setIin] = useState("");
  const [bin, setBin] = useState("");
  const [schedule, setSchedule] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [regionId, setRegionId] = useState("");
  const [cityId, setCityId] = useState("");
  const [address, setAddress] = useState("");
  const [regions, setRegions] = useState<Region[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getRegions().then(setRegions).catch(() => setError("Не удалось загрузить регионы"));
  }, []);

  const loadCities = useCallback((rid: number) => {
    setCitiesLoading(true);
    setCities([]);
    setCityId("");
    getCitiesByRegion(rid)
      .then(setCities)
      .catch(() => setError("Не удалось загрузить города"))
      .finally(() => setCitiesLoading(false));
  }, []);

  useEffect(() => {
    if (regionId) {
      loadCities(Number(regionId));
    } else {
      setCities([]);
      setCityId("");
    }
  }, [regionId, loadCities]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const { first_name, last_name, middle_name } = parseFio(ownerFio);
    if (!first_name || !last_name) {
      setError("Укажите ФИО владельца (Фамилия Имя Отчество)");
      return;
    }
    const iinClean = iin.replace(/\D/g, "");
    if (iinClean.length !== 12) {
      setError("ИИН должен содержать 12 цифр");
      return;
    }
    if (!stoName.trim()) {
      setError("Укажите название СТО");
      return;
    }
    if (!regionId || !cityId) {
      setError("Выберите регион и город");
      return;
    }
    if (!address.trim() || address.trim().length < 5) {
      setError("Укажите адрес (минимум 5 символов)");
      return;
    }
    if (!phone.trim()) {
      setError("Укажите телефон");
      return;
    }
    if (!email.trim()) {
      setError("Укажите email");
      return;
    }
    if (!password || password.length < 8) {
      setError("Пароль должен быть не менее 8 символов");
      return;
    }
    if (password !== passwordConfirm) {
      setError("Пароли не совпадают");
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("first_name", first_name);
      fd.append("last_name", last_name);
      if (middle_name) fd.append("middle_name", middle_name);
      fd.append("iin", iinClean);
      fd.append("phone", phone.trim());
      fd.append("email", email.trim().toLowerCase());
      if (bin.replace(/\D/g, "")) fd.append("bin", bin.replace(/\D/g, ""));
      fd.append("sto_name", stoName.trim());
      if (schedule.trim()) fd.append("sto_description", schedule.trim());
      fd.append("region_id", regionId);
      fd.append("city_id", cityId);
      fd.append("address", address.trim());
      fd.append("password", password);
      if (photo) fd.append("photo", photo);

      await submitStoRequest(fd);
      navigate("/register-success", { replace: true });
    } catch (err: unknown) {
      const res =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: { message?: string }; detail?: string | { message?: string } } } })
              .response
          : null;
      const detail = res?.data?.detail;
      const msg =
        res?.data?.error?.message ??
        (typeof detail === "string" ? detail : (detail as { message?: string })?.message) ??
        "Ошибка отправки заявки";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900/95 p-8">
        <h1 className="mb-2 text-2xl font-bold text-white">Регистрация СТО</h1>
        <p className="mb-6 text-sm text-slate-400">
          Заполните заявку на подключение вашего автосервиса. После проверки администратором вы
          получите доступ в кабинет партнёра.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-slate-300">Фото СТО</label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white file:mr-4 file:rounded-lg file:border-0 file:bg-slate-700 file:px-4 file:py-2 file:text-sm file:text-white"
            />
            <p className="mt-1 text-xs text-slate-500">JPG, PNG или WebP. Необязательно.</p>
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-300">Название СТО *</label>
            <input
              type="text"
              value={stoName}
              onChange={(e) => setStoName(e.target.value)}
              placeholder="Название автосервиса"
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder-slate-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-300">ФИО владельца *</label>
            <input
              type="text"
              value={ownerFio}
              onChange={(e) => setOwnerFio(e.target.value)}
              placeholder="Фамилия Имя Отчество"
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder-slate-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-300">ИИН владельца * (12 цифр)</label>
            <input
              type="text"
              value={iin}
              onChange={(e) => setIin(e.target.value.replace(/\D/g, "").slice(0, 12))}
              placeholder="123456789012"
              maxLength={12}
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder-slate-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-300">БИН организации</label>
            <input
              type="text"
              value={bin}
              onChange={(e) => setBin(e.target.value.replace(/\D/g, "").slice(0, 12))}
              placeholder="БИН организации"
              maxLength={12}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder-slate-500"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-slate-300">Регион *</label>
              <select
                value={regionId}
                onChange={(e) => setRegionId(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white"
              >
                <option value="">Выберите регион</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-300">Город *</label>
              <select
                value={cityId}
                onChange={(e) => setCityId(e.target.value)}
                required
                disabled={citiesLoading || !regionId}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white disabled:opacity-50"
              >
                <option value="">
                  {citiesLoading ? "Загрузка..." : "Выберите город"}
                </option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-300">Адрес *</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="ул. Примерная, 12"
              required
              minLength={5}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder-slate-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-300">График работы</label>
            <input
              type="text"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              placeholder="Например: Пн-Сб 09:00-18:00"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder-slate-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-300">Телефон *</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+7 ___ ___ __ __"
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder-slate-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-300">Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder-slate-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-300">Пароль *</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Создайте пароль"
                required
                minLength={8}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 pr-10 text-white placeholder-slate-500"
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
            <p className="mt-1 text-xs text-slate-500">
              Минимум 8 символов. После одобрения заявки войдите по email и паролю.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-300">Повторите пароль *</label>
            <input
              type={showPassword ? "text" : "password"}
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="Повторите пароль"
              required
              minLength={8}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder-slate-500"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-500/20 px-4 py-3 text-red-400">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-green-500 py-3 font-medium text-white transition hover:bg-green-600 disabled:opacity-50"
          >
            {loading ? "Отправка..." : "Отправить заявку"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Уже есть аккаунт?{" "}
          <Link to="/login" className="text-emerald-400 hover:underline">
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
}
