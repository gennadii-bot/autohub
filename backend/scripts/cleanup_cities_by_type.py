#!/usr/bin/env python3
"""
Cleanup cities: keep only city, town, district_center.
Deletes villages, hamlets, etc.

By default keeps cities with type=NULL (e.g. from seed).
Use --delete-null to also delete cities with NULL type.

Run: python scripts/cleanup_cities_by_type.py [--dry-run] [--delete-null]
"""

import argparse
import asyncio
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import text
from app.database.session import async_session_maker

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

KEEP_TYPES = {"city", "town", "district_center"}


async def main(dry_run: bool, delete_null: bool) -> None:
    async with async_session_maker() as session:
        # Check if type column exists
        r = await session.execute(text("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'cities' AND column_name = 'type'
        """))
        if not r.fetchone():
            logger.error("Column 'type' does not exist in cities. Run migrations first.")
            return

        # Count by type
        r = await session.execute(text("""
            SELECT type, COUNT(*) FROM cities GROUP BY type ORDER BY COUNT(*) DESC
        """))
        rows = r.fetchall()
        logger.info("Current distribution by type:")
        for type_val, cnt in rows:
            keep = "KEEP" if (type_val in KEEP_TYPES if type_val else False) else "DELETE"
            logger.info("  %s: %d (%s)", type_val or "NULL", cnt, keep)

        # Count to delete
        keep_list = list(KEEP_TYPES)
        placeholders = ", ".join(f":k{i}" for i in range(len(keep_list)))
        params = {f"k{i}": v for i, v in enumerate(keep_list)}
        if delete_null:
            where_clause = f"type IS NULL OR type NOT IN ({placeholders})"
        else:
            where_clause = f"type IS NOT NULL AND type NOT IN ({placeholders})"
        r = await session.execute(
            text(f"SELECT COUNT(*) FROM cities WHERE {where_clause}"),
            params,
        )
        to_delete = r.scalar()
        logger.info(
            "Will delete %d cities (%s)",
            to_delete,
            "including NULL type" if delete_null else "type NOT IN " + str(KEEP_TYPES),
        )

        if to_delete == 0:
            logger.info("Nothing to delete.")
            return

        if dry_run:
            logger.info("DRY RUN - no changes made")
            return

        result = await session.execute(
            text(f"DELETE FROM cities WHERE {where_clause}"),
            params,
        )
        deleted = result.rowcount
        await session.commit()
        logger.info("Deleted %d cities", deleted)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Show what would be deleted")
    parser.add_argument(
        "--delete-null",
        action="store_true",
        help="Also delete cities with NULL type (e.g. before GeoNames import)",
    )
    args = parser.parse_args()
    asyncio.run(main(dry_run=args.dry_run, delete_null=args.delete_null))
