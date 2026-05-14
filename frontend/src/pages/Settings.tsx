import { useRef, useState, useCallback } from 'react'
import { Camera, MapPin, Phone, FileText, User as UserIcon, Mail, Check, AlertCircle, Loader2 } from 'lucide-react'
import { useAuthStore } from '../store/auth-store'
import { authApi } from '../lib/api'

// ── Toast ──────────────────────────────────────────────────────────────────
type ToastType = 'success' | 'error'

interface ToastState {
  visible: boolean
  type: ToastType
  message: string
}

// ── Avatar component ───────────────────────────────────────────────────────
interface AvatarProps {
  src?: string | null
  name: string
  size?: number
  uploading?: boolean
  onClick?: () => void
}

function Avatar({ src, name, size = 120, uploading = false, onClick }: AvatarProps) {
  const initials = name ? name.charAt(0).toUpperCase() : '?'

  return (
    <div
      className="relative inline-block cursor-pointer group"
      style={{ width: size, height: size }}
      onClick={onClick}
      title="Change avatar"
    >
      {src ? (
        <img
          src={src}
          alt={name}
          className="w-full h-full rounded-full object-cover ring-4 ring-slate-700"
          style={{ width: size, height: size }}
        />
      ) : (
        <div
          className="w-full h-full rounded-full ring-4 ring-slate-700 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold select-none"
          style={{ width: size, height: size, fontSize: size * 0.36 }}
        >
          {initials}
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {uploading ? (
          <Loader2 size={28} className="text-white animate-spin" />
        ) : (
          <Camera size={28} className="text-white" />
        )}
      </div>
    </div>
  )
}

// ── Main Settings Page ─────────────────────────────────────────────────────
export default function Settings() {
  const { user, updateUser } = useAuthStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)

  const [form, setForm] = useState({
    full_name: user?.full_name ?? '',
    username: user?.username ?? '',
    email: user?.email ?? '',
    bio: user?.bio ?? '',
    phone: user?.phone ?? '',
    location: user?.location ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<ToastState>({ visible: false, type: 'success', message: '' })

  const showToast = useCallback((type: ToastType, message: string) => {
    setToast({ visible: true, type, message })
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3500)
  }, [])

  // ── File picker ────────────────────────────────────────────────────────
  const handleAvatarClick = () => fileInputRef.current?.click()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      showToast('error', 'Only JPG, PNG, or WebP images are allowed.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('error', 'Image must be smaller than 2MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
    setPendingFile(file)
    // Reset input so same file can be re-selected
    e.target.value = ''
  }

  const handleUploadAvatar = async () => {
    if (!pendingFile) return
    setAvatarUploading(true)
    try {
      const res = await authApi.uploadAvatar(pendingFile)
      updateUser(res.data)
      setAvatarPreview(null)
      setPendingFile(null)
      showToast('success', 'Avatar updated successfully!')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Failed to upload avatar.'
      showToast('error', msg)
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleCancelAvatar = () => {
    setAvatarPreview(null)
    setPendingFile(null)
  }

  // ── Form ───────────────────────────────────────────────────────────────
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        username: form.username || undefined,
        email: form.email || undefined,
        full_name: form.full_name || undefined,
        bio: form.bio || undefined,
        phone: form.phone || undefined,
        location: form.location || undefined,
      }
      const res = await authApi.updateMe(payload)
      updateUser(res.data)
      showToast('success', 'Profile saved successfully!')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Failed to save profile.'
      showToast('error', msg)
    } finally {
      setSaving(false)
    }
  }

  const displayAvatar = avatarPreview ?? user?.avatar_url

  return (
    <div className="min-h-screen bg-gray-950 pb-16">
      {/* Toast */}
      {toast.visible && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium transition-all duration-300 ${
            toast.type === 'success'
              ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
              : 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
          }`}
        >
          {toast.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}

      {/* Hero / Cover */}
      <div className="relative h-40 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-800">
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Avatar + Name row */}
      <div className="max-w-2xl mx-auto px-4">
        <div className="relative -mt-16 flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6 pb-4 border-b border-slate-800">
          <div className="flex-shrink-0">
            <Avatar
              src={displayAvatar}
              name={user?.username ?? '?'}
              size={120}
              uploading={avatarUploading}
              onClick={handleAvatarClick}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <div className="flex-1 pb-1">
            <h1 className="text-xl font-bold text-white leading-tight">
              {user?.full_name || user?.username || 'Your Name'}
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">{user?.email}</p>
            {user?.bio && (
              <p className="text-sm text-slate-400 mt-1 line-clamp-2">{user.bio}</p>
            )}
          </div>
        </div>

        {/* Avatar pending upload bar */}
        {pendingFile && (
          <div className="mt-4 flex items-center gap-3 px-4 py-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl">
            <img
              src={avatarPreview ?? ''}
              alt="preview"
              className="w-10 h-10 rounded-full object-cover"
            />
            <span className="flex-1 text-sm text-slate-300">New avatar selected — upload it?</span>
            <button
              onClick={handleUploadAvatar}
              disabled={avatarUploading}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
            >
              {avatarUploading && <Loader2 size={12} className="animate-spin" />}
              Upload
            </button>
            <button
              onClick={handleCancelAvatar}
              disabled={avatarUploading}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 text-xs font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Profile Form */}
        <form onSubmit={handleSave} className="mt-6 space-y-5">
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6">
            <h2 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
              <UserIcon size={16} className="text-indigo-400" />
              Personal Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">
                  Full Name
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={form.full_name}
                  onChange={handleChange}
                  placeholder="Your full name"
                  className="w-full px-3 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition-colors"
                />
              </div>

              {/* Username */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">
                  Username
                </label>
                <input
                  type="text"
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  placeholder="username"
                  className="w-full px-3 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition-colors"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                  <Mail size={12} />
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition-colors"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                  <Phone size={12} />
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="+1 234 567 890"
                  className="w-full px-3 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition-colors"
                />
              </div>

              {/* Location */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                  <MapPin size={12} />
                  Location
                </label>
                <input
                  type="text"
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  placeholder="City, Country"
                  className="w-full px-3 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition-colors"
                />
              </div>

              {/* Bio */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                  <FileText size={12} />
                  Bio
                </label>
                <textarea
                  name="bio"
                  value={form.bio}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Tell us a little about yourself..."
                  className="w-full px-3 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition-colors resize-none"
                />
              </div>
            </div>
          </div>

          {/* Account info (read-only) */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6">
            <h2 className="text-base font-semibold text-white mb-4">Account Details</h2>
            <div className="space-y-0">
              <div className="flex items-center justify-between py-3 border-b border-slate-700/60">
                <span className="text-sm text-slate-400">Member since</span>
                <span className="text-sm text-slate-200 font-medium">
                  {user?.created_at
                    ? new Date(user.created_at).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-slate-400">User ID</span>
                <span className="text-xs text-slate-500 font-mono">{user?.id ?? '—'}</span>
              </div>
            </div>
          </div>

          {/* Save button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-indigo-500/20"
            >
              {saving && <Loader2 size={15} className="animate-spin" />}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
