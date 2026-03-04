import asyncio
import os
from datetime import datetime

import aiosqlite
from aiogram import Bot, Dispatcher
from aiogram.filters import Command
from aiogram.types import Message

BOT_TOKEN = os.getenv("BOT_TOKEN")
DB_PATH = os.getenv("DB_PATH", "users.db")

dp = Dispatcher()


async def init_db() -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "CREATE TABLE IF NOT EXISTS users (telegram_id INTEGER PRIMARY KEY, created_at TEXT)"
        )
        await db.commit()


async def register_user(telegram_id: int) -> bool:
    """Регистрирует пользователя. Возвращает True если новый, False если уже был."""
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "SELECT 1 FROM users WHERE telegram_id = ?", (telegram_id,)
        )
        exists = await cursor.fetchone()
        if exists:
            return False
        await db.execute(
            "INSERT INTO users (telegram_id, created_at) VALUES (?, ?)",
            (telegram_id, datetime.utcnow().isoformat()),
        )
        await db.commit()
        return True


@dp.message(Command("start"))
async def cmd_start(message: Message) -> None:
    is_new = await register_user(message.from_user.id)
    if is_new:
        await message.answer("Вы зарегистрированы. Бот используется для уведомлений и подтверждений.")
    else:
        await message.answer("Вы уже зарегистрированы.")


async def main() -> None:
    if not BOT_TOKEN:
        raise ValueError("Установите переменную окружения BOT_TOKEN")
    await init_db()
    bot = Bot(token=BOT_TOKEN)
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
