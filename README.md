# TaskFlow

> A real-time, full-stack Kanban task management app built with FastAPI and React.

![Python](https://img.shields.io/badge/Python-3.12+-3776AB?style=flat&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111+-009688?style=flat&logo=fastapi&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=flat&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?style=flat&logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=flat)

<!-- Add screenshots here -->

---

## Features

- **Kanban board with drag & drop** — reorder tasks and columns using `@dnd-kit`
- **Real-time collaboration via WebSocket** — all connected users see changes instantly with exponential-backoff reconnection
- **JWT authentication** — secure register / login with bcrypt-hashed passwords
- **Project management** — create, edit, delete projects; role-based member access (owner / member)
- **Board management** — create, rename, reorder, and delete boards (columns) per project
- **Task management** — create, edit, move between boards, set priority levels, due dates, and labels
- **Responsive dark theme UI** — clean dark interface built with Tailwind CSS v4
- **Docker deployment ready** — one-command full-stack deployment via Docker Compose

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | FastAPI, SQLAlchemy (async), PostgreSQL, `python-jose` JWT, WebSocket |
| **Frontend** | React 19, TypeScript 6, Tailwind CSS v4, `@dnd-kit`, `@tanstack/react-query`, Zustand |
| **Infrastructure** | Docker, Docker Compose, Nginx, PostgreSQL 16 |

---

## Getting Started

### Prerequisites

- Python 3.12+
- Node.js 20+
- PostgreSQL (or use Docker — recommended)

### Clone the repository

```bash
git clone https://github.com/kahlelhawary-art/taskflow.git
cd taskflow
```

### Backend setup

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables (copy and edit as needed)
cp ../.env.example .env

# Run development server
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`.

### Frontend setup

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

### Docker setup (recommended)

```bash
# Copy and configure environment variables
cp .env.example .env

# Build and start all services
docker-compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

---

## API Documentation

FastAPI automatically generates interactive API documentation:

- **Swagger UI** — `http://localhost:8000/docs`
- **ReDoc** — `http://localhost:8000/redoc`

### Endpoints overview

#### Auth — `/api/auth`

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login and receive JWT token |
| `GET` | `/api/auth/me` | Get current user profile |
| `PUT` | `/api/auth/me` | Update username or avatar |

#### Projects — `/api/projects`

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/projects` | List all accessible projects |
| `POST` | `/api/projects` | Create a new project |
| `GET` | `/api/projects/{id}` | Get a project by ID |
| `PUT` | `/api/projects/{id}` | Update project details |
| `DELETE` | `/api/projects/{id}` | Delete a project (owner only) |
| `GET` | `/api/projects/{id}/boards` | List boards in a project |
| `POST` | `/api/projects/{id}/members/{user_id}` | Add a project member |
| `DELETE` | `/api/projects/{id}/members/{user_id}` | Remove a project member |

#### Boards — `/api/boards`

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/boards` | Create a new board (column) |
| `PUT` | `/api/boards/reorder` | Reorder boards by position |
| `GET` | `/api/boards/{id}` | Get a board by ID |
| `PUT` | `/api/boards/{id}` | Rename or update a board |
| `DELETE` | `/api/boards/{id}` | Delete a board (owner only) |
| `GET` | `/api/boards/{id}/tasks` | List tasks in a board |

#### Tasks — `/api/tasks`

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/tasks` | Create a new task |
| `PUT` | `/api/tasks/reorder` | Reorder tasks within a board |
| `GET` | `/api/tasks/{id}` | Get a task by ID |
| `PUT` | `/api/tasks/{id}` | Update task details |
| `DELETE` | `/api/tasks/{id}` | Delete a task |
| `PUT` | `/api/tasks/{id}/move` | Move a task to another board |

#### WebSocket — `/api/ws`

| Protocol | Path | Description |
|---|---|---|
| `WS` | `/api/ws/{project_id}?token=<jwt>` | Subscribe to real-time project events |

WebSocket events broadcast: `board_created`, `board_updated`, `board_deleted`, `task_created`, `task_updated`, `task_moved`, `task_deleted`.

---

## Project Structure

```
TaskFlow/
├── docker-compose.yml
├── .env.example
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic/                  # Database migrations
│   └── app/
│       ├── main.py               # FastAPI app entry point
│       ├── config.py             # Settings via pydantic-settings
│       ├── database.py           # Async SQLAlchemy engine & session
│       ├── middleware/
│       │   └── auth.py           # JWT bearer dependency
│       ├── models/               # SQLAlchemy ORM models
│       │   ├── user.py
│       │   ├── project.py
│       │   ├── board.py
│       │   └── task.py
│       ├── schemas/              # Pydantic request/response schemas
│       ├── routes/               # FastAPI routers
│       │   ├── auth.py
│       │   ├── projects.py
│       │   ├── boards.py
│       │   ├── tasks.py
│       │   └── ws.py
│       ├── services/
│       │   ├── auth_service.py   # JWT & bcrypt helpers
│       │   ├── task_service.py   # Task business logic
│       │   └── ws_manager.py    # WebSocket connection manager
│       └── tests/
│
└── frontend/
    ├── Dockerfile
    ├── package.json
    └── src/
        ├── App.tsx               # Router setup
        ├── main.tsx
        ├── store/
        │   └── auth-store.ts     # Zustand auth state
        ├── lib/
        │   └── api.ts            # Axios instance & API calls
        ├── hooks/
        │   └── useWebSocket.ts   # WebSocket hook with reconnect
        ├── components/
        │   ├── Layout.tsx
        │   ├── ProtectedRoute.tsx
        │   ├── board/            # BoardColumn, TaskCard
        │   └── modals/           # CreateProjectModal, TaskDetailModal
        └── pages/
            ├── Dashboard.tsx
            ├── Projects.tsx
            ├── BoardView.tsx     # Kanban board with drag & drop
            ├── Settings.tsx
            └── auth/
                ├── Login.tsx
                └── Register.tsx
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://taskflow:taskflow@db:5432/taskflow` | Async PostgreSQL connection string |
| `SECRET_KEY` | `change-me-in-production` | Secret key used for signing JWT tokens |
| `ALLOWED_ORIGINS` | `http://localhost,http://localhost:80` | Comma-separated list of CORS-allowed origins |

> **Important:** Always set a strong, random `SECRET_KEY` in production.

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for details.

---

## Author

**Khalel Elhawary**

GitHub: [@kahlelhawary-art](https://github.com/kahlelhawary-art)
