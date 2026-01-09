import warnings
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment."""

    bot_token: str
    public_url: str = "http://localhost:8000"
    frontend_url: str = ""  # Frontend URL for CORS (optional)
    log_level: str = "INFO"
    openai_api_key: str = ""
    database_url: str  # Required: Supabase PostgreSQL connection string
    secret_key: str = "your-secret-key-change-in-production"  # JWT secret key (set via SECRET_KEY env var)
    admin_email: str = "admin@automify.com"  # Admin user email (set via ADMIN_EMAIL env var)
    admin_password: str = ""  # Admin user password (set via ADMIN_PASSWORD env var, required for auto-creation)

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Warn if using default secret key in production
        if self.secret_key == "your-secret-key-change-in-production":
            warnings.warn(
                "Using default SECRET_KEY. This is insecure for production! "
                "Please set SECRET_KEY environment variable.",
                UserWarning
            )


settings = Settings()

