import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.database import create_tables
from app.routes import auth, boards, projects, tasks, ws

settings = get_settings()

UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")


@asynccontextmanager
async def lifespan(app: FastAPI):
    import logging
    from sqlalchemy import text
    from app.database import engine
    logger = logging.getLogger("uvicorn")
    os.makedirs(UPLOADS_DIR, exist_ok=True)
    await create_tables()
    # Add missing columns for existing PostgreSQL tables
    async with engine.begin() as conn:
        for col, typ in [
            ("full_name", "VARCHAR(255)"),
            ("bio", "TEXT"),
            ("phone", "VARCHAR(50)"),
            ("location", "VARCHAR(255)"),
            ("avatar_url", "VARCHAR(500)"),
        ]:
            try:
                await conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} {typ}"))
                logger.info(f"Added column users.{col}")
            except Exception:
                pass  # column already exists
    logger.info("Database ready.")
    yield


app = FastAPI(
    title="TaskFlow API",
    description="Project management system API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads directory for serving avatar images
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(boards.router, prefix="/api/boards", tags=["boards"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["tasks"])
app.include_router(ws.router, prefix="/api", tags=["websocket"])


@app.get("/api/health")
async def health():
    return {"status": "ok"}
