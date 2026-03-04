# План восстановления AvtoHub Backend + Admin (без потери данных)

## Текущая цепочка миграций (head = add_catalog_desc)

```
6474a7f8eebb (initial)
  → 050b17e3cb89 (add_sto_image_url)
  → add_sto_status
  → add_catalog_sto_svc
  → add_duration_booking_catalog
  → add_reviews_schedule
  → add_activation
  → add_sto_requests
  → add_rejection_reason
  → add_catalog_desc  ← HEAD
```

Ревизии `add_partner_panel` в проекте **нет** — если она записана в БД, её нужно заменить на существующую.

---

## ШАГ 1 — Подключение к PostgreSQL

Используйте **password authentication**, не peer. В `.env` или при подключении:

- Либо: `psql "postgresql://user:YOUR_PASSWORD@localhost:5432/avtohub"`
- Либо настройте `pg_hba.conf`: для пользователя `user` с хоста `localhost` — `md5` или `scram-sha-256`, затем:  
  `psql -U user -h localhost -d avtohub`

Проверка:

```bash
psql -U user -h localhost -d avtohub -c "SELECT 1;"
```

---

## ШАГ 2 — Узнать текущую ревизию в БД

```sql
SELECT * FROM alembic_version;
```

- Если таблицы нет — переходите к шагу 3.
- Если видите ревизию `add_partner_panel` (или любую отсутствующую в папке `alembic/versions`) — её нужно будет исправить на шаге 4.

---

## ШАГ 3 — Создать таблицу alembic_version (если её нет)

Если миграции никогда не запускались или таблица удалена:

```sql
CREATE TABLE IF NOT EXISTS alembic_version (
    version_num VARCHAR(32) NOT NULL PRIMARY KEY
);
```

Дальше — шаг 4.

---

## ШАГ 4 — Привести alembic_version к корректной ревизии

**Вариант A: В БД уже есть все таблицы и колонки (включая `service_catalog.description`, `stos.image_url`)**

Поставить текущую ревизию = head (миграции не выполняем, только синхронизируем версию):

```bash
cd /home/gena/AUTOHUB/backend
source venv/bin/activate
alembic stamp head
```

В БД в `alembic_version` будет записана ревизия `add_catalog_desc`.

**Вариант B: В БД записана несуществующая ревизия (например add_partner_panel)**

Подключиться к БД и обновить версию на последнюю известную, от которой вы хотите догнать до head. Например, если по факту схема соответствует состоянию после `add_rejection_reason` (есть все таблицы и колонки до `description`):

```sql
-- Если нужно сбросить на существующую ревизию и потом догнать до head:
DELETE FROM alembic_version;
INSERT INTO alembic_version (version_num) VALUES ('add_rejection_reason');
```

Затем с хоста (не из psql):

```bash
cd /home/gena/AUTOHUB/backend
source venv/bin/activate
alembic upgrade head
```

Миграция `add_catalog_desc` добавит колонку `service_catalog.description` только если её ещё нет (идемпотентность уже внесена в код).

**Вариант C: Нужно догнать с любой текущей ревизии до head**

Если в `alembic_version` уже есть одна из ревизий цепочки (например `add_sto_requests` или `add_rejection_reason`), просто выполните:

```bash
cd /home/gena/AUTOHUB/backend
source venv/bin/activate
alembic upgrade head
```

- Миграция `050b17e3cb89` добавляет `stos.image_url` только если колонки ещё нет.
- Миграция `add_catalog_desc` добавляет `service_catalog.description` только если колонки ещё нет.

Данные не удаляются.

---

## ШАГ 5 — Убедиться, что revision = head

```bash
alembic current
alembic heads
```

Ожидание: `current` совпадает с одним из `heads` (например `add_catalog_desc`).

---

## ШАГ 6 — Проверка backend и админских эндпоинтов

1. Запуск API:

```bash
cd /home/gena/AUTOHUB/backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

2. Проверка в браузере или curl (подставьте свой JWT для авторизованных запросов):

- **GET /admin/stats**  
  `curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/admin/stats`  
  С заголовком:  
  `curl -s -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/admin/stats`

- **GET /admin/services**  
  `curl -s -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/admin/services`

- **GET /admin/reviews**  
  `curl -s -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/admin/reviews`

Ожидание: 200 и JSON (или пустой массив), не 500 и не пустое тело из-за отсутствующих колонок.

3. CORS: с фронта (http://localhost:5174) в DevTools → Network у ответов от API должны быть заголовки `Access-Control-Allow-Origin: http://localhost:5174` и при необходимости `Access-Control-Allow-Credentials: true`. В `app/main.py` уже настроен CORSMiddleware с origins для 5173, 5174, 5175.

---

## ШАГ 7 — React Admin: таблицы и кнопки

1. Убедиться, что фронт ходит на правильный backend: в `avtohub-admin/.env` должно быть что-то вроде `VITE_API_URL=http://localhost:8000`.
2. Токен и заголовок: после логина токен сохраняется в `localStorage` под ключом `access_token`, axios в `src/api/axios.ts` подставляет `Authorization: Bearer <token>` — повторно залогиниться и проверить в Network, что заголовок уходит.
3. Если таблицы пустые при 200 OK — это уже данные (нет записей в БД). Если 401/403 — править авторизацию/роли; если 500 — смотреть логи uvicorn и убедиться, что в БД есть все колонки (в т.ч. `service_catalog.description`, `stos.image_url`).

---

## Краткий чеклист

| Шаг | Действие |
|-----|----------|
| 1 | Подключиться к PostgreSQL (md5/scram, не peer). |
| 2 | Проверить `SELECT * FROM alembic_version;` |
| 3 | При необходимости создать `alembic_version`. |
| 4 | Исправить несуществующую ревизию (например add_partner_panel) или поставить `stamp head` / выполнить `upgrade head`. |
| 5 | `alembic current` и `alembic heads` — current = head. |
| 6 | Запустить uvicorn, проверить GET /admin/stats, /admin/services, /admin/reviews и CORS. |
| 7 | Проверить React Admin: .env, токен в localStorage, Authorization в запросах, при 200 — пустые таблицы = пустые данные в БД. |

Данные при этом не удаляются: миграции только добавляют колонки при их отсутствии (идемпотентные правки уже внесены в миграции `050b17e3cb89` и `add_service_catalog_description`).
