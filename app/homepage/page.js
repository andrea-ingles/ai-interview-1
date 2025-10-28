'use client'
import { useState, useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { FaHome, FaPlus, FaRegEdit, FaList, FaCog, FaKey, FaSignOutAlt, FaNewspaper, FaLightbulb, FaClock, FaArrowRight } from 'react-icons/fa'

import ProtectedRoute from '../../components/ProtectedRoute'
import { useAuthContext } from '../../components/AuthProvider'
import { supabaseClient } from '../../lib/authClient'

function LoggedHomepageContent() {
  const router = useRouter()
  const { user } = useAuthContext()
  const [isPending, startTransition] = useTransition()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
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
    startTransition(() => {
      router.push('/login')
    })
  }

  const handleAccountSettings = () => {
    setIsDropdownOpen(false)
    startTransition(() => {
      router.push('/account-settings')
    })
  }

  const handleChangePassword = () => {
    setIsDropdownOpen(false)
    startTransition(() => {
      router.push('/reset-password')
    })
  }

  const handleLogoutFromDropdown = async () => {
    setIsDropdownOpen(false)
    await handleLogout()
  }

  // Fake news data
  const newsItems = [
    {
      id: 1,
      type: 'news',
      title: 'New AI-Powered Interview Analysis Feature Released',
      description: 'Our latest update includes advanced sentiment analysis and body language detection to provide deeper insights into candidate responses.',
      date: '2 hours ago',
      category: 'Product Update'
    },
    {
      id: 2,
      type: 'insight',
      title: 'Best Practices: Structuring Technical Interview Questions',
      description: 'Learn how top companies are designing interview questions that effectively assess problem-solving skills and technical knowledge.',
      date: '5 hours ago',
      category: 'Industry Insights'
    },
    {
      id: 3,
      type: 'news',
      title: 'Integration with Slack and Microsoft Teams Now Available',
      description: 'Streamline your hiring workflow by receiving real-time notifications and sharing interview results directly in your team channels.',
      date: '1 day ago',
      category: 'Product Update'
    },
    {
      id: 4,
      type: 'insight',
      title: 'How Remote Interviewing is Transforming Talent Acquisition',
      description: 'Discover the latest trends in remote hiring and how AI-assisted interviews are helping companies find the best talent globally.',
      date: '2 days ago',
      category: 'Industry Insights'
    },
    {
      id: 5,
      type: 'news',
      title: 'Prescrin Reaches 10,000+ Successful Interviews Milestone',
      description: 'We\'re thrilled to announce that our platform has facilitated over 10,000 successful interviews for companies worldwide.',
      date: '3 days ago',
      category: 'Company News'
    },
    {
      id: 6,
      type: 'insight',
      title: 'Reducing Bias in AI-Assisted Recruitment',
      description: 'An in-depth look at how our algorithms are designed to promote fair and unbiased candidate evaluation.',
      date: '4 days ago',
      category: 'Industry Insights'
    }
  ]

  return (
    <div className="min-h-screen gradient-bg">
      {/* Header with Navigation */}
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

              <button
                onClick={() => startTransition(() => router.push('/create'))}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
              >
                <FaPlus className="w-4 h-4" />
                <span className="hidden md:inline">Create</span>
              </button>

              <button
                onClick={() => startTransition(() => router.push('/results'))}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
              >
                <FaRegEdit className="w-4 h-4" />
                <span className="hidden md:inline">Review</span>
              </button>

              <button
                onClick={() => startTransition(() => router.push('/dashboard'))}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
              >
                <FaList className="w-4 h-4" />
                <span className="hidden md:inline">My Interviews</span>
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

                {/* Dropdown Menu */}
                {isDropdownOpen && (
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

      {/* Main Content */}
      <div className="py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Welcome Section */}
          <div className="interview-card p-8 glass-effect mb-8 text-center">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Hey there, welcome to your Prescrin newsboard
            </h1>
          </div>

          {/* News and Insights Panel */}
          <div className="interview-card glass-effect overflow-hidden">
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-6 py-4 border-b">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <FaNewspaper className="text-primary" />
                News & Insights
              </h2>
            </div>

            <div className="divide-y divide-gray-100">
              {newsItems.map((item) => (
                <div
                  key={item.id}
                  className="p-6 hover:bg-gray-50/50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`p-3 rounded-lg ${
                      item.type === 'news' 
                        ? 'bg-blue-100 text-blue-600' 
                        : 'bg-purple-100 text-purple-600'
                    }`}>
                      {item.type === 'news' ? (
                        <FaNewspaper className="w-5 h-5" />
                      ) : (
                        <FaLightbulb className="w-5 h-5" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                          {item.title}
                        </h3>
                        <FaArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" />
                      </div>
                      
                      <p className="text-muted-foreground mb-3">
                        {item.description}
                      </p>
                      
                      <div className="flex items-center gap-4 text-sm">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {item.category}
                        </span>
                        <span className="text-muted-foreground flex items-center gap-1">
                          <FaClock className="w-3 h-3" />
                          {item.date}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* View All Link */}
            <div className="bg-gray-50 px-6 py-4 text-center border-t">
              <button className="text-primary font-medium hover:text-primary/80 transition-colors inline-flex items-center gap-2">
                View all news and updates
                <FaArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoggedHomepage() {
  return (
    <ProtectedRoute adminOnly={true}>
      <LoggedHomepageContent />
    </ProtectedRoute>
  )
}