# AvtoHub KZ — MVP Implementation Plan

## Этап 1 — Список СТО ✅
- [x] GET /sto?city_id= (обязательный для списка)
- [x] Пагинация
- [x] Фильтры: search, rating_min, service_id
- [x] Сортировка: rating, name
- [x] Редирект на /city если город не выбран
- [x] Карточки: фото, название, адрес, рейтинг, описание, кнопка "Записаться"

## Этап 2 — Страница СТО ✅
- [x] GET /sto/{id}
- [x] GET /sto/{id}/services
- [x] GET /sto/{id}/slots?date=&service_id=
- [x] Блок записи: выбор услуги, дата, время (слоты)
- [x] POST /booking

## Этап 3 — Система записей ✅
- [x] Booking: user_id, sto_id, service_id, date, time, status
- [x] GET /booking/my (с sto_name, service_name)
- [x] PATCH /booking/{id}/cancel

## Этап 4 — Личный кабинет ✅
- [x] Активные / Завершённые / Отменённые
- [x] Карточка: СТО, услуга, дата, статус
- [x] Кнопка отмены (pending)

## Этап 5 — UX ✅
- [x] Loading skeleton
- [x] Обработка ошибок
- [x] Redirect если не авторизован
- [x] city_id в localStorage
- [x] Framer-motion анимации
- [x] Mobile-first
