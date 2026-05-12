import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Task } from '../../lib/api'

interface TaskCardProps {
  task: Task
  onClick: (task: Task) => void
  isDragging?: boolean
}

const priorityConfig = {
  low: { label: 'Low', classes: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  medium: { label: 'Medium', classes: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  high: { label: 'High', classes: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  urgent: { label: 'Urgent', classes: 'bg-red-500/15 text-red-400 border-red-500/30' },
}

export default function TaskCard({ task, onClick, isDragging }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id, data: { type: 'task', task } })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const priority = priorityConfig[task.priority] ?? priorityConfig.medium
  const dragging = isDragging || isSortableDragging

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => !dragging && onClick(task)}
      className={`
        group relative rounded-lg border p-3 cursor-grab active:cursor-grabbing
        transition-all duration-150 select-none
        ${dragging
          ? 'opacity-40 border-indigo-500/50 bg-slate-700 shadow-lg scale-[1.02]'
          : 'bg-slate-700/80 border-slate-600/50 hover:bg-slate-700 hover:border-slate-500/70 hover:shadow-md'
        }
      `}
    >
      {/* Priority badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${priority.classes}`}
        >
          {priority.label}
        </span>
      </div>

      {/* Title */}
      <p className="text-sm font-medium text-slate-100 leading-snug line-clamp-2 mb-1">
        {task.title}
      </p>

      {/* Description preview */}
      {task.description && (
        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Labels */}
      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {task.labels.slice(0, 3).map((label) => (
            <span
              key={label}
              className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/20"
            >
              {label}
            </span>
          ))}
          {task.labels.length > 3 && (
            <span className="text-[10px] text-slate-500">+{task.labels.length - 3}</span>
          )}
        </div>
      )}

      {/* Due date */}
      {task.due_date && (
        <div className="mt-2 text-[10px] text-slate-500">
          Due {new Date(task.due_date).toLocaleDateString()}
        </div>
      )}
    </div>
  )
}
