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

function CarServiceIllustration() {
  return (
    <svg
      viewBox="0 0 400 320"
      className="h-full w-full max-h-[200px] md:max-h-[240px] opacity-60"
      aria-hidden
    >
      <defs>
        <linearGradient id="carGradReg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      <path
        d="M80 180 Q80 140 120 120 L200 120 L280 120 Q320 140 320 180 L320 220 L80 220 Z"
        fill="url(#carGradReg)"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="2"
      />
      <circle cx="130" cy="220" r="28" fill="#1e293b" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
      <circle cx="130" cy="220" r="18" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
      <circle cx="270" cy="220" r="28" fill="#1e293b" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
      <circle cx="270" cy="220" r="18" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
      <path d="M140 120 L180 120 L200 160 L160 160 Z" fill="rgba(14,165,233,0.3)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      <g transform="translate(260, 80)">
        <path d="M0 0 L0 40 L40 40 L40 0 Z" fill="none" stroke="rgba(16,185,129,0.5)" strokeWidth="4" strokeLinecap="round" />
        <path d="M20 20 m-12 0 a 12 12 0 1 1 24 0 a 12 12 0 1 1 -24 0" fill="none" stroke="rgba(16,185,129,0.5)" strokeWidth="4" />
      </g>
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

const inputClass =
  "w-full rounded-lg border border-slate-600/80 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 outline-none transition focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30";
const labelClass = "mb-1 block text-sm font-medium text-slate-300";

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
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8"
      style={{
        background:
          "radial-gradient(circle at 20% 20%, #1e293b 0%, transparent 40%), radial-gradient(circle at 80% 80%, #0ea5e9 0%, transparent 40%), linear-gradient(135deg, #020617, #0f172a, #020617)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />

      <div className="pointer-events-none absolute right-0 top-0 hidden h-full w-[40%] max-w-[450px] md:block">
        <div className="flex h-full items-center justify-end pr-6 pt-20">
          <CarServiceIllustration />
        </div>
      </div>
      <div className="pointer-events-none absolute left-1/2 top-6 block w-[180px] -translate-x-1/2 md:hidden">
        <CarServiceIllustration />
      </div>

      <div
        className="animate-auth-card relative z-10 w-[90%] max-w-[420px] overflow-y-auto rounded-xl p-8 shadow-xl"
        style={{
          background: "rgba(15, 23, 42, 0.6)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.08)",
          maxHeight: "90vh",
        }}
      >
        <h1 className="mb-1 text-2xl font-bold text-white">Регистрация СТО</h1>
        <p className="mb-6 text-sm text-slate-400">
          Подключите свой автосервис к платформе AutoHub
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Фото СТО</label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              className={`${inputClass} file:mr-4 file:rounded-lg file:border-0 file:bg-slate-700 file:px-4 file:py-2 file:text-sm file:text-white`}
            />
            <p className="mt-1 text-xs text-slate-500">JPG, PNG или WebP. Необязательно.</p>
          </div>

          <div>
            <label className={labelClass}>Название СТО *</label>
            <input
              type="text"
              value={stoName}
              onChange={(e) => setStoName(e.target.value)}
              placeholder="Название автосервиса"
              required
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>ФИО владельца *</label>
            <input
              type="text"
              value={ownerFio}
              onChange={(e) => setOwnerFio(e.target.value)}
              placeholder="Фамилия Имя Отчество"
              required
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>ИИН владельца * (12 цифр)</label>
            <input
              type="text"
              value={iin}
              onChange={(e) => setIin(e.target.value.replace(/\D/g, "").slice(0, 12))}
              placeholder="123456789012"
              maxLength={12}
              required
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>БИН организации</label>
            <input
              type="text"
              value={bin}
              onChange={(e) => setBin(e.target.value.replace(/\D/g, "").slice(0, 12))}
              placeholder="БИН организации"
              maxLength={12}
              className={inputClass}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Регион *</label>
              <select
                value={regionId}
                onChange={(e) => setRegionId(e.target.value)}
                required
                className={`${inputClass} cursor-pointer`}
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
              <label className={labelClass}>Город *</label>
              <select
                value={cityId}
                onChange={(e) => setCityId(e.target.value)}
                required
                disabled={citiesLoading || !regionId}
                className={`${inputClass} cursor-pointer disabled:opacity-50`}
              >
                <option value="">{citiesLoading ? "Загрузка..." : "Выберите город"}</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Адрес *</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="ул. Примерная, 12"
              required
              minLength={5}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>График работы</label>
            <input
              type="text"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              placeholder="Например: Пн-Сб 09:00-18:00"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Телефон *</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+7 ___ ___ __ __"
              required
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              required
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Пароль *</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Создайте пароль"
                required
                minLength={8}
                className={`${inputClass} pr-10`}
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
            <p className="mt-1 text-xs text-slate-500">Минимум 8 символов.</p>
          </div>

          <div>
            <label className={labelClass}>Повторите пароль *</label>
            <input
              type={showPassword ? "text" : "password"}
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="Повторите пароль"
              required
              minLength={8}
              className={inputClass}
            />
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
            {loading ? "Отправка..." : "Отправить заявку"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Уже есть аккаунт?{" "}
          <Link to="/login" className="font-medium text-emerald-400 hover:underline">
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
}
