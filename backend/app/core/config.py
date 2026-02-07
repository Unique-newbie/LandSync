"""Application Configuration"""

from functools import lru_cache
from typing import List, Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment"""
    
    # App
    APP_NAME: str = "LandSync"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    API_PREFIX: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/LandSync"
    DATABASE_SYNC_URL: str = "postgresql://postgres:postgres@localhost:5432/LandSync"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]
    
    # File Upload
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE: int = 50 * 1024 * 1024  # 50MB
    ALLOWED_SPATIAL_EXTENSIONS: List[str] = [".shp", ".gpkg", ".geojson", ".zip"]
    ALLOWED_TEXT_EXTENSIONS: List[str] = [".csv", ".xlsx", ".xls"]
    
    # GIS
    DEFAULT_SRID: int = 4326  # WGS84
    AREA_TOLERANCE_PERCENT: float = 5.0  # 5% tolerance for area matching
    
    # Matching Engine
    FUZZY_MATCH_THRESHOLD: float = 80.0  # Minimum score for a match
    
    # Government Integration (Sandbox mode)
    GOV_SANDBOX_MODE: bool = True
    AADHAAR_API_URL: Optional[str] = None
    DIGILOCKER_API_URL: Optional[str] = None
    BHULEKH_API_URL: Optional[str] = None
    
    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
        "extra": "ignore"
    }


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


settings = get_settings()
