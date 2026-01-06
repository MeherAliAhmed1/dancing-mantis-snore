import os
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic_settings import BaseSettings
from typing import Optional, Any

class Settings(BaseSettings):
    MONGODB_URI: str
    APP_ENV: str
    PORT: int
    
    # Google OAuth
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    GOOGLE_REDIRECT_URI: str
    
    # Frontend
    FRONTEND_URL: str
    CORS_ORIGINS: str
    CORS_ALLOW_METHODS: str = "GET,POST,PUT,DELETE,OPTIONS,PATCH"
    CORS_ALLOW_HEADERS: str = "Content-Type,Authorization"

    # JWT
    JWT_SECRET: str
    JWT_ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int

    # AI
    OPENAI_API_KEY: Optional[str] = None

    # External Services
    GOOGLE_TOKEN_URL: str
    GOOGLE_CALENDAR_EVENTS_URL: str
    GOOGLE_GMAIL_DRAFTS_URL: str
    GOOGLE_AUTH_URL: str
    GOOGLE_USER_INFO_URL: str

    class Config:
        env_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")

settings = Settings()

class Database:
    client: Optional[Any] = None

    async def connect(self):
        try:
            # Try connecting with a short timeout
            print(f"DEBUG: Attempting to connect to MongoDB at {settings.MONGODB_URI}")
            self.client = AsyncIOMotorClient(settings.MONGODB_URI, serverSelectionTimeoutMS=2000)
            await self.client.admin.command('ping')
            print("Connected to MongoDB")
        except Exception as e:
            print(f"Could not connect to MongoDB: {e}")
            print("Falling back to in-memory MockDB")
            from .mock_db import MockClient
            self.client = MockClient(settings.MONGODB_URI)

    def close(self):
        if self.client:
            self.client.close()
            print("Disconnected from MongoDB")

    def get_db(self):
        if self.client:
            try:
                return self.client.get_default_database()
            except Exception:
                return self.client["daily_action_hub"]
        return None

db = Database()

async def get_database():
    return db.get_db()