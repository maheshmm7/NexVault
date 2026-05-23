from pydantic_settings import BaseSettings
from typing import List, Union
import json

class Settings(BaseSettings):
    PROJECT_NAME: str = "Vaultify API"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "supersecretkey_change_in_production"
    VAULT_ENCRYPTION_KEY: str = "default_vaultify_aes_gcm_secret_key_32bytes_!"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    DATABASE_URL: str = "sqlite:///./vaultify.db"
    DEFAULT_TIMEZONE: str = "Asia/Kolkata"
    
    # Cookie Security Settings
    COOKIE_SECURE: bool = False  # Set to True in production (HTTPS)
    COOKIE_SAMESITE: str = "lax"  # 'lax', 'strict', or 'none'
    
    # Transactional Email & Frontend Integrations
    BREVO_API_KEY: str = ""
    SMTP_FROM_EMAIL: str = ""
    FRONTEND_URL: str = "http://localhost:5173"
    
    # CORS Configuration - comma separated string or JSON list
    BACKEND_CORS_ORIGINS: Union[str, List[str]] = ["http://localhost:5173", "http://localhost:3000"]

    def __init__(self, **values):
        super().__init__(**values)
        # Automatic runtime default adjustments for production PostgreSQL envs
        is_production = "postgresql" in self.DATABASE_URL or "postgres" in self.DATABASE_URL
        if is_production:
            # Force COOKIE_SECURE default to True for HTTPS production environments
            if "COOKIE_SECURE" not in values:
                self.COOKIE_SECURE = True
            
            # Prevent static default fallback key or missing key in production
            fallback_key = "default_vaultify_aes_gcm_secret_key_32bytes_!"
            if not self.VAULT_ENCRYPTION_KEY or self.VAULT_ENCRYPTION_KEY == fallback_key:
                raise ValueError(
                    "Security Startup Error: VAULT_ENCRYPTION_KEY must be set to a secure, "
                    "non-default value in production environments (PostgreSQL database detected)."
                )

            # Prevent static default fallback key or missing key for SECRET_KEY in production
            fallback_secret = "supersecretkey_change_in_production"
            if not self.SECRET_KEY or self.SECRET_KEY == fallback_secret:
                raise ValueError(
                    "Security Startup Error: SECRET_KEY must be set to a secure, "
                    "non-default value in production environments (PostgreSQL database detected)."
                )

    @property
    def cors_origins(self) -> List[str]:
        if isinstance(self.BACKEND_CORS_ORIGINS, str):
            # Clean and parse string representation
            cleaned = self.BACKEND_CORS_ORIGINS.strip()
            if cleaned.startswith("[") and cleaned.endswith("]"):
                try:
                    return json.loads(cleaned)
                except Exception:
                    pass
            return [o.strip() for o in cleaned.split(",") if o.strip()]
        return self.BACKEND_CORS_ORIGINS

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
