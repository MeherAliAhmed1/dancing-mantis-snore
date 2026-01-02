import os
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic_settings import BaseSettings
from typing import Optional, Any

class Settings(BaseSettings):
    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017/daily_action_hub")
    APP_ENV: str = os.getenv("APP_ENV", "development")
    PORT: int = int(os.getenv("PORT", 5000))
    
    # Google OAuth
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    GOOGLE_REDIRECT_URI: str = os.getenv("GOOGLE_REDIRECT_URI", "https://dancing-mantis-snore-backend.onrender.com/api/v1/auth/google/callback")
    
    # JWT
    JWT_SECRET: str = os.getenv("JWT_SECRET", "secret")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))

    # AI
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY")

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