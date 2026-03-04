# Синхронизация моделей SQLAlchemy и таблиц PostgreSQL

Модели приведены к существующим таблицам БД. Таблицы в БД **не переименовываются**.

## Соответствие модель → таблица

| Модель (класс)   | __tablename__   | Таблица в БД   |
|------------------|-----------------|----------------|
| User             | users           | users          |
| STO              | **stos**        | stos           |
| City             | cities          | cities         |
| Region           | regions         | regions        |
| Booking          | bookings        | bookings       |
| Review           | reviews         | reviews        |
| ServiceCatalog   | service_catalog | service_catalog |
| StoService       | sto_services    | sto_services   |
| StoSchedule      | sto_schedules   | sto_schedules  |
| STORequest       | sto_requests    | sto_requests   |
| ActivationToken | activation_tokens | activation_tokens |
| Service          | services        | services       |

Таблицы в БД, для которых в коде нет отдельной модели (используются репозиториями/сырым SQL при необходимости):  
`notifications`, `sto_working_hours`.

## Проверка admin/stats

- `users_count`: `UserRepository.count()` → `select(func.count()).select_from(User)` → таблица **users**.
- `stos_count`: `STORepository.count_all()` → `select(func.count()).select_from(STO)` → таблица **stos**.

Модель `STO` с `__tablename__ = "stos"` указывает на таблицу `stos`.  
Если `stos_count` всё ещё 0, проверьте: `DATABASE_URL` (база **autohub**), логи при старте, ответ `GET /debug-users`.
