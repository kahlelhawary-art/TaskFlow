"""
reset_db.py — Delete the SQLite database and recreate all tables.
Run from the backend/ directory: python reset_db.py
"""
import asyncio
import os
import sys

# Add backend to path so app imports work
sys.path.insert(0, os.path.dirname(__file__))

from app.database import create_tables, drop_tables, engine
from app.config import get_settings

settings = get_settings()


async def reset():
    db_url = settings.DATABASE_URL
    # Only handle SQLite
    if not db_url.startswith("sqlite"):
        print("This script only supports SQLite databases.")
        return

    # Extract file path from sqlite:///./path or sqlite+aiosqlite:///./path
    db_path = db_url.split("///")[-1]
    if os.path.exists(db_path):
        os.remove(db_path)
        print(f"Deleted database: {db_path}")

    print("Creating tables...")
    await create_tables()
    print("Database reset complete.")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(reset())
