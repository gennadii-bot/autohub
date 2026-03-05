#!/usr/bin/env python3
"""Analyze cities table: types and counts. Run: python scripts/analyze_cities.py"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import text
from app.database.session import async_session_maker


async def main():
    async with async_session_maker() as session:
        # Check if type column exists
        r = await session.execute(text("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'cities' AND column_name IN ('type', 'district_id')
        """))
        cols = [row[0] for row in r.fetchall()]
        print("Columns in cities:", cols)

        # Total count
        r = await session.execute(text("SELECT COUNT(*) FROM cities"))
        total = r.scalar()
        print(f"Total cities: {total}")

        if "type" in cols:
            r = await session.execute(text("""
                SELECT type, COUNT(*) FROM cities GROUP BY type ORDER BY COUNT(*) DESC
            """))
            print("\nBy type:")
            for row in r.fetchall():
                print(f"  {row[0]!r}: {row[1]}")
        else:
            print("\nNo 'type' column - need migration")


if __name__ == "__main__":
    asyncio.run(main())
