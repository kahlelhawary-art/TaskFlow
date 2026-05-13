from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./taskflow.db"
    SECRET_KEY: str = "changeme-super-secret-key-for-dev-only"
    ALGORITHM: str = "HS256"
    JWT_EXPIRY: int = 60 * 24 * 7  # minutes — 7 days
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,https://taskflow-frontend.onrender.com"

    @property
    def allowed_origins_list(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
