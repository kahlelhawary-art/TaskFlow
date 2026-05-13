# TaskFlow — Backend

FastAPI async backend for the TaskFlow project management app.

## Stack

- **FastAPI** — async HTTP + WebSocket framework
- **SQLAlchemy 2 (asyncio)** — async ORM
- **PostgreSQL** — primary database (aiosqlite supported for local dev)
- **python-jose** — JWT token signing/verification
- **bcrypt** — password hashing
- **pydantic-settings** — environment-based configuration
- **Alembic** — database migrations

## Setup

```bash
cd backend

python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
```

Create a `.env` file (or set environment variables directly):

```env
DATABASE_URL=postgresql+asyncpg://taskflow:taskflow@localhost:5432/taskflow
SECRET_KEY=your-secret-key
ALLOWED_ORIGINS=http://localhost:5173
```

## Running

```bash
uvicorn app.main:app --reload
```

API available at `http://localhost:8000`.
Interactive docs at `http://localhost:8000/docs`.

## Running Tests

```bash
pytest tests/ -v
```

Tests use `pytest-asyncio` with an in-memory SQLite database for isolation.

## API Overview

| Prefix | Description |
|---|---|
| `/api/auth` | Register, login, current user |
| `/api/projects` | Project CRUD + member management |
| `/api/boards` | Board (column) CRUD + reorder |
| `/api/tasks` | Task CRUD + move + reorder |
| `/api/ws/{project_id}` | WebSocket real-time events |
| `/api/health` | Health check |

## Project Layout

```
backend/
├── app/
│   ├── main.py           # App factory, middleware, router registration
│   ├── config.py         # Pydantic settings
│   ├── database.py       # Async engine, session factory, table creation
│   ├── middleware/
│   │   └── auth.py       # get_current_user dependency
│   ├── models/           # SQLAlchemy ORM models
│   ├── schemas/          # Pydantic schemas (request / response)
│   ├── routes/           # FastAPI routers per domain
│   └── services/         # Business logic, WebSocket manager
├── alembic/              # Migration scripts
├── tests/                # pytest test suite
└── requirements.txt
```
