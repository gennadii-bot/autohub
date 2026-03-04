import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { getRegions, getCitiesByRegion, type Region, type City } from "../api/regions";
import { submitStoRequest } from "../api/stoRequest";
import { useToast } from "../context/ToastContext";
import { CustomSelect, type CustomSelectOption } from "../components/CustomSelect";

const CLIENT_URL = import.meta.env.VITE_CLIENT_URL || "https://autohub.kz";

interface FormState {
  first_name: string;
  last_name: string;
  middle_name: string;
  iin: string;
  phone: string;
  email: string;
  ip_name: string;
  bin: string;
  sto_name: string;
  sto_description: string;
  region_id: string;
  city_id: string;
  address: string;
}

const initialForm: FormState = {
  first_name: "",
  last_name: "",
  middle_name: "",
  iin: "",
  phone: "",
  email: "",
  ip_name: "",
  bin: "",
  sto_name: "",
  sto_description: "",
  region_id: "",
  city_id: "",
  address: "",
};

export function BecomePartner() {
  const { addToast } = useToast();
  const [form, setForm] = useState<FormState>(initialForm);
  const [regions, setRegions] = useState<Region[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);

  useEffect(() => {
    getRegions().then(setRegions).catch(() => addToast("Не удалось загрузить регионы", "error"));
  }, [addToast]);

  const loadCities = useCallback(
    (regionId: number) => {
      setCitiesLoading(true);
      setCities([]);
      setForm((f) => ({ ...f, city_id: "" }));
      getCitiesByRegion(regionId)
        .then(setCities)
        .catch(() => addToast("Не удалось загрузить города", "error"))
        .finally(() => setCitiesLoading(false));
    },
    [addToast]
  );

  useEffect(() => {
    if (form.region_id) {
      loadCities(Number(form.region_id));
    } else {
      setCities([]);
    }
  }, [form.region_id, loadCities]);

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const regionOptions: CustomSelectOption[] = regions.map((r) => ({
    value: String(r.id),
    label: r.name,
  }));

  const cityOptions: CustomSelectOption[] = cities.map((c) => ({
    value: String(c.id),
    label: c.name,
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.first_name.trim() || !form.last_name.trim()) {
      addToast("Имя и фамилия обязательны", "error");
      return;
    }
    if (form.iin.replace(/\D/g, "").length !== 12) {
      addToast("ИИН должен содержать 12 цифр", "error");
      return;
    }
    if (!form.phone.trim()) {
      addToast("Телефон обязателен", "error");
      return;
    }
    if (!form.email.trim()) {
      addToast("Email обязателен", "error");
      return;
    }
    if (!form.sto_name.trim()) {
      addToast("Название СТО обязательно", "error");
      return;
    }
    if (!form.region_id || !form.city_id) {
      addToast("Выберите регион и город", "error");
      return;
    }
    if (form.address.trim().length < 5) {
      addToast("Адрес обязателен (минимум 5 символов)", "error");
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("first_name", form.first_name.trim());
      fd.append("last_name", form.last_name.trim());
      if (form.middle_name.trim()) fd.append("middle_name", form.middle_name.trim());
      fd.append("iin", form.iin.replace(/\D/g, ""));
      fd.append("phone", form.phone.trim());
      fd.append("email", form.email.trim().toLowerCase());
      if (form.ip_name.trim()) fd.append("ip_name", form.ip_name.trim());
      if (form.bin.replace(/\D/g, "")) fd.append("bin", form.bin.replace(/\D/g, ""));
      fd.append("sto_name", form.sto_name.trim());
      if (form.sto_description.trim()) fd.append("sto_description", form.sto_description.trim());
      fd.append("region_id", form.region_id);
      fd.append("city_id", form.city_id);
      fd.append("address", form.address.trim());
      if (photo) fd.append("photo", photo);

      await submitStoRequest(fd);
      setSubmitted(true);
    } catch (err: unknown) {
      const res = err && typeof err === "object" && "response" in err
        ? (err as { response?: { data?: { error?: { message?: string } } } }).response
        : null;
      const msg = res?.data?.error?.message;
      addToast(msg ?? "Ошибка отправки заявки", "error");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="aurora-bg min-h-screen">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card mx-auto max-w-md p-8 text-center"
          >
            <h1 className="text-2xl font-semibold text-white">Заявка отправлена</h1>
            <p className="mt-4 text-white/70">
              Ваша заявка принята на рассмотрение. Мы свяжемся с вами после проверки.
            </p>
            <a
              href={CLIENT_URL}
              className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-violet-500 px-6 py-3 font-medium text-white transition-opacity hover:opacity-90"
            >
              Перейти на AvtoHub
              <ExternalLink className="h-4 w-4" />
            </a>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="aurora-bg min-h-screen">
      <header className="border-b border-white/10 bg-black/30 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <span className="text-xl font-semibold text-white">AvtoHub KZ</span>
          <a
            href={CLIENT_URL}
            className="flex items-center gap-2 text-sm font-medium text-white/80 transition-colors hover:text-emerald-400"
          >
            На главную
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-semibold text-white sm:text-3xl">
            Стать партнёром AvtoHub
          </h1>
          <p className="mt-2 text-white/70">
            Заполните заявку. После проверки вы получите доступ к панели управления СТО.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="grid gap-5 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-white/80">Имя *</label>
                <input
                  type="text"
                  value={form.first_name}
                  onChange={(e) => handleChange("first_name", e.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/40 outline-none transition focus:border-emerald-500/70"
                  placeholder="Иван"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-white/80">Фамилия *</label>
                <input
                  type="text"
                  value={form.last_name}
                  onChange={(e) => handleChange("last_name", e.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/40 outline-none transition focus:border-emerald-500/70"
                  placeholder="Иванов"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-white/80">Отчество</label>
                <input
                  type="text"
                  value={form.middle_name}
                  onChange={(e) => handleChange("middle_name", e.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/40 outline-none transition focus:border-emerald-500/70"
                  placeholder="Иванович"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-white/80">ИИН * (12 цифр)</label>
              <input
                type="text"
                value={form.iin}
                onChange={(e) => handleChange("iin", e.target.value.replace(/\D/g, "").slice(0, 12))}
                className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/40 outline-none transition focus:border-emerald-500/70"
                placeholder="123456789012"
                maxLength={12}
                required
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-white/80">Телефон *</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/40 outline-none transition focus:border-emerald-500/70"
                  placeholder="+7 777 123 45 67"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-white/80">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/40 outline-none transition focus:border-emerald-500/70"
                  placeholder="email@example.com"
                  required
                />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-white/80">ИП / Юр. лицо</label>
                <input
                  type="text"
                  value={form.ip_name}
                  onChange={(e) => handleChange("ip_name", e.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/40 outline-none transition focus:border-emerald-500/70"
                  placeholder="ИП Иванов"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-white/80">БИН</label>
                <input
                  type="text"
                  value={form.bin}
                  onChange={(e) => handleChange("bin", e.target.value.replace(/\D/g, "").slice(0, 12))}
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/40 outline-none transition focus:border-emerald-500/70"
                  placeholder="12 цифр"
                  maxLength={12}
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-white/80">Название СТО *</label>
              <input
                type="text"
                value={form.sto_name}
                onChange={(e) => handleChange("sto_name", e.target.value)}
                className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/40 outline-none transition focus:border-emerald-500/70"
                placeholder="СТО АвтоМастер"
                required
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <CustomSelect
                label="Регион *"
                options={regionOptions}
                value={form.region_id}
                onChange={(v) => handleChange("region_id", v)}
                placeholder="Выберите регион"
              />
              <CustomSelect
                label="Город *"
                options={cityOptions}
                value={form.city_id}
                onChange={(v) => handleChange("city_id", v)}
                placeholder={citiesLoading ? "Загрузка..." : "Выберите город"}
                disabled={citiesLoading || !form.region_id}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-white/80">Адрес *</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => handleChange("address", e.target.value)}
                className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/40 outline-none transition focus:border-emerald-500/70"
                placeholder="ул. Примерная, 12"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-white/80">Описание СТО</label>
              <textarea
                value={form.sto_description}
                onChange={(e) => handleChange("sto_description", e.target.value)}
                rows={4}
                className="w-full resize-none rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/40 outline-none transition focus:border-emerald-500/70"
                placeholder="Услуги, специализация, преимущества..."
                maxLength={2000}
              />
              <p className="mt-1 text-xs text-white/50">{form.sto_description.length} / 2000</p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-white/80">Фото СТО (JPG, PNG)</label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-500/20 file:px-4 file:py-2 file:text-sm file:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-violet-500 py-3.5 font-medium text-white shadow-lg shadow-emerald-500/20 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Отправка..." : "Отправить заявку"}
            </button>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
