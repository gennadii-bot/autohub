# AvtoHub Join — Стать партнёром

Отдельный frontend для подачи заявки на партнёрство (join.autohub.kz).

## Запуск

```bash
npm install
npm run dev
```

## Сборка

```bash
npm run build
```

## Переменные окружения

- `VITE_API_URL` — URL бэкенда (по умолчанию http://localhost:8000)
- `VITE_CLIENT_URL` — URL клиентского сайта для ссылки «На главную» (по умолчанию https://autohub.kz)

## Деплой на join.autohub.kz

Собранные файлы в `dist/` развернуть на поддомене join.autohub.kz.
