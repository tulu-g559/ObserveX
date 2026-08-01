from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_NAME: str = "ObserveX"
    ENV: str = "development"

    DATABASE_URL: str = "postgresql+psycopg://observex:observex@postgres:5432/observex" ## embed at docker (see desktop)
    REDIS_URL: str = "redis://redis:6379/0"

    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.6-flash" #upgrade 3.0 doesn't work

    MAX_UPLOAD_MB: int = 5
    ALLOWED_ORIGINS: list[str] = ["http://localhost:5173", "chrome-extension://*"]

    JWT_SECRET: str = "change-meffsjfs"
    JWT_ALGORITHM: str = "HS256"


@lru_cache
def get_settings() -> Settings:
    return Settings()
