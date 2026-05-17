"""Application configuration via environment variables."""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Google Cloud
    GOOGLE_CLOUD_PROJECT: str = "devpulse-demo"
    GOOGLE_CLOUD_LOCATION: str = "us-central1"
    VERTEX_AI_MODEL: str = "gemini-1.5-pro-preview-0409"

    # Gemini Direct API
    GEMINI_API_KEY: str = "demo-key"

    # MongoDB
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB: str = "devpulse"

    # Google OAuth2 / Calendar
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/auth/google/callback"

    # GitHub
    GITHUB_TOKEN: Optional[str] = None
    GITHUB_USERNAME: Optional[str] = None

    # App
    SECRET_KEY: str = "devpulse-secret-key-change-in-production"
    DEMO_MODE: bool = True
    AGENT_INTERVAL_MINUTES: int = 30

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
