import { useState, useRef, useEffect } from 'react'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { Plus, MoreVertical, Trash2, Pencil, Check, X } from 'lucide-react'
import type { Board, Task } from '../../lib/api'
import TaskCard from './TaskCard'

interface BoardColumnProps {
  board: Board
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onAddTask: (boardId: string, title: string) => void
  onDeleteBoard: (boardId: string) => void
  onRenameBoard: (boardId: string, name: string) => void
}

export default function BoardColumn({
  board,
  tasks,
  onTaskClick,
  onAddTask,
  onDeleteBoard,
  onRenameBoard,
}: BoardColumnProps) {
  const [showAddInput, setShowAddInput] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [showMenu, setShowMenu] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(board.name)
  const inputRef = useRef<HTMLInputElement>(null)
  const renameRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const { setNodeRef, isOver } = useDroppable({
    id: board.id,
    data: { type: 'board', board },
  })

  useEffect(() => {
    if (showAddInput) inputRef.current?.focus()
  }, [showAddInput])

  useEffect(() => {
    if (isRenaming) renameRef.current?.focus()
  }, [isRenaming])

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleAddTask = () => {
    const title = newTaskTitle.trim()
    if (!title) return
    onAddTask(board.id, title)
    setNewTaskTitle('')
    setShowAddInput(false)
  }

  const handleRename = () => {
    const name = renameValue.trim()
    if (name && name !== board.name) {
      onRenameBoard(board.id, name)
    }
    setIsRenaming(false)
    setShowMenu(false)
  }

  return (
    <div
      className={`
        flex flex-col w-72 flex-shrink-0 rounded-xl border
        transition-colors duration-150
        ${isOver
          ? 'border-indigo-500/50 bg-slate-800/80'
          : 'border-slate-700/50 bg-slate-800/50'
        }
      `}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        {isRenaming ? (
          <div className="flex items-center gap-1 flex-1">
            <input
              ref={renameRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename()
                if (e.key === 'Escape') { setIsRenaming(false); setRenameValue(board.name) }
              }}
              className="flex-1 bg-slate-700 text-slate-100 text-sm font-semibold px-2 py-0.5 rounded border border-indigo-500/50 outline-none"
            />
            <button onClick={handleRename} className="text-emerald-400 hover:text-emerald-300 p-0.5">
              <Check size={14} />
            </button>
            <button onClick={() => { setIsRenaming(false); setRenameValue(board.name) }} className="text-slate-400 hover:text-slate-300 p-0.5">
              <X size={14} />
            </button>
          </div>
        ) : (
          <>
            <h3 className="flex-1 text-sm font-semibold text-slate-200 truncate">{board.name}</h3>
            <span className="text-xs text-slate-500 bg-slate-700/60 px-1.5 py-0.5 rounded-full font-medium">
              {tasks.length}
            </span>
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu((v) => !v)}
                className="text-slate-500 hover:text-slate-300 p-1 rounded transition-colors"
              >
                <MoreVertical size={14} />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-7 z-20 w-40 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden">
                  <button
                    onClick={() => { setIsRenaming(true); setShowMenu(false) }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 transition-colors"
                  >
                    <Pencil size={12} /> Rename
                  </button>
                  <button
                    onClick={() => { onDeleteBoard(board.id); setShowMenu(false) }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-400 hover:bg-slate-700 transition-colors"
                  >
                    <Trash2 size={12} /> Delete Board
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Tasks list */}
      <div
        ref={setNodeRef}
        className="flex-1 px-3 pb-2 overflow-y-auto max-h-[calc(100vh-260px)] space-y-2 min-h-[48px]"
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={onTaskClick} />
          ))}
        </SortableContext>

        {/* Empty state */}
        {tasks.length === 0 && !isOver && (
          <div className="flex items-center justify-center h-10 text-xs text-slate-600 rounded-lg border border-dashed border-slate-700">
            Drop tasks here
          </div>
        )}
      </div>

      {/* Add task section */}
      <div className="px-3 pb-3">
        {showAddInput ? (
          <div className="space-y-2">
            <input
              ref={inputRef}
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddTask()
                if (e.key === 'Escape') { setShowAddInput(false); setNewTaskTitle('') }
              }}
              placeholder="Task title..."
              className="w-full bg-slate-700 text-sm text-slate-100 placeholder:text-slate-500 px-3 py-2 rounded-lg border border-slate-600 outline-none focus:border-indigo-500/70 transition-colors"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddTask}
                className="flex-1 py-1.5 text-xs font-medium rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white transition-colors"
              >
                Add Task
              </button>
              <button
                onClick={() => { setShowAddInput(false); setNewTaskTitle('') }}
                className="px-3 py-1.5 text-xs rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddInput(true)}
            className="flex items-center gap-1.5 w-full px-2 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-700/60 transition-colors"
          >
            <Plus size={13} /> Add task
          </button>
        )}
      </div>
    </div>
  )
}
