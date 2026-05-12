import { Settings as SettingsIcon } from 'lucide-react'
import { useAuthStore } from '../store/auth-store'

export default function Settings() {
  const user = useAuthStore((s) => s.user)

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <SettingsIcon size={22} className="text-gray-400" />
        <h1 className="text-2xl font-bold text-white">Settings</h1>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-base font-semibold text-white mb-4">Profile</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-3 border-b border-gray-800">
            <span className="text-sm text-gray-400">Username</span>
            <span className="text-sm text-gray-200 font-medium">{user?.username}</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-800">
            <span className="text-sm text-gray-400">Email</span>
            <span className="text-sm text-gray-200 font-medium">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-sm text-gray-400">Member since</span>
            <span className="text-sm text-gray-200 font-medium">
              {user?.created_at
                ? new Date(user.created_at).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })
                : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
