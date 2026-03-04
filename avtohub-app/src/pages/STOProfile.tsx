import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Star, MapPin, Clock, Phone } from "lucide-react";
import { getSto, getStoBookingServices, getStoSlots, getStoSchedule } from "../api/sto";
import type { BookingService, STO, ScheduleDay } from "../api/sto";
import { createBooking } from "../api/booking";
import { useToast } from "../context/ToastContext";
import { Container } from "../components/layout/Container";
import { ImageGallery } from "../components/sto/ImageGallery";
import { DateCalendar } from "../components/booking/DateCalendar";
import { TimeSlotsGrid } from "../components/booking/TimeSlotsGrid";
import { ReviewsList } from "../components/reviews/ReviewsList";

const DAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function formatSchedule(schedule: ScheduleDay[]): string {
  const parts: string[] = [];
  for (const s of schedule) {
    if (!s.is_working) continue;
    parts.push(
      `${DAY_LABELS[s.day_of_week]} ${s.start_time}-${s.end_time}`
    );
  }
  return parts.length > 0 ? parts.join(", ") : "Пн-Пт 09:00-18:00";
}

export function STOProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [sto, setSto] = useState<STO | null>(null);
  const [schedule, setSchedule] = useState<ScheduleDay[]>([]);
  const [bookingServices, setBookingServices] = useState<BookingService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [serviceId, setServiceId] = useState<string>("");
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [slots, setSlots] = useState<{ time: string; available: boolean }[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    carBrand: "",
    carModel: "",
    carYear: "",
    comment: "",
  });

  useEffect(() => {
    if (!id) return;
    const numId = Number(id);
    Promise.all([
      getSto(numId),
      getStoBookingServices(numId),
      getStoSchedule(numId),
    ])
      .then(([stoData, services, sched]) => {
        setSto(stoData ?? null);
        setBookingServices(services ?? []);
        setSchedule(sched ?? []);
      })
      .catch(() => setError("СТО не найдена"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id || !serviceId || !date) {
      setSlots([]);
      setTime(null);
      return;
    }
    setSlotsLoading(true);
    getStoSlots(Number(id), date, Number(serviceId))
      .then(setSlots)
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [id, serviceId, date]);

  useEffect(() => {
    if (time && slots.length > 0) {
      const isAvailable = slots.some((s) => s.time === time && s.available);
      if (!isAvailable) setTime(null);
    }
  }, [date, slots, time]);

  const canContinue = serviceId && date && time;
  const handleContinue = () => {
    if (!canContinue) return;
    setShowForm(true);
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !serviceId || !date || !time) return;
    setSubmitting(true);
    try {
      await createBooking({
        sto_id: Number(id),
        service_id: Number(serviceId),
        date,
        time,
      });
      addToast("Заявка отправлена СТО", "success");
      navigate("/dashboard");
    } catch (err: unknown) {
      const res =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { status?: number; data?: { detail?: string } } }).response
          : null;
      if (res?.status === 409) {
        addToast("Это время уже занято", "error");
      } else {
        addToast(res?.data?.detail ?? "Ошибка при создании записи", "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-12">
        <div className="h-80 animate-pulse rounded-2xl bg-white/10" />
        <div className="mt-6 h-8 w-1/2 animate-pulse rounded bg-white/10" />
      </Container>
    );
  }

  if (error || !sto) {
    return (
      <Container className="py-12">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <p className="text-red-400">{error || "СТО не найдена"}</p>
          <Link
            to="/sto"
            className="mt-4 inline-block rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-white hover:bg-white/10"
          >
            К списку
          </Link>
        </motion.div>
      </Container>
    );
  }

  const cityName = sto.city?.name ?? "";
  const stoWithUrls = sto as { image_urls?: string[] };
  const images = stoWithUrls.image_urls?.length
    ? stoWithUrls.image_urls
    : sto.image_url
      ? [sto.image_url]
      : [];
  const hoursDisplay = formatSchedule(schedule);

  return (
    <div className="min-h-screen bg-[#0B0F1A]">
      <Container className="py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Link
            to="/sto"
            className="text-sm text-white/70 hover:text-emerald-400"
          >
            ← К списку СТО
          </Link>

          {/* 1. Hero */}
          <div className="relative mt-6 overflow-hidden rounded-2xl">
            <ImageGallery images={images} alt={sto.name} />
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 pointer-events-none p-6">
              <h1 className="text-2xl font-semibold text-white sm:text-3xl">
                {sto.name}
              </h1>
              <div className="mt-2 flex items-center gap-2 text-white/90">
                <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                <span className="font-medium">{sto.rating.toFixed(1)}</span>
              </div>
              {cityName && (
                <p className="mt-1 text-sm text-white/70">{cityName}</p>
              )}
            </div>
          </div>

          {/* 2. Info */}
          <div className="mt-6 space-y-6">
            <div className="rounded-2xl border border-white/5 bg-white/[0.04] p-6 backdrop-blur-xl">
              <h2 className="text-lg font-semibold text-white">Информация</h2>
              <div className="mt-4 space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-white/60" />
                  <div>
                    <p className="text-sm text-white/60">Адрес</p>
                    <p className="text-white">
                      {sto.address}
                      {cityName && `, ${cityName}`}
                    </p>
                  </div>
                </div>
                {sto.description && (
                  <div>
                    <p className="text-sm text-white/60">Описание</p>
                    <p className="text-white/90">{sto.description}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-white/60">Часы работы</p>
                  <p className="text-white/90">{hoursDisplay}</p>
                </div>
                {(sto.phone || sto.whatsapp) && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 shrink-0 text-white/60" />
                    <div>
                      {sto.phone && <p className="text-white">{sto.phone}</p>}
                      {sto.whatsapp && (
                        <p className="text-white/80">WhatsApp: {sto.whatsapp}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Services */}
            <div className="rounded-2xl border border-white/5 bg-white/[0.04] p-6 backdrop-blur-xl">
              <h2 className="text-lg font-semibold text-white">Услуги</h2>
              <p className="mt-1 text-sm text-white/60">
                Выберите услугу для записи
              </p>
              {bookingServices.length === 0 ? (
                <p className="mt-4 text-white/60">Нет доступных услуг</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {bookingServices.map((s) => {
                    const isSelected = serviceId === String(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setServiceId(String(s.id))}
                        className={`
                          flex w-full items-center justify-between rounded-xl border p-4 text-left transition-all duration-200 hover:scale-[1.01]
                          ${isSelected
                            ? "border-emerald-500/50 bg-gradient-to-r from-emerald-500/20 to-violet-500/20"
                            : "border-white/10 bg-white/5 hover:border-white/20"
                          }
                        `}
                      >
                        <div>
                          <p className="font-medium text-white">{s.name}</p>
                          <p className="mt-1 flex items-center gap-2 text-sm text-white/60">
                            <span>{s.price} ₸</span>
                            <Clock className="h-3.5 w-3.5" />
                            {s.duration_minutes} мин
                          </p>
                        </div>
                        <span
                          className={`
                            rounded-lg px-3 py-1.5 text-sm font-medium
                            ${isSelected
                              ? "bg-emerald-500/30 text-emerald-300"
                              : "bg-white/10 text-white/80"
                            }
                          `}
                        >
                          {isSelected ? "Выбрано" : "Выбрать"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 4. Date & Time */}
            {bookingServices.length > 0 && (
              <div className="rounded-2xl border border-white/5 bg-white/[0.04] p-6 backdrop-blur-xl">
                <h2 className="text-lg font-semibold text-white">Записаться</h2>
                <p className="mt-1 text-sm text-white/60">
                  Выберите дату и время
                </p>

                {!showForm ? (
                  <div className="mt-6 space-y-6">
                    <div>
                      <p className="mb-3 text-sm font-medium text-white/80">
                        Выберите дату
                      </p>
                      <DateCalendar
                        value={date}
                        onChange={(d) => {
                          setDate(d);
                          setTime(null);
                        }}
                        closedDaysOfWeek={schedule
                          .filter((s) => !s.is_working)
                          .map((s) => s.day_of_week)}
                      />
                    </div>
                    {date && (
                      <div>
                        <p className="mb-3 text-sm font-medium text-white/80">
                          Выберите время
                        </p>
                        <TimeSlotsGrid
                          slots={slots}
                          value={time}
                          onChange={setTime}
                          loading={slotsLoading}
                        />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={handleContinue}
                      disabled={!canContinue}
                      className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-violet-500 py-3 font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Продолжить
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleBooking} className="mt-6 space-y-4">
                    <div>
                      <label className="mb-1 block text-sm text-white/70">
                        Имя
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, name: e.target.value }))
                        }
                        className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        placeholder="Ваше имя"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm text-white/70">
                        Телефон
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, phone: e.target.value }))
                        }
                        className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        placeholder="+7 (___) ___-__-__"
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm text-white/70">
                          Марка авто
                        </label>
                        <input
                          type="text"
                          value={formData.carBrand}
                          onChange={(e) =>
                            setFormData((p) => ({
                              ...p,
                              carBrand: e.target.value,
                            }))
                          }
                          className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                          placeholder="Toyota"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-white/70">
                          Модель
                        </label>
                        <input
                          type="text"
                          value={formData.carModel}
                          onChange={(e) =>
                            setFormData((p) => ({
                              ...p,
                              carModel: e.target.value,
                            }))
                          }
                          className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                          placeholder="Camry"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm text-white/70">
                        Год выпуска
                      </label>
                      <input
                        type="text"
                        value={formData.carYear}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, carYear: e.target.value }))
                        }
                        className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        placeholder="2020"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm text-white/70">
                        Комментарий
                      </label>
                      <textarea
                        value={formData.comment}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            comment: e.target.value,
                          }))
                        }
                        rows={3}
                        className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        placeholder="Дополнительная информация..."
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setShowForm(false)}
                        className="flex-1 rounded-xl border border-white/20 bg-white/5 py-3 font-medium text-white transition hover:bg-white/10"
                      >
                        Назад
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-violet-500 py-3 font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:opacity-90 disabled:opacity-50"
                      >
                        {submitting ? "Отправка..." : "Отправить заявку"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {id && <ReviewsList stoId={Number(id)} />}
          </div>
        </motion.div>
      </Container>
    </div>
  );
}
