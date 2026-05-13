# TaskFlow — Frontend

React 19 + TypeScript frontend for the TaskFlow project management app.

## Stack

- **React 19** — UI framework
- **TypeScript 6** — type-safe JavaScript
- **Vite 8** — build tool and dev server
- **Tailwind CSS v4** — utility-first styling
- **@dnd-kit** — drag-and-drop for Kanban boards
- **@tanstack/react-query** — server state management and caching
- **Zustand** — lightweight client-side auth state
- **Axios** — HTTP client
- **react-router-dom v7** — client-side routing
- **lucide-react** — icon library
- **react-hot-toast** — notifications

## Setup

```bash
cd frontend
npm install
```

Ensure the backend is running at `http://localhost:8000` (or adjust `src/lib/api.ts`).

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the Vite development server (hot reload) |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint on all source files |

## Project Layout

```
frontend/src/
├── App.tsx                   # Route declarations
├── main.tsx                  # React entry point
├── store/
│   └── auth-store.ts         # Zustand auth state (token, user)
├── lib/
│   └── api.ts                # Axios instance + typed API helpers
├── hooks/
│   └── useWebSocket.ts       # WebSocket hook with exponential backoff
├── components/
│   ├── Layout.tsx            # App shell with sidebar navigation
│   ├── ProtectedRoute.tsx    # Auth guard wrapper
│   ├── board/
│   │   ├── BoardColumn.tsx   # Droppable board column
│   │   └── TaskCard.tsx      # Draggable task card
│   └── modals/
│       ├── CreateProjectModal.tsx
│       └── TaskDetailModal.tsx
└── pages/
    ├── Dashboard.tsx         # Overview with recent activity
    ├── Projects.tsx          # Project list
    ├── BoardView.tsx         # Kanban board with drag & drop
    ├── Settings.tsx          # User profile settings
    └── auth/
        ├── Login.tsx
        └── Register.tsx
```
