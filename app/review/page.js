// file: app/review/page.js
'use client'
import { useState, useEffect, useTransition } from 'react'
import { FaFileAlt, FaBrain, FaVideo, FaComment, FaCheckCircle, FaTimesCircle, FaClock, FaDownload, FaEye, FaCircle, FaDotCircle, FaSpinner, FaCheck, FaTimes, FaFire, FaExclamationTriangle, FaStar, FaChevronLeft, FaChevronRight, FaUser } from 'react-icons/fa'
import { useRouter, useSearchParams } from 'next/navigation'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useAuthContext } from '../../components/AuthProvider'
import { supabaseClient } from '../../lib/authClient'
import Navigation from '../../components/Navigation'

function AdminResultsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const interviewId = searchParams.get('interview_id') // Get interview_id from URL
  const { user } = useAuthContext()
  
  const [interviewCandidates, setInterviewCandidates] = useState([])
  const [interviewQuestions, setInterviewQuestions] = useState([])
  const [interviewData, setInterviewData] = useState(null)
  const [candidates, setCandidates] = useState([])  
  const [loading, setLoading] = useState(true)
  const [currentCandidateIndex, setCurrentCandidateIndex] = useState(0)
  const [currentQuestionPosition, setCurrentQuestionPosition] = useState(1)
  const [savedQuestions, setSavedQuestions] = useState(new Set())
  const [showAllQuestions, setShowAllQuestions] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (interviewId) {
      fetchResults()
    }
  }, [interviewId])

  const fetchResults = async () => {
    try {
      const { data: { session } } = await supabaseClient.auth.getSession()
      console.log('session: ', session)
      console.log('interview_id ', interviewId )
      console.log('token: ', session.access_token)

      // Fetch interview_candidates with related data
      const response = await fetch(`/api/admin/session-candidates?interview_id=${interviewId}`, {
        headers: {
          'authorization': `Bearer ${session.access_token}`
        }
      })
      console.log('Info of response: ', response)
      if (response.ok) {
        const data = await response.json()
        console.log('Data fetched: ', data)
        // Filter only relevant statuses
        const filteredCandidates = data.instances?.filter(ic => 
          ['completed', 'reviewed', 'reviewing'].includes(ic.status)
        ) || []
        console.log('filtered candidates: ', filteredCandidates)
        setInterviewCandidates(filteredCandidates)
        setInterviewQuestions(data.interviewQuestions || [])
        setInterviewData(data.interview)
        setCandidates(data.candidates || [])
      } else {
        const errorData = await response.json()
        console.error('Error fetching results:', errorData)
      }
    } catch (error) {
      console.error('Error fetching results:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <FaCircle className="text-gray-400" size={12} />
      case 'reviewed': return <FaDotCircle className="text-blue-600" size={12} />
      case 'reviewing': return <FaSpinner className="text-yellow-600 animate-spin" size={12} />
      case 'short': return <FaCheckCircle className="text-green-600" size={12} />
      case 'rejected': return <FaTimes className="text-red-600" size={12} />
      default: return <FaCircle className="text-gray-400" size={12} />
    }
  }

  const handleSaveAndNext = () => {
    const questionId = `${currentCandidateIndex}-${currentQuestionPosition}`
    setSavedQuestions(new Set([...savedQuestions, questionId]))
    navigateQuestion(1)
  }

  const handleSkipAndNext = () => {
    navigateQuestion(1)
  }

  const navigateQuestion = (direction) => {
    const newPosition = currentQuestionPosition + direction
    if (newPosition >= 1 && newPosition <= interviewQuestions.length) {
      setCurrentQuestionPosition(newPosition)
    } else if (newPosition > interviewQuestions.length && currentCandidateIndex < interviewCandidates.length - 1) {
      setCurrentCandidateIndex(currentCandidateIndex + 1)
      setCurrentQuestionPosition(1)
    }
  }

  const categorizeQuestions = () => {
    const categories = {
      'Immediate attention': [],
      'Flagged': [],
      'Critical': [],
      'Quick check': []
    }

    interviewQuestions.forEach(question => {
      const currentInstance = interviewCandidates[currentCandidateIndex]
      const response = currentInstance?.responses?.find(r => r.interview_question_id === question.id)
      
      const hasCriticalTag = question.tags_questions?.includes('critical')
      const hasFlaggedAnswer = response?.tags_answers?.includes('flagged')

      if (hasCriticalTag && hasFlaggedAnswer) {
        categories['Immediate attention'].push({ ...question, response })
      } else if (!hasCriticalTag && hasFlaggedAnswer) {
        categories['Flagged'].push({ ...question, response })
      } else if (hasCriticalTag && !hasFlaggedAnswer) {
        categories['Critical'].push({ ...question, response })
      } else {
        categories['Quick check'].push({ ...question, response })
      }
    })

    // Sort by position within each category
    Object.keys(categories).forEach(key => {
      categories[key].sort((a, b) => a.position - b.position)
    })

    return categories
  }

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Immediate attention': return <FaFire className="text-red-600" size={16} />
      case 'Flagged': return <FaExclamationTriangle className="text-yellow-600" size={16} />
      case 'Critical': return <FaStar className="text-primary" size={16} />
      case 'Quick check': return <FaCheck className="text-gray-800" size={16} />
      default: return null
    }
  }

  const isQuestionSaved = (questionPosition) => {
    const questionId = `${currentCandidateIndex}-${questionPosition}`
    return savedQuestions.has(questionId)
  }

  const getCurrentResponse = () => {
    const currentInstance = interviewCandidates[currentCandidateIndex]
    const currentQuestion = interviewQuestions.find(q => q.position === currentQuestionPosition)
    return currentInstance?.responses?.find(r => r.interview_question_id === currentQuestion?.id)
  }

  const getCurrentQuestion = () => {
    return interviewQuestions.find(q => q.position === currentQuestionPosition)
  }

  const isQuickCheckQuestion = () => {
    const categories = categorizeQuestions()
    const currentQuestion = getCurrentQuestion()
    return categories['Quick check'].some(q => q.id === currentQuestion?.id)
  }

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="interview-card p-8 glass-effect text-center">
          <div className="loading-spinner h-12 w-12 mx-auto mb-4"></div>
          <p className="text-muted-foreground font-medium">Loading interview results...</p>
        </div>
      </div>
    )
  }

  if (interviewCandidates.length === 0) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="interview-card p-12 glass-effect text-center">
          <FaFileAlt className="text-muted-foreground mx-auto mb-4" size={48} />
          <h2 className="text-2xl font-bold text-foreground mb-4">No Candidates Found</h2>
          <p className="text-muted-foreground">No completed candidates for this interview session.</p>
        </div>
      </div>
    )
  }

  const currentInstance = interviewCandidates[currentCandidateIndex]
  const currentCandidate = candidates.find((c) => c.id === currentInstance?.candidate_id)
  const currentQuestion = getCurrentQuestion()
  const currentResponse = getCurrentResponse()
  const categorizedQuestions = categorizeQuestions()
  const isVideoContracted = isQuickCheckQuestion()

  return (
    <div className="min-h-screen gradient-bg">
      <Navigation />
      <div className="py-8 px-4">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Top Panel - Candidate Overview */}
          <div className="interview-card glass-effect p-6">
            <div className="flex items-start space-x-4">
              {/* Candidate Avatar */}
              <div className="flex-shrink-0">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                  <FaUser className="text-white" size={32} />
                </div>
              </div>

              {/* Candidate Info - 3 Rows */}
              <div className="flex-1 space-y-3">
                {/* Row 1: Name, Position, Status */}
                <div className="flex items-center space-x-2 text-lg font-semibold">
                  <span>{currentCandidate.name || 'Unknown Candidate'}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{currentCandidateIndex + 1} of {interviewCandidates.length}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    currentInstance.status === 'short' ? 'bg-green-100 text-green-800' :
                    currentInstance.status === 'rejected' ? 'bg-red-100 text-red-800' :
                    currentInstance.status === 'reviewed' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {currentInstance.status}
                  </span>
                </div>

                {/* Row 2: List of Candidates with Status Icons */}
                <div className="flex items-center space-x-3 overflow-x-auto pb-2">
                  {interviewCandidates.slice(0, 8).map((ic, idx) => (
                    <div 
                      key={ic.id}
                      onClick={() => setCurrentCandidateIndex(idx)}
                      className={`flex items-center space-x-2 px-3 py-1 rounded-lg cursor-pointer transition-colors ${
                        idx === currentCandidateIndex 
                          ? 'bg-primary/10 border border-primary' 
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      {getStatusIcon(ic.status)}
                      <span className="text-sm whitespace-nowrap">
                        {candidates.find((c) => c.id === ic?.candidate_id)?.name || 'Unknown'}
                      </span>
                    </div>
                  ))}
                  {interviewCandidates.length > 8 && (
                    <div className="text-sm text-muted-foreground whitespace-nowrap">
                      ... +{interviewCandidates.length - 8}
                    </div>
                  )}
                </div>

                {/* Row 3: Additional Candidate Info */}
                <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                  <span>5 years</span>
                  <span>·</span>
                  <span>SF</span>
                  <span>·</span>
                  <span className="text-green-600 font-semibold">87% match</span>
                  <span>·</span>
                  <span className="text-blue-600 hover:underline cursor-pointer">LinkedIn</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Grid - 2x2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Left: Questions Panel */}
            <div className="interview-card glass-effect p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-foreground">Questions</h2>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => navigateQuestion(-1)}
                    disabled={currentQuestionPosition === 1}
                    className="p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FaChevronLeft size={16} />
                  </button>
                  <button 
                    onClick={() => navigateQuestion(1)}
                    disabled={currentQuestionPosition === interviewQuestions.length}
                    className="p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FaChevronRight size={16} />
                  </button>
                </div>
              </div>

              <div className={`space-y-4 ${!showAllQuestions ? 'max-h-96 overflow-y-auto' : ''}`}>
                {Object.entries(categorizedQuestions).map(([category, questions]) => (
                  questions.length > 0 && (
                    <div key={category}>
                      <div className="flex items-center space-x-2 mb-2 font-semibold text-foreground">
                        {getCategoryIcon(category)}
                        <span>{category}</span>
                      </div>
                      <div className="space-y-2 ml-6">
                        {questions.map((q) => (
                          <div 
                            key={q.id}
                            onClick={() => setCurrentQuestionPosition(q.position)}
                            className={`flex items-start space-x-2 p-3 rounded-lg cursor-pointer transition-colors ${
                              q.position === currentQuestionPosition 
                                ? 'bg-primary/10 border border-primary' 
                                : 'hover:bg-muted/50'
                            }`}
                          >
                            {isQuestionSaved(q.position) ? (
                              <FaCheck className="text-gray-800 mt-1 flex-shrink-0" size={14} />
                            ) : (
                              <FaCircle className="text-gray-400 mt-1 flex-shrink-0" size={14} />
                            )}
                            <div className="flex-1">
                              <div className="text-sm font-medium">{q.short_name || `Question ${q.position}`}</div>
                              <div className="text-xs text-muted-foreground line-clamp-2">{q.question_text}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                ))}
              </div>

              {!showAllQuestions && (
                <button 
                  onClick={() => setShowAllQuestions(true)}
                  className="mt-4 w-full py-2 text-sm text-primary hover:text-primary/80 font-medium"
                >
                  View all
                </button>
              )}
            </div>

            {/* Top Right: AI Assessment Panel */}
            <div className="interview-card glass-effect p-6">
              <h2 className="text-xl font-bold text-foreground mb-4">AI Assessment</h2>
              {/* Placeholder for AI Assessment content */}
              <div className="text-muted-foreground text-center py-8">
                AI Assessment content will appear here
              </div>
            </div>

            {/* Bottom Left: Video Panel */}
            <div className="interview-card glass-effect p-6">
              <h2 className="text-xl font-bold text-foreground mb-4">Video</h2>
              
              {currentResponse?.video_url ? (
                isVideoContracted ? (
                  <div className="flex items-center justify-center py-8 bg-muted/30 rounded-lg">
                    <div className="text-center">
                      <FaVideo className="text-muted-foreground mx-auto mb-2" size={32} />
                      <p className="text-muted-foreground">Video duration: 2:34</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <video
                      src={currentResponse.video_url}
                      controls
                      className="w-full rounded-lg bg-black"
                    >
                      Your browser does not support the video tag.
                    </video>
                    
                    {currentResponse.transcription && (
                      <div>
                        <h5 className="font-semibold text-foreground mb-2">Transcription:</h5>
                        <div className="p-4 bg-muted/30 rounded-lg border max-h-48 overflow-y-auto">
                          <p className="text-foreground text-sm leading-relaxed">
                            {currentResponse.transcription}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No video available for this question
                </div>
              )}
            </div>

            {/* Bottom Right: Your Decision Panel */}
            <div className="interview-card glass-effect p-6">
              <h2 className="text-xl font-bold text-foreground mb-4">Your Decision</h2>
              
              <div className="space-y-4">
                {/* Placeholder content */}
                <div className="text-sm text-muted-foreground mb-6">
                  Decision summary will appear here
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={handleSaveAndNext}
                    className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                  >
                    Save & Next
                  </button>
                  <button
                    onClick={handleSkipAndNext}
                    className="w-full py-3 bg-secondary text-secondary-foreground rounded-lg font-semibold hover:bg-secondary/80 transition-colors"
                  >
                    Skip & Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminResults() {
  return (
    <ProtectedRoute adminOnly={true}>
      <AdminResultsContent />
    </ProtectedRoute>
  )
}