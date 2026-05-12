import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Construction } from 'lucide-react'

export default function BoardView() {
  const { id } = useParams()

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <Link
          to="/projects"
          className="inline-flex items-center gap-1.5 text-gray-400 hover:text-gray-200 text-sm transition-colors mb-4"
        >
          <ArrowLeft size={14} />
          Back to Projects
        </Link>
        <h1 className="text-2xl font-bold text-white">Project Board</h1>
        <p className="text-gray-400 text-sm font-mono mt-1">ID: {id}</p>
      </div>

      <div className="flex items-center justify-center py-24 bg-gray-900 border border-gray-800 border-dashed rounded-xl">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
            <Construction size={24} className="text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-200 mb-2">Board View</h3>
          <p className="text-gray-400 text-sm">Kanban board coming soon.</p>
        </div>
      </div>
    </div>
  )
}
