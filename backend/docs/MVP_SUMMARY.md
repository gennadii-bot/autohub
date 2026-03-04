# AvtoHub KZ — MVP Summary

## Реализовано

### Этап 1 — Список СТО
- **GET /sto** — фильтры: `city_id` (обязателен для списка), `search`, `rating_min`, `service_id`, `sort` (name|rating), пагинация
- **STOList** — редирект на /city если город не выбран, поиск, фильтры, сортировка, пагинация
- **STOCard** — фото, название, адрес, рейтинг, описание, кнопка "Записаться"
- **STO model** — добавлено поле `image_url`

### Этап 2 — Страница СТО
- **GET /sto/{id}** — СТО с услугами
- **GET /sto/{id}/services** — список услуг
- **GET /sto/{id}/slots?date=&service_id=** — доступные слоты (9:00–18:00, 30 мин)
- **STOProfile** — блок записи: выбор услуги, даты, времени (слоты)
- **POST /booking** — создание записи

### Этап 3 — Система записей
- **Booking** — user_id, sto_id, service_id, date, time, status (pending/accepted/cancelled/completed)
- **GET /booking/my** — записи пользователя с sto_name, service_name
- **PATCH /booking/{id}/cancel** — отмена

### Этап 4 — Личный кабинет
- **Dashboard** — активные, завершённые, отменённые
- Карточка: СТО, услуга, дата, статус
- Кнопка отмены для pending

### Этап 5 — UX
- Loading skeleton
- Toast уведомления (ToastContext)
- Redirect при 401
- city_id в localStorage
- Framer-motion анимации
- Mobile-first

## Структура

### Backend
```
app/
├── api/routers/
│   ├── sto.py      # GET /sto, /sto/{id}, /sto/{id}/services, /sto/{id}/slots
│   └── booking.py  # POST, GET /my, PATCH /{id}/cancel
├── models/         # STO (+ image_url), Booking, Service
├── repositories/   # STORepository (filters, sort), BookingRepository (slots)
├── services/       # STOService (get_available_slots), BookingService
└── schemas/        # BookingDetailResponse (sto_name, service_name)
```

### Frontend
```
src/
├── api/
│   ├── sto.ts      # getStos, getSto, getStoServices, getStoSlots
│   └── booking.ts  # createBooking, getMyBookings, cancelBooking
├── context/
│   └── ToastContext.tsx
├── pages/
│   ├── STOList.tsx    # redirect, filters, pagination
│   ├── STOProfile.tsx # booking block
│   ├── Dashboard.tsx  # grouped bookings
│   └── Booking.tsx    # redirect to /sto/:id
└── components/
    └── sto/STOCard.tsx
```

## Миграция
```bash
alembic upgrade head  # добавляет image_url в stos
```

## Запуск
```bash
# Backend
uvicorn app.main:app --reload

# Frontend
cd FRONTED/avtohub-app && npm run dev
```
