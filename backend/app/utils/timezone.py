"""Kazakhstan timezone (Asia/Almaty) for all platform dates."""

from datetime import datetime
from zoneinfo import ZoneInfo

KZ_TZ = ZoneInfo("Asia/Almaty")


def now_kz() -> datetime:
    """Current datetime in Kazakhstan timezone."""
    return datetime.now(KZ_TZ)


def to_kz(dt: datetime | None) -> datetime | None:
    """Convert datetime to Kazakhstan timezone. Naive UTC assumed if no tzinfo."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        from datetime import timezone
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(KZ_TZ)
