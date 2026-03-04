# AUTOHUB — План реализации клиентского потока записи

## Текущее состояние

### Backend (уже есть)
- **Booking**: `client_id`, `sto_id`, `service_id`, `date`, `time`, `status`, `created_at`
- **BookingStatus**: `pending`, `accepted`, `cancelled`, `completed`
- **User**: `email`, `role`, `city_id` — нет `name`, `phone`
- **STO**: `status` (active/pending/blocked) — нет модели подписки
- **POST /booking** — создание (только client, требует auth)
- **GET /sto** — список СТО (city_id, фильтры)
- **GET /sto/{id}/slots** — свободные слоты
- **GET /sto/{id}/booking-services** — услуги для записи
- **GET /partner/bookings** — записи партнёра
- **PATCH /partner/bookings/{id}/status** — смена статуса
- **GET /admin/bookings** — все записи
- **GET /admin/analytics** — аналитика

### Client Frontend (FRONTED/avtohub-app)
- Home, CitySelectPage, STOList, STOProfile, Booking, Success
- CityContext, AuthContext
- ProtectedRoute для /booking

---

## I. Минимальные изменения Backend (если нужны)

### 1. Расширение модели Booking (опционально)

**Проблема**: Сейчас клиент идентифицируется только по `client_id` → `User.email`. Партнёр видит только email. Нет: name, phone, car_brand, car_model, car_year, comment.

**Вариант A — без миграции** (работать с тем что есть):
- Использовать `User.email` как контакт
- Добавить в User: `first_name`, `last_name`, `phone` (миграция User)
- Car и comment — не хранить, или хранить в `User` как последние данные

**Вариант B — миграция Booking** (рекомендуется):
```python
# alembic migration: add columns to bookings (all nullable for backward compat)
client_name: str | None
client_phone: str | None
car_brand: str | None
car_model: str | None
car_year: int | None
comment: str | None
```

**Рекомендация**: Вариант B — один раз добавить колонки в Booking. Существующие записи останутся с NULL.

### 2. Маппинг статусов

| Спецификация | Backend | Действие |
|--------------|---------|----------|
| confirmed    | accepted | Использовать `accepted` везде |
| completed    | completed | OK |
| cancelled    | cancelled | OK |
| pending      | pending | OK |

**Итог**: Не менять. Backend уже использует `accepted`. На фронте отображать "Подтверждено" для accepted.

### 3. Подписка СТО

**Спецификация**: "Только СТО с активной подпиской"

**Текущее**: Нет модели подписки. STO.status = active означает "может принимать записи".

**Рекомендация**: Считать `STO.status == active` эквивалентом "активная подписка". Не вводить подписку без изменения БД.

---

## II. Новые эндпоинты (если нужны)

### Уже есть, менять не нужно
| Эндпоинт | Назначение |
|----------|------------|
| GET /cities | Список городов |
| GET /sto?city_id= | Список СТО по городу |
| GET /sto/{id} | Детали СТО |
| GET /sto/{id}/booking-services | Услуги для записи |
| GET /sto/{id}/slots?date=&service_id= | Свободные слоты |
| POST /booking | Создать запись |
| GET /booking/my | Мои записи |
| PATCH /partner/bookings/{id}/status | Смена статуса (partner) |
| GET /admin/bookings | Все записи (admin) |

### Рекомендуемые добавления (минимальные)

1. **Расширить POST /booking** — принять опциональные поля:
   ```json
   {
     "sto_id": 1,
     "service_id": 2,
     "date": "2025-03-10",
     "time": "10:00",
     "client_name": "Иван",
     "client_phone": "+77001234567",
     "car_brand": "Toyota",
     "car_model": "Camry",
     "car_year": 2020,
     "comment": "Срочно"
   }
   ```
   (Только если добавлены колонки в Booking.)

2. **Публичный GET /sto** — уже есть, фильтр по city_id. Проверить что возвращаются только `status=active`.

3. **GET /sto/{id}/reviews** — отзывы и рейтинг. Проверить наличие.

---

## III. Схема потоков данных

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        КЛИЕНТСКИЙ ПОТОК (avtohub-kz)                        │
└─────────────────────────────────────────────────────────────────────────────┘

  [Главная]                    [Выбор города]
      │                              │
      │  GET /cities                 │  setCity(city_id) → localStorage
      │  ← cities[]                  │
      │                              ▼
      │                    [Кнопка "Найти СТО"]
      │                              │
      │                              ▼
      │                    [Список СТО] GET /sto?city_id=X
      │                              │  ← только status=active
      │                              │
      │                              ▼
      │                    [Карточка СТО] → клик
      │                              │
      │                              ▼
      │                    [Страница СТО] GET /sto/{id}
      │                              │  GET /sto/{id}/booking-services
      │                              │  GET /sto/{id}/reviews (рейтинг)
      │                              │
      │                              ▼
      │                    [Кнопка "Записаться"]
      │                              │
      │                    ┌─────────┴─────────┐
      │                    │  Auth?           │
      │                    │  Нет → /login     │
      │                    │  Да  → /booking   │
      │                    └─────────┬─────────┘
      │                              │
      │                              ▼
      │                    [Процесс записи]
      │                    1. Выбор услуги (из booking-services)
      │                    2. Выбор даты
      │                    3. GET /sto/{id}/slots?date=&service_id=
      │                    4. Выбор времени
      │                    5. Ввод: name, phone, car_brand, car_model, car_year, comment
      │                    6. POST /booking
      │                              │
      │                              ▼
      │                    [Success] status=pending
      │
      ▼
  [Мои записи] GET /booking/my
```

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     СИНХРОНИЗАЦИЯ С PARTNER PANEL                           │
└─────────────────────────────────────────────────────────────────────────────┘

  Клиент POST /booking
        │
        ▼
  Booking создан (status=pending)
        │
        ├──────────────────────────────────────────► GET /partner/bookings
        │                                            Partner видит:
        │                                            - client_email (или client_name)
        │                                            - client_phone (если есть)
        │                                            - car (если есть)
        │                                            - service_name, date, time, status
        │
        │  Partner: PATCH /partner/bookings/{id}/status { "status": "accepted" }
        │                    │
        │                    ▼
        │            Booking.status = accepted
        │                    │
        │  Partner: PATCH .../status { "status": "completed" }
        │                    │
        │                    ▼
        │            Booking.status = completed
        │                    │
        │                    ├──► Выручка учитывается в аналитике
        │                    └──► Клиент может оставить отзыв (POST /reviews)
        │
        │  Partner: PATCH .../status { "status": "cancelled" }
        │                    │
        │                    ▼
        │            Booking.status = cancelled (не в выручке)
```

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     СИНХРОНИЗАЦИЯ С ADMIN PANEL                             │
└─────────────────────────────────────────────────────────────────────────────┘

  Любой booking
        │
        ▼
  GET /admin/bookings
  Фильтры: city_id, sto_id, status, date_from, date_to
        │
        ▼
  Admin видит все записи
        │
        ▼
  GET /admin/analytics
  - bookings_total, bookings_completed
  - revenue_total (только completed)
  - by_city, grouped_data
  - KPI с delta
```

---

## IV. Проверки безопасности

### При создании записи (POST /booking)

| Проверка | Где | Реализация |
|----------|-----|------------|
| JWT, role=client | deps.require_client | Уже есть |
| STO активен | BookingService.create_booking | `sto.status == STOStatus.active` |
| Услуга подключена | BookingService | `sto_svc = get_by_sto_and_service()` |
| Слот свободен | BookingService | `count_parallel_at_slot < max_parallel_bookings` |
| Расписание СТО | BookingService | schedule_repo, day_of_week, is_working |
| Дата не в прошлом | BookingCreate validator | `date >= today` |
| Время не в прошлом | — | Добавить: если date==today, time > now |
| Защита от двойной записи | BookingService | find_by_slot, IntegrityError → return existing |

### При смене статуса (Partner)

| Проверка | Где | Реализация |
|----------|-----|------------|
| JWT, role=sto_owner | get_current_user_sto_owner | Уже есть |
| Booking принадлежит STO владельца | PartnerService | sto_id in owner's sto_ids |
| Валидный переход | BookingService | VALID_TRANSITIONS |

### Временная зона

- Backend: `datetime.now(timezone.utc)` для created_at
- Проверка "время не в прошлом": на клиенте использовать Asia/Almaty, на бэке — UTC или передавать timezone в запросе

---

## V. Чек-лист реализации

### Backend (минимальные изменения)

- [ ] **Опционально**: Миграция — добавить в `bookings`: client_name, client_phone, car_brand, car_model, car_year, comment (nullable)
- [ ] **Опционально**: Расширить BookingCreate schema и create_booking
- [ ] Добавить проверку: если date==today, то time > now (в BookingCreate или в сервисе)
- [ ] Убедиться GET /sto возвращает только status=active
- [ ] Убедиться GET /sto/{id}/booking-services только is_active услуги
- [ ] Partner: расширить OwnerBookingResponse — client_name, client_phone, car_* (если добавлены)
- [ ] Admin: расширить ответ bookings — client_name, client_phone, car_* (если добавлены)

### Client Frontend (avtohub-kz / FRONTED/avtohub-app)

- [ ] Главная: выбор города, сохранение в CityContext/localStorage
- [ ] Кнопка "Найти СТО" → /sto?city_id=
- [ ] Список СТО: только активные, рейтинг, кол-во отзывов
- [ ] Страница СТО: инфо, услуги (цена, длительность), кнопка записи
- [ ] Процесс записи: шаги 1–6, форма с полями name, phone, car_*, comment
- [ ] POST /booking с корректными данными
- [ ] Страница успеха
- [ ] Мои записи: GET /booking/my

### Partner Panel

- [ ] Уже есть: GET /partner/bookings, PATCH status
- [ ] Отображать client_name/phone, car, service, date, status
- [ ] Кнопки: Подтвердить (accepted), Завершить (completed), Отменить (cancelled)

### Admin Panel

- [ ] Уже есть: GET /admin/bookings с фильтрами
- [ ] Уже есть: GET /admin/analytics
- [ ] Проверить фильтры: city, sto, status, period

### Рейтинг

- [ ] POST /reviews — после completed
- [ ] Средний рейтинг в карточке СТО, у партнёра, в админке (уже считается)

---

## VI. Статусы (единая логика)

```
pending ──► accepted ──► completed
   │            │
   └────────────┴──────► cancelled
```

- **completed** → выручка, рейтинг, аналитика
- **cancelled** → не в выручке
- **accepted** = "confirmed" в UI

---

## VII. Итог

| Компонент | Действие |
|-----------|----------|
| БД | Опционально: 6 nullable колонок в bookings |
| Backend | Минимально: проверка time не в прошлом; опционально: client/car поля |
| Client | Реализовать полный поток: город → СТО → запись |
| Partner | Уже готово, проверить отображение |
| Admin | Уже готово, проверить фильтры |
| Аналитика | Уже учитывает bookings, revenue, by_city |
| Рейтинг | Уже есть, привязан к completed |

**Система уже в основном синхронизирована.** Основная работа — клиентский фронт и опционально расширение Booking для name/phone/car.
