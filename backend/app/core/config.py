from pydantic_settings import BaseSettings
from typing import List, Union
import json

class Settings(BaseSettings):
    PROJECT_NAME: str = "Vaultify API"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "supersecretkey_change_in_production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    DATABASE_URL: str = "sqlite:///./vaultify.db"
    
    # Cookie Security Settings
    COOKIE_SECURE: bool = False  # Set to True in production (HTTPS)
    COOKIE_SAMESITE: str = "lax"  # 'lax', 'strict', or 'none'
    
    # CORS Configuration - comma separated string or JSON list
    BACKEND_CORS_ORIGINS: Union[str, List[str]] = ["http://localhost:5173", "http://localhost:3000"]

    def __init__(self, **values):
        super().__init__(**values)
        # Automatic runtime default adjustments for production PostgreSQL envs
        if "postgresql" in self.DATABASE_URL or "postgres" in self.DATABASE_URL:
            # Force COOKIE_SECURE default to True for HTTPS production environments
            if "COOKIE_SECURE" not in values:
                self.COOKIE_SECURE = True

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
