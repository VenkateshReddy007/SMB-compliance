from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql://rguser:rgpass123@localhost:5432/regraph"
    redis_url: str = "redis://localhost:6379"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
