"""Security utilities: password hashing and JWT."""

from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings

# In-memory token blacklist (jti -> expiry). For production consider Redis.
_token_blacklist: dict[str, datetime] = {}


def _truncate_for_bcrypt(s: str) -> bytes:
    """Bcrypt limits input to 72 bytes."""
    b = s.encode("utf-8", errors="replace")
    return b[:72] if len(b) > 72 else b


def hash_password(password: str) -> str:
    """Hash plain password with bcrypt."""
    return bcrypt.hashpw(_truncate_for_bcrypt(password), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Verify plain password against hash."""
    if not hashed:
        return False
    try:
        return bcrypt.checkpw(_truncate_for_bcrypt(plain), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def create_access_token(user_id: int, role: str) -> str:
    """Create JWT access token. Payload: user_id, role. Expires in 60 min."""
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    to_encode = {
        "exp": expire,
        "sub": str(user_id),
        "role": role,
        "jti": f"{user_id}_{datetime.now(timezone.utc).timestamp()}",
    }
    return jwt.encode(to_encode, settings.secret_key, algorithm="HS256")


def decode_access_token(token: str) -> dict | None:
    """Decode JWT. Returns payload dict with sub, role or None if invalid."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
        jti = payload.get("jti")
        if jti and jti in _token_blacklist:
            if _token_blacklist[jti] > datetime.now(timezone.utc):
                return None
            del _token_blacklist[jti]
        return payload
    except JWTError:
        return None


def invalidate_token(token: str) -> None:
    """Add token to blacklist (logout)."""
    try:
        payload = jwt.decode(
            token, settings.secret_key, algorithms=["HS256"]
        )
        jti = payload.get("jti")
        exp = payload.get("exp")
        if jti and exp:
            _token_blacklist[jti] = datetime.fromtimestamp(exp, tz=timezone.utc)
    except JWTError:
        pass
