#!/usr/bin/env python3
"""Seed cities of Kazakhstan. Run: python -m scripts.seed_cities"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import async_session_maker
from app.models import City


CITIES: list[tuple[str, str]] = [
    # Республиканского значения
    ("Алматы", "Алматы"),
    ("Астана", "Астана"),
    ("Шымкент", "Шымкент"),
    # Акмолинская
    ("Кокшетау", "Акмолинская"),
    ("Степногорск", "Акмолинская"),
    # Актюбинская
    ("Актобе", "Актюбинская"),
    # Алматинская
    ("Капшагай", "Алматинская"),
    # Атырауская
    ("Атырау", "Атырауская"),
    # Восточно-Казахстанская
    ("Усть-Каменогорск", "Восточно-Казахстанская"),
    # Абайская
    ("Семей", "Абайская"),
    # Жамбылская
    ("Тараз", "Жамбылская"),
    # Западно-Казахстанская
    ("Уральск", "Западно-Казахстанская"),
    # Карагандинская
    ("Караганда", "Карагандинская"),
    ("Темиртау", "Карагандинская"),
    # Костанайская
    ("Костанай", "Костанайская"),
    ("Рудный", "Костанайская"),
    # Кызылординская
    ("Кызылорда", "Кызылординская"),
    # Мангистауская
    ("Актау", "Мангистауская"),
    ("Жанаозен", "Мангистауская"),
    # Павлодарская
    ("Павлодар", "Павлодарская"),
    ("Экибастуз", "Павлодарская"),
    # Северо-Казахстанская
    ("Петропавловск", "Северо-Казахстанская"),
    # Туркестанская
    ("Туркестан", "Туркестанская"),
    ("Кентау", "Туркестанская"),
    # Жетысуская (Талдыкорган — областной центр)
    ("Талдыкорган", "Жетысуская"),
    # Улытауская
    ("Жезказган", "Улытауская"),
]


async def seed() -> None:
    async with async_session_maker() as session:
        result = await session.execute(select(City))
        existing = {(c.name, c.region) for c in result.scalars().all()}

        added = 0
        for name, region in CITIES:
            if (name, region) not in existing:
                session.add(City(name=name, region=region))
                added += 1

        await session.commit()
        print(f"Seeded {added} new cities (total {len(existing) + added}).")


if __name__ == "__main__":
    asyncio.run(seed())
