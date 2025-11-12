// file: components/Navigation.js
'use client'
import { useState, useEffect, useRef, useTransition } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { 
  FaCog,
  FaKey,
  FaSignOutAlt,
  FaChevronRight
} from 'react-icons/fa'
import { TiThLargeOutline } from "react-icons/ti";
import { FiEdit3, FiPlusCircle, FiSidebar, FiFolder  } from "react-icons/fi";
import { useAuthContext } from './AuthProvider'
import { supabaseClient } from '../lib/authClient'
import Image from 'next/image';
import Logo from "/app/assets/logo_no_background.png"

export default function Navigation() {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuthContext()
  const [isPending, startTransition] = useTransition()
  
  const [isExpanded, setIsExpanded] = useState(false)
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

  const navItems = [
    { 
      id: 'home', 
      icon: TiThLargeOutline, 
      label: 'Home', 
      path: '/homepage',
      onClick: () => startTransition(() => router.push('/homepage'))
    },
    { 
      id: 'create', 
      icon: FiPlusCircle, 
      label: 'Create', 
      path: '/create',
      onClick: () => startTransition(() => router.push('/create'))
    },
    { 
      id: 'review', 
      icon: FiEdit3, 
      label: 'Review', 
      path: '/review',
      hasDropdown: true,
      onClick: () => setIsReviewDropdownOpen(!isReviewDropdownOpen)
    },
    { 
      id: 'interviews', 
      icon: FiFolder , 
      label: 'My Interviews', 
      path: '/dashboard',
      onClick: () => startTransition(() => router.push('/dashboard'))
    },
  ]

  return (
    <aside 
      className={`bg-muted/70 flex flex-col transition-all duration-300 ease-out ${
        isExpanded ? 'w-64' : 'w-16'
      }`}
    >
      {/* Logo/Toggle Button */}
      <div className="relative h-16 flex items-center justify-between px-3 group">
        {/* Left: Logo when expanded */}
        {isExpanded ? (
          <div className="flex items-center gap-3 cursor-pointer group/logo"
            onClick={() => setIsExpanded(false)}
          >
            <div className="relative w-8 h-8 flex items-center justify-center rounded-lg transition-all">
              <Image 
              src={Logo}
              className="object-contain relative -translate-y-1" 
              width={30} 
              height={30}
              alt="Toggle sidebar" />
              
            </div>
            <span className="font-bold text-lg text-foreground">Prescrin</span>
          </div>
        ) : (
          <div
            onClick={() => setIsExpanded(true)}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-muted transition-all duration-150 group/logo"
            title="Expand sidebar"
          >
            <FiSidebar className="hidden group-hover/logo:block text-muted-foreground group-hover:text-foreground transition-colors rotate-180 " size={20} />
            <Image 
              src={Logo}
              className="group-hover/logo:hidden text-white object-contain relative -translate-y-1" 
              width={30} 
              height={30}
              alt="Toggle sidebar" />
          </div>
        )}

        {/* Right: Collapse icon when expanded */}
        {isExpanded && (
          <button
            onClick={() => setIsExpanded(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
            title="Collapse sidebar"
          >
            <FiSidebar className="text-muted-foreground group-hover:text-foreground" size={20} />
          </button>
        )}
        
        {/* Tooltip for collapsed state */}
        {!isExpanded && (
          <div className="absolute left-full ml-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
            Toggle sidebar
          </div>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => (
          <div key={item.id} className="relative">
            <button
              onClick={item.onClick}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-150 group relative ${
                isActive(item.path)
                  ? 'bg-primary/10 text-primary' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <item.icon size={20} className="flex-shrink-0" />
              {isExpanded && (
                <span className="font-medium text-sm">{item.label}</span>
              )}
              {isExpanded && item.hasDropdown && (
                <FaChevronRight 
                  size={12} 
                  className={`ml-auto transition-transform ${isReviewDropdownOpen ? 'rotate-90' : ''}`}
                />
              )}
              
              {/* Tooltip for collapsed state */}
              {!isExpanded && (
                <div className="absolute left-full ml-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                  {item.label}
                </div>
              )}
            </button>

            {/* Review Dropdown - appears to the right when collapsed, below when expanded */}
            {item.id === 'review' && isReviewDropdownOpen && (
              <div 
                ref={reviewDropdownRef}
                className={`absolute ${
                  isExpanded 
                    ? 'left-0 top-full mt-1 w-full' 
                    : 'left-full top-0 ml-2 w-80'
                } bg-card border border-border rounded-lg shadow-lg py-2 z-50 animate-fade-in`}
              >
                {loadingReviews ? (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                    Loading interviews...
                  </div>
                ) : pendingReviews.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                    No interviews pending review
                  </div>
                ) : (
                  <>
                    <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Pending Reviews
                    </div>
                    <div className="max-h-64 overflow-y-auto custom-scrollbar">
                      {pendingReviews.map((interview) => (
                        <button
                          key={interview.id}
                          onClick={() => handleReviewClick(interview.id)}
                          className="w-full flex flex-col gap-1 px-4 py-3 text-left hover:bg-muted/50 transition-colors rounded-lg"
                        >
                          <div className="text-sm font-medium text-foreground">
                            {interview.job_title} at {interview.company_name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {interview.pending_count} candidate{interview.pending_count !== 1 ? 's' : ''} pending review
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Account Section at Bottom */}
      <div className="relative p-2 border-t border-border" ref={accountDropdownRef}>
        <button
          onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-150 group relative"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white text-xs font-semibold shadow-sm flex-shrink-0">
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          {isExpanded && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{user?.name || 'Account'}</div>
              <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
            </div>
          )}
          
          {/* Tooltip for collapsed state */}
          {!isExpanded && (
            <div className="absolute left-full ml-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              Account
            </div>
          )}
        </button>

        {/* Account Dropdown - appears to the right when collapsed, above when expanded */}
        {isAccountDropdownOpen && (
          <div 
            className={`absolute ${
              isExpanded 
                ? 'left-0 bottom-full mb-1 w-full' 
                : 'left-full bottom-0 ml-2 w-56'
            } bg-card border border-border rounded-lg shadow-lg py-1 z-50 animate-fade-in`}
          >
            <button
              onClick={handleAccountSettings}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
            >
              <FaCog className="w-4 h-4 text-muted-foreground" />
              <span>Account Settings</span>
            </button>
            
            <button
              onClick={handleChangePassword}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
            >
              <FaKey className="w-4 h-4 text-muted-foreground" />
              <span>Change Password</span>
            </button>
            
            <div className="border-t border-border my-1"></div>
            
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
    </aside>
  )
}