'use client'
import { useState, useRef, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { FaHome, FaCog, FaKey, FaSignOutAlt } from 'react-icons/fa'
import { supabaseClient } from '../../lib/authClient'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useAuthContext } from '../../components/AuthProvider'

function ResetPasswordContent() {
  const { user } = useAuthContext()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [email, setEmail] = useState(user?.email || '')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState('')
  const dropdownRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDropdownOpen])

  const handleLogout = async () => {
    await supabaseClient.auth.signOut()
    startTransition(() => router.push('/login'))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Password reset failed')

      setMessage('✅ Password updated successfully.')
      setNewPassword('')
    } catch (error) {
      setMessage(`❌ ${error.message}`)
    }
  }

  return (
    <div className="min-h-screen gradient-bg">
      {/* Header */}
      <nav className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-14">
            {/* Logo */}
            <div className="flex items-center">
              <div className="w-9 h-9 bg-gradient-to-br from-pink-400 to-pink-500 rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-xs">AI</span>
              </div>
            </div>

            {/* Navigation Menu */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => startTransition(() => router.push('/homepage'))}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-900 transition-colors"
              >
                <FaHome className="w-4 h-4" />
                <span className="hidden md:inline">Home</span>
              </button>

              {/* Account Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xs font-semibold shadow-sm">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="hidden lg:inline">{user?.name || 'Account'}</span>
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 animate-slide-down z-50">
                    <button
                      onClick={() => router.push('/account-settings')}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <FaCog className="w-4 h-4 text-gray-500" />
                      <span>Account Settings</span>
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <FaSignOutAlt className="w-4 h-4" />
                      <span>Log out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="py-12 px-4">
        <div className="max-w-md mx-auto interview-card glass-effect p-8">
          <h1 className="text-2xl font-bold text-center mb-6">Reset Your Password</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-primary/30"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-primary/30"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-gradient-to-r from-pink-500 to-indigo-500 text-white py-2 rounded-lg font-semibold hover:opacity-90 transition"
            >
              {isPending ? 'Updating...' : 'Reset Password'}
            </button>
          </form>

          {message && (
            <p className="text-center text-sm mt-4 text-gray-700">{message}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <ProtectedRoute adminOnly={true}>
      <ResetPasswordContent />
    </ProtectedRoute>
  )
}
