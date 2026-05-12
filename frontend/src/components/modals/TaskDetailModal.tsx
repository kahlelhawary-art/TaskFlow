import { useState, useEffect } from 'react'
import { X, Trash2, Save } from 'lucide-react'
import type { Task } from '../../lib/api'

interface TaskDetailModalProps {
  task: Task | null
  onClose: () => void
  onUpdate: (taskId: string, data: Partial<Task>) => void
  onDelete: (taskId: string) => void
}

const priorityOptions = [
  { value: 'low', label: 'Low', classes: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  { value: 'medium', label: 'Medium', classes: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  { value: 'high', label: 'High', classes: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  { value: 'urgent', label: 'Urgent', classes: 'bg-red-500/15 text-red-400 border-red-500/30' },
]

export default function TaskDetailModal({ task, onClose, onUpdate, onDelete }: TaskDetailModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Task['priority']>('medium')
  const [isDirty, setIsDirty] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description ?? '')
      setPriority(task.priority)
      setIsDirty(false)
      setConfirmDelete(false)
    }
  }, [task])

  if (!task) return null

  const handleSave = () => {
    if (!title.trim()) return
    onUpdate(task.id, {
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
    })
    setIsDirty(false)
  }

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    onDelete(task.id)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-slate-300">Task Details</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Title</label>
            <input
              value={title}
              onChange={(e) => { setTitle(e.target.value); setIsDirty(true) }}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              className="w-full bg-slate-800 text-slate-100 text-sm px-3 py-2.5 rounded-lg border border-slate-700 outline-none focus:border-indigo-500/60 transition-colors placeholder:text-slate-600"
              placeholder="Task title..."
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Description</label>
            <textarea
              value={description}
              onChange={(e) => { setDescription(e.target.value); setIsDirty(true) }}
              rows={3}
              className="w-full bg-slate-800 text-slate-100 text-sm px-3 py-2.5 rounded-lg border border-slate-700 outline-none focus:border-indigo-500/60 transition-colors resize-none placeholder:text-slate-600"
              placeholder="Add a description..."
            />
          </div>

          {/* Priority */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Priority</label>
            <div className="flex gap-2 flex-wrap">
              {priorityOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setPriority(opt.value as Task['priority']); setIsDirty(true) }}
                  className={`
                    px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all
                    ${priority === opt.value
                      ? `${opt.classes} ring-1 ring-offset-1 ring-offset-slate-900 ring-current`
                      : 'bg-slate-800 text-slate-500 border-slate-700 hover:border-slate-600'
                    }
                  `}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Meta info */}
          <div className="flex items-center gap-4 text-xs text-slate-600 pt-1 border-t border-slate-800">
            <span>Created {new Date(task.created_at).toLocaleDateString()}</span>
            {task.due_date && (
              <span>Due {new Date(task.due_date).toLocaleDateString()}</span>
            )}
            {task.labels && task.labels.length > 0 && (
              <span>{task.labels.join(', ')}</span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 bg-slate-900/50">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-400">Confirm delete?</span>
              <button
                onClick={handleDelete}
                className="px-3 py-1.5 text-xs font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                Yes, delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-300 bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-500/10"
            >
              <Trash2 size={13} /> Delete task
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={!isDirty || !title.trim()}
            className={`
              flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-lg transition-all
              ${isDirty && title.trim()
                ? 'bg-indigo-500 hover:bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
              }
            `}
          >
            <Save size={13} /> Save changes
          </button>
        </div>
      </div>
    </div>
  )
}
