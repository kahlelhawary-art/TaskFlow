import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  FolderKanban,
  CheckSquare,
  Clock,
  TrendingUp,
  Plus,
  Calendar,
  Loader2,
} from 'lucide-react'
import { projectsApi } from '../lib/api'
import { useAuthStore } from '../store/auth-store'
import CreateProjectModal from '../components/modals/CreateProjectModal'

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  loading,
}: {
  icon: React.ElementType
  label: string
  value: number | string
  color: string
  loading?: boolean
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        {loading ? (
          <div className="h-6 w-12 bg-gray-700 rounded animate-pulse mt-0.5" />
        ) : (
          <p className="text-xl font-bold text-white">{value}</p>
        )}
      </div>
    </div>
  )
}

function ProjectCard({ project }: { project: { id: string; name: string; description?: string | null; color: string; created_at: string } }) {
  const date = new Date(project.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <Link
      to={`/projects/${project.id}`}
      className="group bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 hover:bg-gray-800/50 transition-all duration-150 block"
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
          style={{ backgroundColor: project.color }}
        />
        <span className="text-xs text-gray-500 flex items-center gap-1">
          <Calendar size={11} />
          {date}
        </span>
      </div>
      <h3 className="font-semibold text-gray-100 group-hover:text-white transition-colors mb-1.5 line-clamp-1">
        {project.name}
      </h3>
      {project.description && (
        <p className="text-sm text-gray-400 line-clamp-2">{project.description}</p>
      )}
    </Link>
  )
}

export default function Dashboard() {
  const user = useAuthStore((s) => s.user)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const { data: projects, isLoading, refetch } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.getProjects().then((r) => r.data),
  })

  const recentProjects = (projects ?? []).slice(0, 6)
  const totalProjects = projects?.length ?? 0

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Welcome header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">
          Welcome back, {user?.username ?? 'User'} 👋
        </h1>
        <p className="text-gray-400 text-sm">
          Here's an overview of your workspace.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={FolderKanban}
          label="Total Projects"
          value={totalProjects}
          color="bg-indigo-500"
          loading={isLoading}
        />
        <StatCard
          icon={CheckSquare}
          label="Total Tasks"
          value="—"
          color="bg-emerald-500"
          loading={isLoading}
        />
        <StatCard
          icon={TrendingUp}
          label="Completed"
          value="—"
          color="bg-amber-500"
          loading={isLoading}
        />
        <StatCard
          icon={Clock}
          label="Due Today"
          value="—"
          color="bg-rose-500"
          loading={isLoading}
        />
      </div>

      {/* Recent Projects */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Recent Projects</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-colors duration-150"
          >
            <Plus size={15} />
            New Project
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-5 animate-pulse">
                <div className="h-3 w-3 rounded-full bg-gray-700 mb-3" />
                <div className="h-4 w-3/4 bg-gray-700 rounded mb-2" />
                <div className="h-3 w-full bg-gray-700 rounded" />
              </div>
            ))}
          </div>
        ) : recentProjects.length === 0 ? (
          <div className="text-center py-20 bg-gray-900 border border-gray-800 border-dashed rounded-xl">
            <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <FolderKanban size={24} className="text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-200 mb-2">No projects yet</h3>
            <p className="text-gray-400 text-sm mb-5">
              Create your first project to get started.
            </p>
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
            {recentProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}

        {projects && projects.length > 6 && (
          <div className="mt-4 text-center">
            <Link
              to="/projects"
              className="text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors"
            >
              View all {projects.length} projects →
            </Link>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="fixed bottom-6 right-6 bg-gray-800 rounded-full p-3 shadow-lg">
          <Loader2 size={18} className="text-indigo-400 animate-spin" />
        </div>
      )}

      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            refetch()
          }}
        />
      )}
    </div>
  )
}
