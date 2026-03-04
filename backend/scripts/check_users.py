#!/usr/bin/env python3
"""
Check users in database. Useful for debugging auth 401.
Run: python scripts/check_users.py
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select, text
from app.database.session import async_session_maker
from app.models import User


async def main():
    async with async_session_maker() as session:
        result = await session.execute(select(User.id, User.email, User.role, User.is_active, User.password_hash).order_by(User.id))
        rows = result.all()
        print(f"\n{'id':<6} {'email':<35} {'role':<12} active  has_pwd")
        print("-" * 65)
        for r in rows:
            role = r.role.value if hasattr(r.role, "value") else str(r.role)
            has_pwd = "yes" if (r.password_hash and len(r.password_hash) > 10) else "NO"
            print(f"{r.id:<6} {r.email:<35} {role:<12} {r.is_active!s:<6} {has_pwd}")
        print(f"\nTotal: {len(rows)} users")
        print("\nPartner roles: sto_owner, sto")
        print("If user has no password_hash or is_active=False, login returns 401.")


if __name__ == "__main__":
    asyncio.run(main())
