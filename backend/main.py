import uvicorn
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .database.client import db, settings
from .routers import auth, users, meetings, next_steps

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await db.connect()
    yield
    # Shutdown
    db.close()

app = FastAPI(
    title="Daily Action Hub API",
    lifespan=lifespan
)

# CORS Configuration
# We use allow_origin_regex to match localhost ports and the production domain robustly
origin_regex = r"https?://(localhost|127\.0\.0\.1|.*\.onrender\.com)(:\d+)?"

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(meetings.router, prefix="/api/v1")
app.include_router(next_steps.router, prefix="/api/v1")

@app.get("/healthz", status_code=status.HTTP_200_OK)
async def health_check():
    try:
        if db.client:
            # Ping the database to ensure connection is active
            await db.client.admin.command('ping')
            return {"status": "ok", "database": "connected"}
        else:
            return {"status": "error", "database": "disconnected"}
    except Exception as e:
        return {"status": "error", "database": str(e)}

@app.get("/")
async def root():
    return {"message": "Welcome to Daily Action Hub API"}

if __name__ == "__main__":
    print(f"Starting server on 0.0.0.0:{settings.PORT}")
    uvicorn.run("backend.main:app", host="0.0.0.0", port=settings.PORT, reload=True)