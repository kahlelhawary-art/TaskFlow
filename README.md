# TaskFlow

A simplified Trello-like project management system.

## Backend

Built with FastAPI, SQLAlchemy (async), SQLite/aiosqlite, JWT auth.

### Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Tests

```bash
cd backend
pytest tests/ -v
```

### API Docs

Visit `http://localhost:8000/docs` after starting the server.
