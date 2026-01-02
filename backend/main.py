from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .database.client import db
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
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5137",
    "http://127.0.0.1:5137",
    "http://localhost:5138",
    "http://127.0.0.1:5138",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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