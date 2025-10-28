'use client'
import { useState, useEffect, useTransition, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { FaArrowLeft, FaVideo, FaComment, FaFileAlt, FaClock, FaCheckCircle, FaUser, FaBrain, FaInbox, FaPlus, FaRegEdit, FaList, FaCog, FaKey, FaSignOutAlt } from 'react-icons/fa'

import ProtectedRoute from '../../../components/ProtectedRoute'
import { useAuthContext } from '../../../components/AuthProvider'
import { supabaseClient } from '../../../lib/authClient'


function ResultsPageContent() {
  const router = useRouter()
  const params = useParams()
  /** @type {string} */
  const sessionId = params.sessionId
  const { user } = useAuthContext()
  const [loading, setLoading] = useState(true)
  const [interview, setInterview] = useState(null)
  const [isPending, startTransition] = useTransition();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (sessionId) {
      fetchInterviewDetails()
    }
  }, [sessionId])

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

  const fetchInterviewDetails = async () => {
    try {
      // This would fetch specific interview details
      const { data: { session } } = await supabaseClient.auth.getSession()
      const response = await fetch(`/api/admin/interview/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setInterview(data)
      } else {
        const errorData = await response.json()
        console.error('Error fetching results:', errorData)
      }
    } catch (error) {
      console.error('Error fetching interview details:', error)
    } finally {
      setLoading(false)
    }
  }

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


  if (loading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="interview-card p-8 glass-effect text-center">
          <div className="loading-spinner h-12 w-12 mx-auto mb-4"></div>
          <p className="text-muted-foreground font-medium">Loading interview details...</p>
        </div>
      </div>
    )
  }

  if (!interview) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="interview-card p-8 glass-effect text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Interview Not Found</h2>
          <p className="text-muted-foreground mb-6">This interview may not exist or has been removed.</p>
          <button
            onClick={() => startTransition(() => {router.push('/results')})}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Back to Results
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen gradient-bg">
      {/* Lean Header with Navigation */} 
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
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
              >
                <FaInbox className="w-4 h-4" />
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
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-900 transition-colors"
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


      {/* Old Header
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-semibold text-gray-800">Interview Results</h1>
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-gray-600">
                <FaUser className="w-4 h-4 mr-2" />
                <span className="text-sm">{user?.email}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>*/}

      {/* Rest of my existing results page content */}
      <div className="py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="interview-card p-8 glass-effect mb-8">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => startTransition(() => {router.push('/results')})}
                className="inline-flex items-center px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors"
              >
                <FaArrowLeft className="mr-2" size={16} />
                Back to Results
              </button>
              
              <div className="text-sm text-muted-foreground">
                Interview ID: {sessionId}
              </div>
            </div>

            <div className="text-center">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {interview.job_title}
              </h1>
              <p className="text-xl text-muted-foreground mb-6">
                at {interview.company_name}
              </p>
            </div>
          </div>

          {/* Status Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="interview-card p-6 glass-effect">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <FaVideo className="text-blue-600" size={24} />
                </div>
                <div className="ml-4">
                  <h3 className="font-semibold text-foreground">Interview</h3>
                  <p className="text-sm text-muted-foreground">{sessionId}</p>
                </div>
              </div>
            </div>
            
            <div className="interview-card p-6 glass-effect">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <FaComment className="text-green-600" size={24} />
                </div>
                <div className="ml-4">
                  <h3 className="font-semibold text-foreground">Status</h3>
                  <p className="text-sm text-muted-foreground">{interview.status}</p>
                </div>
              </div>
            </div>
            
            <div className="interview-card p-6 glass-effect">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <FaFileAlt className="text-purple-600" size={24} />
                </div>
                <div className="ml-4">
                  <h3 className="font-semibold text-foreground">Analysis</h3>
                  <p className="text-sm text-muted-foreground">{interview.analysis_status}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Coming Soon Section
          <div className="interview-card p-12 glass-effect text-center">
            <div className="p-6 bg-muted rounded-full w-fit mx-auto mb-6">
              <FaBrain className="text-muted-foreground" size={48} />
            </div>
            
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Detailed Results Dashboard Coming Soon
            </h2>
            
            <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
              This page will show comprehensive interview analysis, transcriptions, AI evaluations, 
              and detailed candidate assessments. Check back soon for these enhanced features.
            </p>

            <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto mb-8">
              <div className="p-4 bg-muted/30 rounded-lg border">
                <div className="flex items-center mb-2">
                  <FaVideo size={20} className="text-primary mr-2" />
                  <span className="font-semibold text-foreground">Video Analysis</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Watch candidate responses with AI-powered insights
                </p>
              </div>
              
              <div className="p-4 bg-muted/30 rounded-lg border">
                <div className="flex items-center mb-2">
                  <FaComment size={20} className="text-primary mr-2" />
                  <span className="font-semibold text-foreground">Transcriptions</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Full text transcripts of all responses
                </p>
              </div>
              
              <div className="p-4 bg-muted/30 rounded-lg border">
                <div className="flex items-center mb-2">
                  <FaBrain size={20} className="text-primary mr-2" />
                  <span className="font-semibold text-foreground">AI Scoring</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Detailed AI analysis and recommendations
                </p>
              </div>
              
              <div className="p-4 bg-muted/30 rounded-lg border">
                <div className="flex items-center mb-2">
                  <FaUser size={20} className="text-primary mr-2" />
                  <span className="font-semibold text-foreground">Candidate Profiles</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Complete candidate information and history
                </p>
              </div>
            </div>
            
            <div className="space-x-4">
              <button
                onClick={() => startTransition(() => {router.push('/admin')})}
                className="px-8 py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                Create New Interview
              </button>
              
              <button
                onClick={() => startTransition(() => {router.push('/results')})}
                className="px-8 py-4 bg-secondary text-secondary-foreground rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                View All Results
              </button>
            </div>
          </div>*/}
        </div>
      </div>
    </div>
  )
}

export default function ResultsPage() {
  return (
    <ProtectedRoute adminOnly={false}>
      <ResultsPageContent />
    </ProtectedRoute>
  )
}
