# AvtoHub Admin

Отдельная административная панель платформы AvtoHub KZ.

## Технологии

- React 19
- Vite 7
- TypeScript
- Tailwind CSS 4
- React Router 7
- Axios

## Запуск

```bash
npm install
npm run dev
```

Приложение будет доступно на **http://localhost:5174**

## Переменные окружения

Создайте `.env`:

```
VITE_API_URL=http://localhost:8000
```

Для production: `VITE_API_URL=https://api.avtohub.kz`

## Авторизация

- Только пользователи с ролью `admin` могут войти
- POST /auth/login
- GET /auth/me — проверка роли
- При role !== "admin" → Access Denied

## Deploy

- **Основной сайт:** https://app.avtohub.kz
- **Админ-панель:** https://admin.avtohub.kz
- **API:** https://api.avtohub.kz

Все используют один backend.
