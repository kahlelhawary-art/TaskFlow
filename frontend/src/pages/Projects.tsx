import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Calendar, FolderKanban, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { projectsApi, type Project } from '../lib/api'
import CreateProjectModal from '../components/modals/CreateProjectModal'

function ProjectCard({
  project,
  onDelete,
}: {
  project: Project
  onDelete: (id: string) => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const date = new Date(project.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="group bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-all duration-150">
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
          style={{ backgroundColor: project.color }}
        />
        <button
          onClick={() => {
            if (confirmDelete) {
              onDelete(project.id)
            } else {
              setConfirmDelete(true)
              setTimeout(() => setConfirmDelete(false), 3000)
            }
          }}
          className={`p-1.5 rounded transition-colors text-xs font-medium flex items-center gap-1 ${
            confirmDelete
              ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
              : 'text-gray-600 hover:text-rose-400 opacity-0 group-hover:opacity-100'
          }`}
          title={confirmDelete ? 'Click again to confirm' : 'Delete project'}
        >
          <Trash2 size={13} />
          {confirmDelete && <span>Confirm?</span>}
        </button>
      </div>

      <Link to={`/projects/${project.id}`}>
        <h3 className="font-semibold text-gray-100 hover:text-white transition-colors mb-1.5 line-clamp-1">
          {project.name}
        </h3>
      </Link>

      {project.description && (
        <p className="text-sm text-gray-400 line-clamp-2 mb-3">{project.description}</p>
      )}

      <div className="flex items-center gap-1 text-xs text-gray-500 mt-auto pt-2 border-t border-gray-800">
        <Calendar size={11} />
        <span>{date}</span>
      </div>
    </div>
  )
}

export default function Projects() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const queryClient = useQueryClient()

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.getProjects().then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => projectsApi.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Project deleted')
    },
    onError: () => {
      toast.error('Failed to delete project')
    },
  })

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Projects</h1>
          <p className="text-gray-400 text-sm">
            {projects ? `${projects.length} project${projects.length !== 1 ? 's' : ''}` : 'Loading…'}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} />
          New Project
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="text-indigo-400 animate-spin" />
        </div>
      ) : projects?.length === 0 ? (
        <div className="text-center py-20 bg-gray-900 border border-gray-800 border-dashed rounded-xl">
          <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
            <FolderKanban size={24} className="text-gray-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-200 mb-2">No projects yet</h3>
          <p className="text-gray-400 text-sm mb-5">Get started by creating your first project.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus size={15} />
            Create Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects?.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            queryClient.invalidateQueries({ queryKey: ['projects'] })
          }}
        />
      )}
    </div>
  )
}
