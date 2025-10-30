// file: components/Navigation.js
'use client'
import { useState, useEffect, useRef, useTransition } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { FaHome, FaPlus, FaRegEdit, FaList, FaCog, FaKey, FaSignOutAlt, FaChevronDown } from 'react-icons/fa'
import { useAuthContext } from './AuthProvider'
import { supabaseClient } from '../lib/authClient'

export default function Navigation() {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuthContext()
  const [isPending, startTransition] = useTransition()
  
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false)
  const [isReviewDropdownOpen, setIsReviewDropdownOpen] = useState(false)
  const [pendingReviews, setPendingReviews] = useState([])
  const [loadingReviews, setLoadingReviews] = useState(false)
  
  const accountDropdownRef = useRef(null)
  const reviewDropdownRef = useRef(null)

  // Fetch pending reviews when Review dropdown is opened
  useEffect(() => {
    if (isReviewDropdownOpen && pendingReviews.length === 0) {
      fetchPendingReviews()
    }
  }, [isReviewDropdownOpen])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(event.target)) {
        setIsAccountDropdownOpen(false)
      }
      if (reviewDropdownRef.current && !reviewDropdownRef.current.contains(event.target)) {
        setIsReviewDropdownOpen(false)
      }
    }

    if (isAccountDropdownOpen || isReviewDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isAccountDropdownOpen, isReviewDropdownOpen])

  const fetchPendingReviews = async () => {
    try {
      setLoadingReviews(true)
      const { data: { session } } = await supabaseClient.auth.getSession()

      const response = await fetch('/api/admin/pending-reviews', {
        headers: {
          'authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setPendingReviews(data.interviews || [])
      } else {
        console.error('Error fetching pending reviews')
      }
    } catch (error) {
      console.error('Error fetching pending reviews:', error)
    } finally {
      setLoadingReviews(false)
    }
  }

  const handleLogout = async () => {
    await supabaseClient.auth.signOut()
    startTransition(() => {
      router.push('/login')
    })
  }

  const handleAccountSettings = () => {
    setIsAccountDropdownOpen(false)
    startTransition(() => {
      router.push('/account-settings')
    })
  }

  const handleChangePassword = () => {
    setIsAccountDropdownOpen(false)
    startTransition(() => {
      router.push('/reset-password')
    })
  }

  const handleLogoutFromDropdown = async () => {
    setIsAccountDropdownOpen(false)
    await handleLogout()
  }

  const handleReviewClick = (interviewId) => {
    setIsReviewDropdownOpen(false)
    startTransition(() => {
      router.push(`/review?interview_id=${interviewId}`)
    })
  }

  const isActive = (path) => pathname === path

  return (
    <nav className="bg-white border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-14">
          {/* Logo */}
          <div className="flex items-center">
            <div className="w-9 h-9 bg-gradient-to-br from-pink-400 to-pink-500 rounded-lg flex items-center justify-center shadow-sm cursor-pointer"
                 onClick={() => startTransition(() => router.push('/homepage'))}>
              <span className="text-white font-bold text-xs">AI</span>
            </div>
          </div>

          {/* Navigation Menu */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => startTransition(() => router.push('/homepage'))}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/homepage')
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <FaHome className="w-4 h-4" />
              <span className="hidden md:inline">Home</span>
            </button>

            <button
              onClick={() => startTransition(() => router.push('/create'))}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/create')
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <FaPlus className="w-4 h-4" />
              <span className="hidden md:inline">Create</span>
            </button>

            {/* Review Dropdown */}
            <div className="relative" ref={reviewDropdownRef}>
              <button
                onClick={() => setIsReviewDropdownOpen(!isReviewDropdownOpen)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/review')
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <FaRegEdit className="w-4 h-4" />
                <span className="hidden md:inline">Review</span>
                <FaChevronDown className={`w-3 h-3 transition-transform ${isReviewDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Review Dropdown Menu */}
              {isReviewDropdownOpen && (
                <div className="absolute left-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2 animate-slide-down z-50">
                  {loadingReviews ? (
                    <div className="px-4 py-6 text-center text-sm text-gray-500">
                      Loading interviews...
                    </div>
                  ) : pendingReviews.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-gray-500">
                      No interviews pending review
                    </div>
                  ) : (
                    <>
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Pending Reviews
                      </div>
                      {pendingReviews.map((interview) => (
                        <button
                          key={interview.id}
                          onClick={() => handleReviewClick(interview.id)}
                          className="w-full flex flex-col gap-1 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                        >
                          <div className="text-sm font-medium text-gray-900">
                            {interview.job_title} at {interview.company_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {interview.pending_count} candidate{interview.pending_count !== 1 ? 's' : ''} pending review
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => startTransition(() => router.push('/dashboard'))}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/dashboard')
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <FaList className="w-4 h-4" />
              <span className="hidden md:inline">My Interviews</span>
            </button>

            {/* Account Dropdown */}
            <div className="relative" ref={accountDropdownRef}>
              <button
                onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xs font-semibold shadow-sm">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="hidden lg:inline">{user?.name || 'Account'}</span>
              </button>

              {/* Account Dropdown Menu */}
              {isAccountDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 animate-slide-down z-50">
                  <button
                    onClick={handleAccountSettings}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <FaCog className="w-4 h-4 text-gray-500" />
                    <span>Account Settings</span>
                  </button>
                  
                  <button
                    onClick={handleChangePassword}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <FaKey className="w-4 h-4 text-gray-500" />
                    <span>Change Password</span>
                  </button>
                  
                  <div className="border-t border-gray-100 my-1"></div>
                  
                  <button
                    onClick={handleLogoutFromDropdown}
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
  )
}