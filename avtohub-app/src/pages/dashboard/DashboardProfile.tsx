import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { User, Mail, Phone, Calendar, Car, KeyRound, LogOut, Pencil, X, MapPin, Camera } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { updateProfile, uploadAvatar } from "../../api/auth";
import { useToast } from "../../context/ToastContext";
import { getStoImageUrl } from "../../utils/media";
import { getCities } from "../../api/cities";

function formatDate(s: string | null | undefined) {
  if (!s) return null;
  const d = new Date(s.includes("T") ? s : s + "T12:00:00");
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("ru-KZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function displayName(user: { first_name?: string | null; last_name?: string | null; email?: string } | null) {
  if (!user) return "";
  if (user.first_name || user.last_name) {
    return [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  }
  const name = (user.email ?? "").split("@")[0];
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : "";
}

export function DashboardProfile() {
  const { user, logout, getCurrentUser } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cities, setCities] = useState<{ id: number; name: string }[]>([]);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    birth_date: "",
    car_brand: "",
    car_model: "",
    car_year: "",
    city_id: "",
  });

  useEffect(() => {
    getCurrentUser().catch(() => {
      addToast("Не удалось загрузить профиль. Проверьте подключение.", "error");
    });
  }, [getCurrentUser, addToast]);

  useEffect(() => {
    getCities().then(setCities).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    const bd = user.birth_date;
    const birthDate =
      typeof bd === "string" && bd
        ? (bd.includes("T") ? bd : bd + "T12:00:00").slice(0, 10)
        : "";
    setForm({
      first_name: user.first_name ?? "",
      last_name: user.last_name ?? "",
      phone: user.phone ?? "",
      birth_date: birthDate,
      car_brand: user.car_brand ?? "",
      car_model: user.car_model ?? "",
      car_year: user.car_year ? String(user.car_year) : "",
      city_id: user.city_id ? String(user.city_id) : "",
    });
  }, [user]);

  const updateForm = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload: Record<string, string | number | undefined | null> = {};
      if (form.first_name.trim()) payload.first_name = form.first_name.trim();
      if (form.last_name.trim()) payload.last_name = form.last_name.trim();
      if (form.phone !== undefined) payload.phone = form.phone.trim() || undefined;
      if (form.birth_date) payload.birth_date = form.birth_date;
      else if (form.birth_date === "" && user?.birth_date) payload.birth_date = null;
      if (form.car_brand.trim()) payload.car_brand = form.car_brand.trim();
      if (form.car_model.trim()) payload.car_model = form.car_model.trim();
      const year = parseInt(form.car_year, 10);
      if (!isNaN(year) && year >= 1980 && year <= new Date().getFullYear()) {
        payload.car_year = year;
      }
      const cityId = form.city_id ? parseInt(form.city_id, 10) : null;
      if (cityId && !isNaN(cityId)) payload.city_id = cityId;
      else if (form.city_id === "" && user?.city_id) payload.city_id = null;

      await updateProfile(payload);
      await getCurrentUser();
      setEditing(false);
      addToast("Профиль обновлён", "success");
    } catch {
      addToast("Не удалось обновить профиль", "error");
    } finally {
      setLoading(false);
    }
  };

  const carDisplay =
    [user?.car_brand, user?.car_model, user?.car_year].filter(Boolean).join(" ") || "Не указано";
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarLoading(true);
    try {
      await uploadAvatar(file);
      await getCurrentUser();
      addToast("Фото загружено", "success");
    } catch {
      addToast("Не удалось загрузить фото", "error");
    } finally {
      setAvatarLoading(false);
      e.target.value = "";
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-400" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <h1 className="text-2xl font-semibold text-white sm:text-3xl">Профиль</h1>

      <div className="rounded-2xl border border-white/5 bg-white/[0.04] p-6 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/20 to-violet-500/20">
              {user.avatar_url ? (
                <img
                  src={getStoImageUrl(user.avatar_url)}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-10 w-10 text-white/80" />
              )}
            </div>
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={avatarLoading}
              />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarLoading}
                className="rounded-full bg-white/20 p-2 text-white hover:bg-white/30"
              >
                <Camera className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">
              {displayName(user) || user?.email?.split("@")[0] || "Клиент"}
            </h2>
            <p className="text-sm text-white/60">Клиент</p>
          </div>
        </div>

        {!editing ? (
          <dl className="mt-8 space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
              <Mail className="h-5 w-5 shrink-0 text-white/50" />
              <div>
                <dt className="text-xs text-white/50">Email</dt>
                <dd className="text-white">{user?.email || "Не указано"}</dd>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
              <User className="h-5 w-5 shrink-0 text-white/50" />
              <div>
                <dt className="text-xs text-white/50">Имя Фамилия</dt>
                <dd className="text-white">
                  {[user?.first_name, user?.last_name].filter(Boolean).join(" ") || "Не указано"}
                </dd>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
              <Phone className="h-5 w-5 shrink-0 text-white/50" />
              <div>
                <dt className="text-xs text-white/50">Телефон</dt>
                <dd className="text-white/70">{user?.phone || "Не указано"}</dd>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
              <Calendar className="h-5 w-5 shrink-0 text-white/50" />
              <div>
                <dt className="text-xs text-white/50">Дата рождения</dt>
                <dd className="text-white/70">{formatDate(user?.birth_date ?? undefined) || "Не указано"}</dd>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
              <Car className="h-5 w-5 shrink-0 text-white/50" />
              <div>
                <dt className="text-xs text-white/50">Автомобиль</dt>
                <dd className="text-white/70">{carDisplay}</dd>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
              <MapPin className="h-5 w-5 shrink-0 text-white/50" />
              <div>
                <dt className="text-xs text-white/50">Город</dt>
                <dd className="text-white/70">{user?.city_name || "Не указано"}</dd>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
              <Calendar className="h-5 w-5 shrink-0 text-white/50" />
              <div>
                <dt className="text-xs text-white/50">Дата регистрации</dt>
                <dd className="text-white/70">{formatDate(user?.created_at ?? undefined) || "Не указано"}</dd>
              </div>
            </div>
          </dl>
        ) : (
          <div className="mt-8 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs text-white/50">Имя</label>
                <input
                  type="text"
                  value={form.first_name}
                  onChange={(e) => updateForm("first_name", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs text-white/50">Фамилия</label>
                <input
                  type="text"
                  value={form.last_name}
                  onChange={(e) => updateForm("last_name", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-white/50">Телефон</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => updateForm("phone", e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50">Дата рождения</label>
              <input
                type="date"
                value={form.birth_date}
                onChange={(e) => updateForm("birth_date", e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50">Город</label>
              <select
                value={form.city_id}
                onChange={(e) => updateForm("city_id", e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-emerald-500"
              >
                <option value="">Не указано</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs text-white/50">Марка авто</label>
                <input
                  type="text"
                  value={form.car_brand}
                  onChange={(e) => updateForm("car_brand", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs text-white/50">Модель</label>
                <input
                  type="text"
                  value={form.car_model}
                  onChange={(e) => updateForm("car_model", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs text-white/50">Год</label>
                <input
                  type="number"
                  min={1980}
                  max={new Date().getFullYear()}
                  value={form.car_year}
                  onChange={(e) => updateForm("car_year", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          {editing ? (
            <>
              <button
                type="button"
                onClick={handleSave}
                disabled={loading}
                className="rounded-xl bg-gradient-to-r from-emerald-500/20 to-violet-500/20 px-5 py-2.5 font-medium text-white shadow-[0_0_20px_rgba(34,197,94,0.15)] transition-all duration-200 hover:from-emerald-500/30 hover:to-violet-500/30 disabled:opacity-50"
              >
                {loading ? "Сохранение..." : "Сохранить"}
              </button>
              <button
                type="button"
                onClick={() => {
                  const bd = user?.birth_date;
                  const birthDate =
                    typeof bd === "string" && bd
                      ? (bd.includes("T") ? bd : bd + "T12:00:00").slice(0, 10)
                      : "";
                  setForm({
                    first_name: user?.first_name ?? "",
                    last_name: user?.last_name ?? "",
                    phone: user?.phone ?? "",
                    birth_date: birthDate,
                    car_brand: user?.car_brand ?? "",
                    car_model: user?.car_model ?? "",
                    car_year: user?.car_year ? String(user.car_year) : "",
                    city_id: user?.city_id ? String(user.city_id) : "",
                  });
                  setEditing(false);
                }}
                disabled={loading}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 font-medium text-white/80 transition-all duration-200 hover:bg-white/10"
              >
                <X className="h-4 w-4" />
                Отмена
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                const bd = user?.birth_date;
                const birthDate =
                  typeof bd === "string" && bd
                    ? (bd.includes("T") ? bd : bd + "T12:00:00").slice(0, 10)
                    : "";
                setForm({
                  first_name: user?.first_name ?? "",
                  last_name: user?.last_name ?? "",
                  phone: user?.phone ?? "",
                  birth_date: birthDate,
                  car_brand: user?.car_brand ?? "",
                  car_model: user?.car_model ?? "",
                  car_year: user?.car_year ? String(user.car_year) : "",
                  city_id: user?.city_id ? String(user.city_id) : "",
                });
                setEditing(true);
              }}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500/20 to-violet-500/20 px-5 py-2.5 font-medium text-white shadow-[0_0_20px_rgba(34,197,94,0.15)] transition-all duration-200 hover:from-emerald-500/30 hover:to-violet-500/30"
            >
              <Pencil className="h-4 w-4" />
              Редактировать
            </button>
          )}
          <button
            type="button"
            disabled
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 font-medium text-white/80 transition-all duration-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            title="Скоро"
          >
            <KeyRound className="h-4 w-4" />
            Сменить пароль
          </button>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate("/");
            }}
            className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-2.5 font-medium text-red-300 transition-all duration-200 hover:bg-red-500/20"
          >
            <LogOut className="h-4 w-4" />
            Выйти
          </button>
        </div>
      </div>
    </motion.div>
  );
}
