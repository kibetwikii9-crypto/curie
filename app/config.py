import warnings
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment."""

    public_url: str = "http://localhost:8000"
    frontend_url: str = ""  # Frontend URL for CORS (optional)
    log_level: str = "INFO"
    openai_api_key: str = ""
    database_url: str  # Required: Supabase PostgreSQL connection string
    secret_key: str = "your-secret-key-change-in-production"  # JWT secret key (set via SECRET_KEY env var)
    maintenance_mode: bool = False  # Maintenance mode - blocks all access when True (set via MAINTENANCE_MODE env var)
    
    # Meta OAuth for WhatsApp (self-serve connection)
    meta_app_id: str = ""  # Meta App ID (set via META_APP_ID env var)
    meta_app_secret: str = ""  # Meta App Secret (set via META_APP_SECRET env var)
    meta_redirect_uri: str = ""  # OAuth redirect URI (set via META_REDIRECT_URI env var)
    
    # WhatsApp Webhook
    whatsapp_verify_token: str = ""  # Webhook verification token (set via WHATSAPP_VERIFY_TOKEN env var)
    whatsapp_app_secret: str = ""  # App secret for signature verification (set via WHATSAPP_APP_SECRET env var)
    
    # Instagram Integration
    instagram_verify_token: str = ""  # Instagram webhook verification token (set via INSTAGRAM_VERIFY_TOKEN env var)
    meta_instagram_redirect_uri: str = ""  # Instagram OAuth redirect URI (set via META_INSTAGRAM_REDIRECT_URI env var)
    
    # Facebook Messenger Integration
    messenger_verify_token: str = ""  # Messenger webhook verification token (set via MESSENGER_VERIFY_TOKEN env var)
    meta_messenger_redirect_uri: str = ""  # Messenger OAuth redirect URI (set via META_MESSENGER_REDIRECT_URI env var)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"  # Allow extra env vars without raising errors
    )

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

