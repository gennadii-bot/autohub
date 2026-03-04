import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Star, Clock } from "lucide-react";
import { getStoBySlug, getStoBookingServices, getStoSlots, getStoSchedule } from "../api/sto";
import type { BookingService, STO, ScheduleDay } from "../api/sto";
import { createBooking } from "../api/booking";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { Container } from "../components/layout/Container";
import { ImageGallery } from "../components/sto/ImageGallery";
import { DateCalendar } from "../components/booking/DateCalendar";
import { TimeSlotsGrid } from "../components/booking/TimeSlotsGrid";

export function BookPage() {
  const { stoSlug } = useParams<{ stoSlug: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { isAuthenticated } = useAuth();

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
    email: "",
  });

  useEffect(() => {
    if (!stoSlug) return;
    getStoBySlug(stoSlug)
      .then(async (stoData) => {
        if (!stoData) {
          setSto(null);
          setSchedule([]);
          setBookingServices([]);
          return;
        }
        setSto(stoData);
        const [services, sched] = await Promise.all([
          getStoBookingServices(stoData.id),
          getStoSchedule(stoData.id),
        ]).catch(() => [[], []]);
        setBookingServices(Array.isArray(services) ? services : []);
        setSchedule(Array.isArray(sched) ? sched : []);
      })
      .catch(() => setError("СТО не найдена"))
      .finally(() => setLoading(false));
  }, [stoSlug]);

  useEffect(() => {
    if (!sto || !serviceId || !date) {
      setSlots([]);
      setTime(null);
      return;
    }
    setSlotsLoading(true);
    getStoSlots(sto.id, date, Number(serviceId))
      .then(setSlots)
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [sto, serviceId, date]);

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
    if (!sto || !serviceId || !date || !time) return;

    const needsGuest = !isAuthenticated;
    if (needsGuest && (!formData.name.trim() || !formData.phone.trim())) {
      addToast("Укажите имя и телефон", "error");
      return;
    }

    setSubmitting(true);
    try {
      const payload: Parameters<typeof createBooking>[0] = {
        sto_id: sto.id,
        service_id: Number(serviceId),
        date,
        time,
      };
      if (needsGuest) {
        payload.guest_name = formData.name.trim();
        payload.guest_phone = formData.phone.trim();
        payload.guest_email = formData.email.trim() || undefined;
      }
      await createBooking(payload);
      addToast("Заявка отправлена СТО", "success");
      navigate(isAuthenticated ? "/dashboard" : "/success");
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
            to="/"
            className="mt-4 inline-block rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-white hover:bg-white/10"
          >
            На главную
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

  return (
    <div className="min-h-screen bg-[#0B0F1A]">
      <Container className="py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Link
            to="/"
            className="text-sm text-white/70 hover:text-emerald-400"
          >
            ← На главную
          </Link>

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

          <div className="mt-6 space-y-6">
            <div className="rounded-2xl border border-white/5 bg-white/[0.04] p-6 backdrop-blur-xl">
              <h2 className="text-lg font-semibold text-white">Записаться</h2>
              <p className="mt-1 text-sm text-white/60">
                Выберите услугу, дату и время
              </p>

              {!showForm ? (
                <div className="mt-6 space-y-6">
                  <div>
                    <p className="mb-3 text-sm font-medium text-white/80">
                      Услуга
                    </p>
                    {bookingServices.length === 0 ? (
                      <p className="text-white/60">Нет доступных услуг</p>
                    ) : (
                      <div className="space-y-3">
                        {bookingServices.map((s) => {
                          const isSelected = serviceId === String(s.id);
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => setServiceId(String(s.id))}
                              className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition-all ${
                                isSelected
                                  ? "border-emerald-500/50 bg-gradient-to-r from-emerald-500/20 to-violet-500/20"
                                  : "border-white/10 bg-white/5 hover:border-white/20"
                              }`}
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
                                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                                  isSelected
                                    ? "bg-emerald-500/30 text-emerald-300"
                                    : "bg-white/10 text-white/80"
                                }`}
                              >
                                {isSelected ? "Выбрано" : "Выбрать"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="mb-3 text-sm font-medium text-white/80">
                      Дата
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
                        Время
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
                  {!isAuthenticated && (
                    <>
                      <div>
                        <label className="mb-1 block text-sm text-white/70">
                          Имя *
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData((p) => ({ ...p, name: e.target.value }))
                          }
                          required
                          className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                          placeholder="Ваше имя"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-white/70">
                          Телефон *
                        </label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) =>
                            setFormData((p) => ({ ...p, phone: e.target.value }))
                          }
                          required
                          className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                          placeholder="+7 (___) ___-__-__"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-white/70">
                          Email
                        </label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData((p) => ({ ...p, email: e.target.value }))
                          }
                          className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                          placeholder="email@example.com"
                        />
                      </div>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                  >
                    ← Назад
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="ml-2 rounded-xl bg-gradient-to-r from-emerald-500 to-violet-500 px-6 py-2 font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:opacity-90 disabled:opacity-50"
                  >
                    {submitting ? "Отправка..." : "Отправить заявку"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </motion.div>
      </Container>
    </div>
  );
}
