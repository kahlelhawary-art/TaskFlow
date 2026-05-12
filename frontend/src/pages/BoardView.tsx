import { useState, useCallback, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, Loader2, Kanban } from 'lucide-react'

import { projectsApi, boardsApi, tasksApi, type Task } from '../lib/api'
import BoardColumn from '../components/board/BoardColumn'
import TaskCard from '../components/board/TaskCard'
import TaskDetailModal from '../components/modals/TaskDetailModal'
import { useWebSocket } from '../hooks/useWebSocket'

export default function BoardView() {
  const { id: projectId } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showAddBoard, setShowAddBoard] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')
  const [localTaskMap, setLocalTaskMap] = useState<Record<string, Task[]> | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  // ── WebSocket ─────────────────────────────────────────────────────────────
  const { isConnected, lastMessage } = useWebSocket(projectId)

  useEffect(() => {
    if (!lastMessage) return
    const { event } = lastMessage

    if (event === 'board_created' || event === 'board_updated' || event === 'board_deleted') {
      queryClient.invalidateQueries({ queryKey: ['boards', projectId] })
    } else if (
      event === 'task_created' ||
      event === 'task_updated' ||
      event === 'task_deleted' ||
      event === 'task_moved'
    ) {
      // Invalidate tasks for this project (board ids may vary, so invalidate broadly)
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    }
  }, [lastMessage, projectId, queryClient])

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const res = await projectsApi.getProjects()
      return res.data.find((p) => p.id === projectId) ?? null
    },
    enabled: !!projectId,
  })

  const { data: boards = [], isLoading: boardsLoading } = useQuery({
    queryKey: ['boards', projectId],
    queryFn: async () => {
      const res = await projectsApi.getProjectBoards(projectId!)
      return res.data.sort((a, b) => a.position - b.position)
    },
    enabled: !!projectId,
  })

  const boardIds = boards.map((b) => b.id)

  const { data: tasksByBoard = {}, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', ...boardIds],
    queryFn: async () => {
      if (boardIds.length === 0) return {}
      const results = await Promise.all(
        boardIds.map((id) => boardsApi.getBoardTasks(id).then((r) => ({ id, tasks: r.data })))
      )
      const map: Record<string, Task[]> = {}
      for (const { id, tasks } of results) {
        map[id] = tasks.sort((a, b) => a.position - b.position)
      }
      return map
    },
    enabled: boardIds.length > 0,
  })

  const effectiveTaskMap = localTaskMap ?? tasksByBoard

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createBoardMutation = useMutation({
    mutationFn: (name: string) =>
      boardsApi.createBoard({ name, project_id: projectId!, position: boards.length }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards', projectId] })
      toast.success('Board created')
    },
    onError: () => toast.error('Failed to create board'),
  })

  const deleteBoardMutation = useMutation({
    mutationFn: (boardId: string) => boardsApi.deleteBoard(boardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards', projectId] })
      toast.success('Board deleted')
    },
    onError: () => toast.error('Failed to delete board'),
  })

  const renameBoardMutation = useMutation({
    mutationFn: ({ boardId, name }: { boardId: string; name: string }) =>
      boardsApi.updateBoard(boardId, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards', projectId] })
    },
    onError: () => toast.error('Failed to rename board'),
  })

  const createTaskMutation = useMutation({
    mutationFn: ({ boardId, title }: { boardId: string; title: string }) =>
      tasksApi.createTask({
        title,
        board_id: boardId,
        priority: 'medium',
        position: effectiveTaskMap[boardId]?.length ?? 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', ...boardIds] })
      toast.success('Task created')
    },
    onError: () => toast.error('Failed to create task'),
  })

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: Partial<Task> }) =>
      tasksApi.updateTask(taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', ...boardIds] })
      toast.success('Task updated')
    },
    onError: () => toast.error('Failed to update task'),
  })

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => tasksApi.deleteTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', ...boardIds] })
      toast.success('Task deleted')
    },
    onError: () => toast.error('Failed to delete task'),
  })

  const moveTaskMutation = useMutation({
    mutationFn: ({ taskId, boardId, position }: { taskId: string; boardId: string; position: number }) =>
      tasksApi.moveTask(taskId, boardId, position),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', ...boardIds] })
    },
    onError: () => {
      setLocalTaskMap(null)
      toast.error('Failed to move task')
    },
  })

  const reorderTasksMutation = useMutation({
    mutationFn: ({ taskIds, boardId }: { taskIds: string[]; boardId: string }) =>
      tasksApi.reorderTasks(taskIds, boardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', ...boardIds] })
    },
    onError: () => {
      setLocalTaskMap(null)
      toast.error('Failed to reorder tasks')
    },
  })

  // ── DnD helpers ──────────────────────────────────────────────────────────
  const findBoardOfTask = useCallback(
    (taskId: string, map: Record<string, Task[]>) =>
      Object.keys(map).find((bId) => map[bId].some((t) => t.id === taskId)),
    []
  )

  const handleDragStart = (event: DragStartEvent) => {
    if (event.active.data.current?.type === 'task') {
      setActiveTask(event.active.data.current.task as Task)
      setLocalTaskMap({ ...tasksByBoard })
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over || !localTaskMap) return

    const activeId = active.id as string
    const overId = over.id as string

    const sourceBoardId = findBoardOfTask(activeId, localTaskMap)
    if (!sourceBoardId) return

    const targetBoardId =
      localTaskMap[overId] !== undefined
        ? overId
        : findBoardOfTask(overId, localTaskMap)

    if (!targetBoardId || sourceBoardId === targetBoardId) return

    setLocalTaskMap((prev) => {
      if (!prev) return prev
      const sourceList = [...(prev[sourceBoardId] ?? [])]
      const targetList = [...(prev[targetBoardId] ?? [])]
      const taskIdx = sourceList.findIndex((t) => t.id === activeId)
      if (taskIdx === -1) return prev
      const [task] = sourceList.splice(taskIdx, 1)
      const overIdx = targetList.findIndex((t) => t.id === overId)
      if (overIdx === -1) {
        targetList.push({ ...task, board_id: targetBoardId })
      } else {
        targetList.splice(overIdx + 1, 0, { ...task, board_id: targetBoardId })
      }
      return { ...prev, [sourceBoardId]: sourceList, [targetBoardId]: targetList }
    })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over || !localTaskMap) {
      setLocalTaskMap(null)
      return
    }

    const activeId = active.id as string

    const sourceBoardId = findBoardOfTask(activeId, tasksByBoard)
    const targetBoardId = findBoardOfTask(activeId, localTaskMap)

    if (!sourceBoardId || !targetBoardId) {
      setLocalTaskMap(null)
      return
    }

    if (sourceBoardId !== targetBoardId) {
      const targetList = localTaskMap[targetBoardId] ?? []
      const position = targetList.findIndex((t) => t.id === activeId)
      moveTaskMutation.mutate({ taskId: activeId, boardId: targetBoardId, position: Math.max(position, 0) })
    } else {
      const currentList = localTaskMap[sourceBoardId] ?? []
      const oldList = tasksByBoard[sourceBoardId] ?? []
      const oldIdx = oldList.findIndex((t) => t.id === activeId)
      const newIdx = currentList.findIndex((t) => t.id === activeId)
      if (oldIdx !== newIdx) {
        const reordered = arrayMove(currentList, oldIdx, newIdx)
        setLocalTaskMap((prev) => prev ? { ...prev, [sourceBoardId]: reordered } : prev)
        reorderTasksMutation.mutate({
          taskIds: reordered.map((t) => t.id),
          boardId: sourceBoardId,
        })
        return
      }
    }

    setLocalTaskMap(null)
  }

  const handleAddBoard = () => {
    const name = newBoardName.trim()
    if (!name) return
    createBoardMutation.mutate(name)
    setNewBoardName('')
    setShowAddBoard(false)
  }

  const isLoading = boardsLoading || tasksLoading

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* Page header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800 flex-shrink-0">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: (project?.color ?? '#6366f1') + '20' }}
        >
          <Kanban size={16} style={{ color: project?.color ?? '#6366f1' }} />
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold text-slate-100">
            {project?.name ?? 'Loading...'}
          </h1>
          {/* Connection status indicator */}
          <div
            className="relative flex items-center"
            title={isConnected ? 'Live: Connected' : 'Reconnecting...'}
          >
            {isConnected ? (
              <>
                {/* Outer pulse ring */}
                <span className="absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75 animate-ping" />
                {/* Inner solid dot */}
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </>
            ) : (
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            )}
          </div>
          {!isConnected && (
            <span className="text-xs text-red-400 leading-none">Reconnecting...</span>
          )}
        </div>
        {project?.description && (
          <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">{project.description}</p>
        )}
        <div className="ml-auto text-xs text-slate-600">
          {boards.length} boards &middot; {Object.values(effectiveTaskMap).flat().length} tasks
        </div>
      </div>

      {/* Board area */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={28} className="animate-spin text-slate-600" />
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex-1 overflow-x-auto overflow-y-hidden">
            <div className="flex gap-4 p-6 h-full min-w-max">
              {boards.map((board) => (
                <BoardColumn
                  key={board.id}
                  board={board}
                  tasks={effectiveTaskMap[board.id] ?? []}
                  onTaskClick={(task) => setSelectedTask(task)}
                  onAddTask={(boardId, title) => createTaskMutation.mutate({ boardId, title })}
                  onDeleteBoard={(boardId) => deleteBoardMutation.mutate(boardId)}
                  onRenameBoard={(boardId, name) => renameBoardMutation.mutate({ boardId, name })}
                />
              ))}

              {/* Add board */}
              <div className="w-72 flex-shrink-0">
                {showAddBoard ? (
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 space-y-2">
                    <input
                      autoFocus
                      value={newBoardName}
                      onChange={(e) => setNewBoardName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddBoard()
                        if (e.key === 'Escape') { setShowAddBoard(false); setNewBoardName('') }
                      }}
                      placeholder="Board name..."
                      className="w-full bg-slate-700 text-sm text-slate-100 placeholder:text-slate-500 px-3 py-2 rounded-lg border border-slate-600 outline-none focus:border-indigo-500/70 transition-colors"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddBoard}
                        disabled={createBoardMutation.isPending}
                        className="flex-1 py-1.5 text-xs font-medium rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white transition-colors disabled:opacity-50"
                      >
                        Add Board
                      </button>
                      <button
                        onClick={() => { setShowAddBoard(false); setNewBoardName('') }}
                        className="px-3 py-1.5 text-xs rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-400 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddBoard(true)}
                    className="flex items-center justify-center gap-2 w-full h-14 rounded-xl border border-dashed border-slate-700 text-slate-600 hover:text-slate-400 hover:border-slate-600 hover:bg-slate-800/30 transition-all text-sm"
                  >
                    <Plus size={16} /> Add Board
                  </button>
                )}
              </div>
            </div>
          </div>

          <DragOverlay>
            {activeTask && (
              <div className="rotate-2 opacity-90">
                <TaskCard task={activeTask} onClick={() => {}} isDragging />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      <TaskDetailModal
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdate={(taskId, data) => {
          updateTaskMutation.mutate({ taskId, data })
          setSelectedTask(null)
        }}
        onDelete={(taskId) => {
          deleteTaskMutation.mutate(taskId)
          setSelectedTask(null)
        }}
      />
    </div>
  )
}
