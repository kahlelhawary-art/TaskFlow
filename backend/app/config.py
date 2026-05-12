from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./taskflow.db"
    SECRET_KEY: str = "changeme-super-secret-key-for-dev-only"
    ALGORITHM: str = "HS256"
    JWT_EXPIRY: int = 60 * 24 * 7  # minutes — 7 days

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
