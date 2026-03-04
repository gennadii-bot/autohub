# AvtoHub KZ Backend

Production-ready FastAPI backend.

## Stack

- FastAPI
- Async SQLAlchemy 2.0
- asyncpg
- Alembic
- PostgreSQL
- Pydantic v2
- JWT (будет позже)

## Install

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/macOS
# или: venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

## Configure

```bash
cp .env.example .env
# Отредактируйте .env: DATABASE_URL, SECRET_KEY
```

## Run (local)

```bash
# 1. Запустить PostgreSQL (Docker)
docker compose up -d postgres

# 2. Миграции
alembic upgrade head

# 3. Сервер
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Run (Docker)

```bash
docker compose up -d
```

## Endpoints

- `GET /health` — liveness
- `GET /health/db` — database check
- `GET /cities` — список городов
- `GET /sto` — список СТО
- `GET /sto/{id}` — СТО по id
- `POST /booking` — создать запись
