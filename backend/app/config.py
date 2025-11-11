from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    """Application settings"""

    # Database
    DATABASE_URL: str

    # Redis
    REDIS_URL: str

    # API Keys
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""

    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 43200

    # Server
    HOST: str = "192.168.0.95"
    PORT: int = 8200
    DEBUG: bool = False
    CORS_ORIGINS: List[str] = ["http://localhost:3060", "https://dreamnow.ligardi.ru", "https://dreamcapture.ligardi.ru"]

    # Stream Settings
    DREAM_TTL_SECONDS: int = 86400  # 24 hours
    MOMENT_TTL_SECONDS: int = 60    # 60 seconds
    MAX_DREAMS_PER_DAY: int = 10
    MAX_MOMENTS_PER_HOUR: int = 20

    # AI Settings
    DREAM_ANALYSIS_MODEL: str = "claude-3-5-sonnet-20241022"
    IMAGE_GENERATION_MODEL: str = "dall-e-3"
    ENABLE_AI_FEATURES: bool = True

    # Celery
    CELERY_BROKER_URL: str
    CELERY_RESULT_BACKEND: str

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True
    )


settings = Settings()
