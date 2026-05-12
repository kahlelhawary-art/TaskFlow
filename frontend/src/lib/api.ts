import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor — attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor — handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ── Types ──────────────────────────────────────────────────────────────────
export interface User {
  id: string
  email: string
  username: string
  avatar_url?: string | null
  created_at: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  user: User
}

export interface Project {
  id: string
  name: string
  description?: string | null
  color: string
  owner_id: string
  created_at: string
}

export interface Board {
  id: string
  name: string
  project_id: string
  position: number
  created_at: string
}

export interface Task {
  id: string
  title: string
  description?: string | null
  board_id: string
  assignee_id?: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date?: string | null
  position: number
  labels?: string[] | null
  attachments?: Record<string, unknown>[] | null
  created_at: string
  updated_at: string
}

// ── Auth ───────────────────────────────────────────────────────────────────
export const authApi = {
  register: (email: string, username: string, password: string) =>
    api.post<TokenResponse>('/auth/register', { email, username, password }),

  login: (email: string, password: string) =>
    api.post<TokenResponse>('/auth/login', { email, password }),

  getMe: () => api.get<User>('/auth/me'),

  updateMe: (data: { username?: string; avatar_url?: string }) =>
    api.put<User>('/auth/me', data),
}

// ── Projects ───────────────────────────────────────────────────────────────
export const projectsApi = {
  getProjects: () => api.get<Project[]>('/projects'),

  createProject: (data: { name: string; description?: string; color?: string }) =>
    api.post<Project>('/projects', data),

  updateProject: (id: string, data: { name?: string; description?: string; color?: string }) =>
    api.put<Project>(`/projects/${id}`, data),

  deleteProject: (id: string) => api.delete(`/projects/${id}`),

  getProjectBoards: (id: string) => api.get<Board[]>(`/projects/${id}/boards`),
}

// ── Boards ─────────────────────────────────────────────────────────────────
export const boardsApi = {
  createBoard: (data: { name: string; project_id: string; position?: number }) =>
    api.post<Board>('/boards', data),

  updateBoard: (id: string, data: { name?: string; position?: number }) =>
    api.put<Board>(`/boards/${id}`, data),

  deleteBoard: (id: string) => api.delete(`/boards/${id}`),

  getBoardTasks: (id: string) => api.get<Task[]>(`/boards/${id}/tasks`),

  reorderBoards: (board_ids: string[]) =>
    api.put<Board[]>('/boards/reorder', { board_ids }),
}

// ── Tasks ──────────────────────────────────────────────────────────────────
export const tasksApi = {
  createTask: (data: {
    title: string
    board_id: string
    description?: string
    priority?: string
    due_date?: string
    position?: number
    labels?: string[]
  }) => api.post<Task>('/tasks', data),

  updateTask: (id: string, data: Partial<Task>) =>
    api.put<Task>(`/tasks/${id}`, data),

  deleteTask: (id: string) => api.delete(`/tasks/${id}`),

  moveTask: (id: string, board_id: string, position: number) =>
    api.put<Task>(`/tasks/${id}/move`, { board_id, position }),

  reorderTasks: (task_ids: string[], board_id: string) =>
    api.put<Task[]>('/tasks/reorder', { task_ids, board_id }),
}

export default api
