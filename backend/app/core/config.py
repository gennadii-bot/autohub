"""Application configuration via pydantic-settings."""

from pathlib import Path

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Backend root (parent of app/) — .env loaded from here regardless of cwd
_BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent
_ENV_FILE = _BACKEND_ROOT / ".env"


class Settings(BaseSettings):
    """Settings loaded from environment and .env file."""

    model_config = SettingsConfigDict(
        env_file=_ENV_FILE if _ENV_FILE.exists() else ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --------------------------------------------------
    # Environment
    # --------------------------------------------------
    app_env: str = "development"
    debug: bool = True
    environment: str = "development"

    # --------------------------------------------------
    # CORS
    # --------------------------------------------------
    # Читается из ALLOWED_ORIGINS в .env
    # Формат:
    # ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:5175
    allowed_origins: str = Field(
        default=(
            "http://localhost:5173,"
            "http://127.0.0.1:5173,"
            "http://localhost:5174,"
            "http://127.0.0.1:5174,"
            "http://localhost:5175,"
            "http://127.0.0.1:5175"
        ),
        validation_alias="ALLOWED_ORIGINS",
    )

    @property
    def cors_origins(self) -> list[str]:
        """Return parsed CORS origins list."""
        if not self.allowed_origins:
            return []
        return [
            origin.strip()
            for origin in self.allowed_origins.split(",")
            if origin.strip()
        ]

    # --------------------------------------------------
    # Database (use DATABASE_URL in .env; default points to avtohub)
    # --------------------------------------------------
    database_url: str = Field(
        default="postgresql+asyncpg://user:password@localhost:5432/avtohub",
        validation_alias=AliasChoices("DATABASE_URL", "database_url"),
    )
    database_sync_url: str | None = None

    database_pool_size: int = 5
    database_max_overflow: int = 10
    database_pool_timeout: int = 30

    # --------------------------------------------------
    # JWT
    # --------------------------------------------------
    secret_key: str = Field(
        default="change-me-in-production-use-openssl-rand-hex-32",
        validation_alias=AliasChoices("SECRET_KEY", "JWT_SECRET"),
    )
    access_token_expire_minutes: int = 60

    # --------------------------------------------------
    # Rate limiting
    # --------------------------------------------------
    rate_limit_per_minute: int = 120
    rate_limit_chat_per_minute: int = 120  # Separate bucket for /chat, /partner/chats

    # --------------------------------------------------
    # Telegram (optional)
    # --------------------------------------------------
    telegram_bot_token: str | None = None

    # --------------------------------------------------
    # Email SMTP
    # --------------------------------------------------
    smtp_host: str = "localhost"
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_from: str = "noreply@avtohub.kz"

    # --------------------------------------------------
    # Resend
    # --------------------------------------------------
    resend_api_key: str | None = None
    resend_from: str | None = None
    partner_frontend_url: str = "http://localhost:5175"
    activation_token_expire_hours: int = 24

    # --------------------------------------------------
    # Media
    # --------------------------------------------------
    media_root: str = "media"


settings = Settings()