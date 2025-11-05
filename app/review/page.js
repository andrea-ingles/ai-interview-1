// file: app/review/page.js
'use client'
import { useState, useEffect, useTransition, useRef } from 'react'
import { FaFileAlt, FaBrain, FaVideo, FaComment, FaCheckCircle, FaTimesCircle, FaClock, FaDownload, FaEye, FaCircle, FaDotCircle, FaSpinner, FaCheck, FaTimes, FaFire, FaExclamationTriangle, FaStar, FaChevronLeft, FaChevronRight, FaUser, FaEdit, FaQuestionCircle, FaClipboardList  } from 'react-icons/fa'
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
  const [interviewAnswers, setInterviewAnswers] = useState([])
  const [candidates, setCandidates] = useState([])  
  const [loading, setLoading] = useState(true)
  const [currentCandidateIndex, setCurrentCandidateIndex] = useState(0)
  const [currentQuestionPosition, setCurrentQuestionPosition] = useState(1)
  const [savedQuestions, setSavedQuestions] = useState(new Set())
  const [showAllQuestions, setShowAllQuestions] = useState(false)
  const [isPending, startTransition] = useTransition()

  // --- Local UI states for Decision Panel ---
  const [editingScore, setEditingScore] = useState(false)
  const [editingSkillKey, setEditingSkillKey] = useState(null)
  const [localOverall, setLocalOverall] = useState(null)
  const [localSkills, setLocalSkills] = useState(null)
  const [localNotes, setLocalNotes] = useState('')
  const [showAllSkills, setShowAllSkills] = useState(false)
  const [saving, setSaving] = useState(false)

  // UI states for AI-assesment and Video panel
  const videoRef = useRef(null)
  const transcriptRef = useRef(null)
  const [segments, setSegments] = useState([]) // from DB later
  const [currentTime, setCurrentTime] = useState(0)
  const [showVerifiedFacts, setShowVerifiedFacts] = useState(false)
  const [showTranscription, setShowTranscription] = useState(true) // Not contracted by default
  const [transcriptionExpanded, setTranscriptionExpanded] = useState(false)
  const [transcriptionSearch, setTranscriptionSearch] = useState('')
  const segmentRefs = useRef([]);
  const [videoHeight, setVideoHeight] = useState(600);
  const AIPanelRef = useRef(null);
  const VideoPanelRef = useRef(null);
  const [rightHeight, setRightHeight] = useState(null);

  // Add helper function to format seconds to mm:ss
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Add helper function to highlight search text
  const highlightText = (text, search) => {
    if (!search.trim()) return text
    const regex = new RegExp(`(${search})`, 'gi')
    const parts = text.split(regex)
    return parts.map((part, i) => 
      regex.test(part) ? <mark key={i} className="bg-yellow-300">{part}</mark> : part
    )
  }

  useEffect(() => {
    if (interviewId) {
      fetchResults()
    }
  }, [interviewId])

  // When currentInstance changes, hydrate local editable copies
  useEffect(() => {
    const currentInstance = interviewCandidates[currentCandidateIndex]
    const analysis = currentInstance?.overall_ai_analysis || null
    if (analysis) {
      // Defensive: make sure it's an object
      const parsed = typeof analysis === 'string' ? tryParseJSON(analysis) : analysis
      setLocalOverall(parsed?.overallScore ?? null)
      setLocalSkills(parsed?.skillsEvaluation ? { ...parsed.skillsEvaluation } : null)
      setLocalNotes(currentInstance?.notes ?? '')
      //console.log('AI analysis:', parsed)
    } else {
      setLocalOverall(null)
      setLocalSkills(null)
      setLocalNotes(currentInstance?.notes ?? '')
    }
  }, [interviewCandidates, currentCandidateIndex])

  useEffect(() => {
    if (!videoRef.current || !showVideo) return;

    const updateHeight = () => {
      if (videoRef.current) {
        setVideoHeight(videoRef.current.clientHeight || 600);
      }
    };
    // Watch video size changes
    const observer = new ResizeObserver(updateHeight);
    observer.observe(videoRef.current);

    // Also update whenever question changes
    updateHeight();

    return () => observer.disconnect();
  }, [videoRef.current?.src]);

  

  const tryParseJSON = (value) => {
    try { return JSON.parse(value) } catch (e) { return null }
  }

  const fetchResults = async () => {
    try {
      const { data: { session } } = await supabaseClient.auth.getSession()
      //console.log('session: ', session)
      //console.log('interview_id ', interviewId )
      //console.log('token: ', session.access_token)

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

        // Group responses by interview_candidates_id
        const responsesByInterviewCandidate = {}
        data.responses?.forEach(response => {
            //console.log('Response to be organized: ', response)
            const interviewCandidateId = response.interview_candidate_id
            if (!responsesByInterviewCandidate[interviewCandidateId]) {
                responsesByInterviewCandidate[interviewCandidateId] = []
            }
            responsesByInterviewCandidate[interviewCandidateId].push(response)
            })
        setInterviewAnswers(responsesByInterviewCandidate || [])

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

  const handleSaveToggle  = (questionPos) => {
    const questionId = `${currentCandidateIndex}-${questionPos}`
    const alreadySaved = savedQuestions.has(questionId)

    setSavedQuestions(prev => {
      const newSet = new Set(prev)
      if (alreadySaved) {
        newSet.delete(questionId)       // un-save
      } else {
        newSet.add(questionId)          // save
      }
      return newSet
    })

    // Navigation behavior
    if (!alreadySaved) {
      // If newly saved → go next
      navigateQuestion(1)
    } else {
      // If unsaved → stay on question
      //setCurrentQuestionPosition(questionPos)
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
      // ✅ Get the response for this specific question
      const interviewCandidateResponses = interviewAnswers[currentInstance?.id] || []
      const response = interviewCandidateResponses.find(r => r.interview_question_id === question.id)
      
      const hasCriticalTag = question.tags_questions?.includes('critical')
      const hasFlaggedAnswer = response?.ai_analysis?.redFlags && response.ai_analysis.redFlags.length > 0
      //console.log('Question: ', question.question_text)
      //console.log('Response: ', response)
      //console.log('The answer has a redflag?: ', hasFlaggedAnswer)

      if (hasCriticalTag && hasFlaggedAnswer) {
        categories['Immediate attention'].push({ ...question, response })
      } else if (!hasCriticalTag && hasFlaggedAnswer) {
        categories['Flagged'].push({ ...question, response })
      } else if (hasCriticalTag && !hasFlaggedAnswer) {
        categories['Critical'].push({ ...question, response})
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
    const currentInterviewCandidate = interviewCandidates[currentCandidateIndex]
    const currentQuestion = interviewQuestions.find(q => q.position === currentQuestionPosition)
    const interviewCandidateResponses = interviewAnswers[currentInterviewCandidate?.id] || []
    return interviewCandidateResponses.find(r => r.interview_question_id === currentQuestion?.id)
  }

  const getCurrentQuestion = () => {
    return interviewQuestions.find(q => q.position === currentQuestionPosition)
  }

  const isQuickCheckQuestion = () => {
    const categories = categorizeQuestions()
    const currentQuestion = getCurrentQuestion()
    return categories['Quick check'].some(q => q.id === currentQuestion?.id)
  }

  const [showVideo, setShowVideo] = useState(() => !isQuickCheckQuestion())
  

  // --- Persist changes for overall/skills/notes/status ---
  // **Update instance via API instead of client-side Supabase**
  const updateInstance = async (updates) => {
    try {

      const { data: { session } } = await supabaseClient.auth.getSession()
      setSaving(true)

      const res = await fetch('/api/admin/review', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ 
          interviewId: currentInstance.interview_id, 
          candidateId: currentInstance.candidate_id, 
          updates })
        })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      // ✅ Update local state list
      setInterviewCandidates(prev => {
        const updated = [...prev]
        updated[currentCandidateIndex] = json.instance
        return updated
      })

      if (updates.status === "short" || updates.status === "reject") {
        setInterviewCandidates(prev => prev.filter((_, i) => i !== currentCandidateIndex))
        setCurrentCandidateIndex(i => Math.max(0, i - 1))
      }

    } catch (e) {
      console.error('Update failed', e)
      toast({
        title: "Error",
        description: e.message || "Unable to save changes.",
        variant: "destructive",
        duration: 3000,
    })
    } finally {
      setSaving(false)
    }
  }
  

  const handleOverallSave = async (value) => {
    // merge into overall_ai_analysis
    const current = interviewCandidates[currentCandidateIndex]
    const analysis = typeof current?.overall_ai_analysis === 'string' ? tryParseJSON(current.overall_ai_analysis) : current?.overall_ai_analysis || {}
    const newAnalysis = { ...analysis, overallScore: Number(value) }
    const data = await updateInstance({ overall_ai_analysis: newAnalysis })
    if (data) {
      setLocalOverall(Number(value))
      setEditingScore(false)
    }
  }


  const handleSkillSave = async (key, value) => {
    const current = interviewCandidates[currentCandidateIndex]
    const analysis = typeof current?.overall_ai_analysis === 'string' ? tryParseJSON(current.overall_ai_analysis) : current?.overall_ai_analysis || {}
    const skills = { ...(analysis.skillsEvaluation || {}) }
    skills[key] = Number(value)
    const newAnalysis = { ...analysis, skillsEvaluation: skills }
    const data = await updateInstance({ overall_ai_analysis: newAnalysis })
    if (data) {
      setLocalSkills(skills)
      setEditingSkillKey(null)
    }
  }


  const handleNotesSave = async () => {
    const trimmed = localNotes
    const data = await updateInstance({ notes: trimmed })
    // on success the instance in state is updated inside updateInstance
  }


  const handleDecisionClick = async (decision) => {
    // map UI label to DB status
    const statusMap = { Shortlist: 'short', 'Review later': 'reviewed', Reject: 'reject' }
    const status = statusMap[decision]
    if (!status) return
    const data = await updateInstance({ status })
    // keep local state consistent
  }

  const currentInstance = interviewCandidates[currentCandidateIndex]
  const currentCandidate = candidates.find((c) => c.id === currentInstance?.candidate_id)
  const currentQuestion = getCurrentQuestion()
  const currentResponse = getCurrentResponse()
  const categorizedQuestions = categorizeQuestions()
  const isVideoContracted = isQuickCheckQuestion()
  const currentSegment = segments.find(
    seg => currentTime >= seg.start && currentTime <= seg.end
  )

  useEffect(() => {
    if (currentResponse?.formatted_segments) {
      setSegments(currentResponse.formatted_segments)
    }
  }, [currentResponse])

  useEffect(() => {
    const measurements = [100, 300, 500]; // Multiple measurement attempts
    const timeouts = [];

    measurements.forEach(delay => {
      const id = setTimeout(() => {
        if (showVideo && VideoPanelRef.current) {
          const height = VideoPanelRef.current.scrollHeight;
          console.log(`Measurement at ${delay}ms:`, height);
          if (height > 250) {
            setRightHeight(height);
          }
        } else if (!showVideo && AIPanelRef.current) {
          const height = AIPanelRef.current.scrollHeight;
          if (height > 200) {
            setRightHeight(height);
          }
        }
      }, delay);
      timeouts.push(id);
    });

    return () => timeouts.forEach(clearTimeout);
  }, [showVideo, currentResponse]);

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

  

  

  // helper for next candidate text
  const nextCandidate = interviewCandidates[currentCandidateIndex + 1]
  const numLeft = Math.max(0, interviewCandidates.length - (currentCandidateIndex + 1))

  return (
    <div className="min-h-screen gradient-bg">
      <Navigation />
      <div className="py-8 px-4">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Top Panel - Candidate Overview */}
          <div className="interview-card glass-effect p-6">
            <div className="flex flex-col lg:flex-row lg:items-start gap-6 relative">
              {/* Column 1: Avatar + Name/Status + Candidates List */}
              <div className="flex gap-4 lg:w-100 flex-shrink-0">
                {/* Candidate Avatar */}
                <div className="flex-shrink-0">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center overflow-hidden">
                    {currentCandidate?.linkedin_profile?.picture ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={currentCandidate.linkedin_profile.picture} 
                        alt="LinkedIn profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FaUser className="text-white" size={32} />
                    )}
                  </div>
                </div>
                {/* Name, Status, and Candidates List */}
                <div className="flex flex-col gap-3 flex-1 min-w-0">
                  {/* Row 1: Name, Position, Status */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center flex-wrap gap-2 text-lg font-semibold">
                      <span>{currentCandidate.name || 'Unknown Candidate'}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-muted-foreground">{currentCandidateIndex + 1} of {interviewCandidates.length}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className={`px-3 py-1 rounded-full text-sm self-start ${
                        currentInstance.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                        currentInstance.status === 'reviewing' ? 'bg-blue-100 text-blue-700' :
                        currentInstance.status === 'reviewed' ? 'bg-purple-100 text-purple-700' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {
                        currentInstance.status === 'completed' ? 'Not reviewed yet' :
                        currentInstance.status === 'reviewing' ? 'In progress' :
                        currentInstance.status === 'reviewed' ? 'To reject/approve' :
                        'status'
                      }
                      </span>
                    </div>

                    {/* Row 2: List of Candidates with Status Icons */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2">
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
                  </div>
                </div>
              </div>
              {/* Column 2: Empty spacer that shrinks (hidden on mobile) */}
              <div className="hidden lg:block flex-1 min-w-0"></div>

              {/* Column 3: Additional Info + Buttons */}
              <div className="flex flex-col gap-4 lg:w-auto lg:min-w-[450px] flex-shrink-0">
                {/* Row 3: Additional Candidate Info */}
                <div className="flex items-center flex-wrap gap-x-3 gap-y-2 text-sm text-muted-foreground justify-end">
                  <span>5 years</span>
                  <span>·</span>
                  <span>SF</span>
                  <span>·</span>
                  <span className="text-green-600 font-semibold">{localOverall}% match</span>
                  <span>·</span>
                  <span className="text-blue-600 hover:underline cursor-pointer">LinkedIn</span>
                </div>
                {/* Buttons */}
                <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                  <button onClick={() => handleDecisionClick('Shortlist')} className="flex-1 sm:w-36 py-2 rounded-lg bg-green-600 text-white font-semibold flex items-center justify-center space-x-2 hover:brightness-90 transition">
                    <FaCheck /> <span>Shortlist</span>
                  </button>
                  <button onClick={() => handleDecisionClick('Review later')} className="flex-1 sm:w-36 py-2 rounded-lg bg-yellow-400 text-black font-semibold flex items-center justify-center space-x-2 hover:brightness-95 transition">
                    <FaQuestionCircle /> <span>Review later</span>
                  </button>
                  <button onClick={() => handleDecisionClick('Reject')} className="flex-1 sm:w-36 py-2 rounded-lg bg-red-600 text-white font-semibold flex items-center justify-center space-x-2 hover:brightness-90 transition">
                    <FaTimes /> <span>Reject</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          {/* Main Content Grid - 2x2 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Questions Panel */}
            <div className="flex flex-col lg:col-span-1">
              <div className="interview-card glass-effect p-6 flex flex-col"
                style={{ height: rightHeight ? `${rightHeight}px` : "200px" }}
              >
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

                <div className={`space-y-4 overflow-y-auto`}>
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
                              <div
                                onClick={(e) => {
                                  e.stopPropagation() // ✅ prevents navigating when clicking icon
                                  handleSaveToggle(q.position)
                                }}
                                className="mt-1 flex-shrink-0"
                              >
                                {isQuestionSaved(q.position) ? (
                                  <FaCheck className="text-gray-800 mt-1 flex-shrink-0" size={14} />
                                ) : (
                                  <FaCircle className="text-gray-400 mt-1 flex-shrink-0" size={14} />
                                )}
                              </div>
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
            </div>
            
            {/* Right: AI + Video stacked */}
            <div className="lg:col-span-2 flex flex-col gap-6 h-full">
              {!showVideo && (
                <>  
                  {/* Top Right: AI Assessment Panel */}
                  <div ref={AIPanelRef} className="interview-card glass-effect p-6">
                    {/* Header: Title + AI Score & Confidence with Icons + Chevron */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        {/* Title */}
                        <h2 className="text-xl font-bold text-foreground">AI Assessment</h2>

                        {/* NEW — video icon triggers showVideo */}
                        <button onClick={() => setShowVideo(true)} className="p-2 hover:bg-muted rounded-lg">
                          <FaVideo size={16} />
                        </button>
                      </div>
                      {currentResponse?.ai_analysis && (
                        <div>
                          {/* Row 1: AI Score & Confidence with Icons */}
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center space-x-3">
                              <span className="text-sm text-muted-foreground">AI Score:</span>
                              <span className="font-bold text-lg">{currentResponse.ai_analysis.overallScore || '—'}</span>
                              <span className="text-muted-foreground">/10</span>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              {/* Red Flag Icon */}
                              {currentResponse.ai_analysis.redFlags && currentResponse.ai_analysis.redFlags.length > 0 && (
                                <div className="relative group">
                                  <FaExclamationTriangle className="text-red-600" size={18} />
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                    Red Flags
                                  </div>
                                </div>
                              )}
                              
                              {/* Doubt Icon */}
                              {currentResponse.ai_analysis.doubts && currentResponse.ai_analysis.doubts.length > 0 && (
                                <div className="relative group">
                                  <FaQuestionCircle className="text-yellow-600" size={18} />
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                    Doubts
                                  </div>
                                </div>
                              )}
                              
                              {/* Fact Plus Icon */}
                              {segments?.some(seg => seg.factPlus && seg.factPlus.length > 0) && (
                                <div className="relative group">
                                  <FaCheckCircle className="text-green-600" size={18} />
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                    Verified Facts
                                  </div>
                                </div>
                              )}
                              
                              {/* Fact Minus Icon */}
                              {segments?.some(seg => seg.factMinus && seg.factMinus.length > 0) && (
                                <div className="relative group">
                                  <FaTimesCircle className="text-orange-600" size={18} />
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                    Contradictions
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-muted-foreground">Confidence:</span>
                              <span className="font-semibold">{currentResponse.ai_analysis.confidence || '—'}%</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    {currentResponse?.ai_analysis ?  (
                      <div className="space-y-4">

                        {/* Row 1: Reasoning */}
                        {currentResponse.ai_analysis.reasoning && (
                          <div className="p-4 bg-muted/30 rounded-lg border">
                            <p className="text-sm text-foreground leading-relaxed">
                              {currentResponse.ai_analysis.reasoning}
                            </p>
                          </div>
                        )}

                        {/* Row 3: Verified Facts Toggle */}
                        <div className="border rounded-lg">
                          <button
                            onClick={() => setShowVerifiedFacts(!showVerifiedFacts)}
                            className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
                          >
                            <span className="text-sm font-semibold text-foreground">
                              Verified Facts (0)
                            </span>
                            <FaChevronRight 
                              className={`transition-transform ${showVerifiedFacts ? 'rotate-90' : ''}`} 
                              size={14} 
                            />
                          </button>
                          
                          {showVerifiedFacts && (
                            <div className="p-4 border-t">
                              <p className="text-sm text-muted-foreground">No verified facts available</p>
                            </div>
                          )}
                        </div>

                        {/* Row 4: Transcription with Key Moments (only if video contracted) */}
                        {currentResponse.transcription && (
                          <div className="border rounded-lg">

                            {/* Header: Title + Search + Chevron */}
                            <div className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors">

                              {/* Title */}
                              <div
                                className="flex items-center space-x-2 cursor-pointer"
                                onClick={() => setShowTranscription(!showTranscription)}
                              >
                                <span className="text-sm font-semibold text-foreground">Transcription</span>
                                <FaChevronRight 
                                  className={`transition-transform ${showTranscription ? 'rotate-90' : ''}`} 
                                  size={14} 
                                />
                              </div>

                              {/* Search Bar */}
                              <div className="relative w-48"
                                onClick={(e) => e.stopPropagation()}   // ✅ prevent toggle when clicking search
                              >
                                <input
                                  type="text"
                                  placeholder="Search..."
                                  value={transcriptionSearch}
                                  onChange={(e) => setTranscriptionSearch(e.target.value)}
                                  className="w-full px-3 py-1.5 pr-6 rounded-lg border bg-card/5 text-sm"
                                />
                                {transcriptionSearch && (
                                  <button
                                    onClick={() => setTranscriptionSearch('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                  >
                                    <FaTimes size={12} />
                                  </button>
                                )}
                              </div>
                            </div>
                            
                            {showTranscription && (
                              <div className="p-4 border-t space-y-4">
                                
                                {/* Transcription Text */}
                                <div className="relative">
                                  <div className={`text-sm text-foreground leading-relaxed ${!transcriptionExpanded ? 'line-clamp-1' : ''}`}>
                                    {highlightText(currentResponse.transcription, transcriptionSearch)}
                                  </div>
                                  {!transcriptionExpanded && (
                                    <button
                                      onClick={() => setTranscriptionExpanded(true)}
                                      className="text-sm text-primary hover:underline mt-1"
                                    >
                                      Show more
                                    </button>
                                  )}
                                  {transcriptionExpanded && (
                                    <button
                                      onClick={() => setTranscriptionExpanded(false)}
                                      className="text-sm text-primary hover:underline mt-1"
                                    >
                                      Show less
                                    </button>
                                  )}
                                </div>

                                {/* Key Moments Timeline */}
                                {segments && segments.length > 0 && (
                                  <div>
                                    <h5 className="text-sm font-semibold text-foreground mb-3">Key Moments</h5>
                                    <div className="relative pl-6 space-y-3">
                                      {/* Vertical timeline line */}
                                      <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-muted"></div>

                                      
                                      {segments.map((segment, idx) => (
                                        <div key={idx} className="relative">
                                          {/* Timeline dot */}
                                          <div className="absolute -left-[22px] top-1 w-3 h-3 rounded-full bg-primary border-2 border-background"></div>
                                        
                                          
                                          {/* Content */}
                                          <div className="flex items-start space-x-2 text-sm">
                                            <span className="text-muted-foreground font-mono text-xs whitespace-nowrap">
                                              {formatTime(segment.start)}
                                            </span>
                                            
                                            <div className="flex items-center space-x-1.5 flex-shrink-0">
                                              {segment.redflag && (
                                                <FaExclamationTriangle className="text-red-600" size={14} />
                                              )}
                                              {segment.doubt && (
                                                <FaQuestionCircle className="text-yellow-600" size={14} />
                                              )}
                                              {segment.factPlus && segment.factPlus.length > 0 && (
                                                <FaCheckCircle className="text-green-600" size={14} />
                                              )}
                                              {segment.factMinus && segment.factMinus.length > 0 && (
                                                <FaTimesCircle className="text-orange-600" size={14} />
                                              )}
                                            </div>
                                            
                                            <span className="text-foreground flex-1">{segment.title}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-muted-foreground text-center py-8">
                        No AI analysis available for this response
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Bottom Riht: Video Panel */}
              {showVideo && (
                <div ref={VideoPanelRef} className="interview-card glass-effect p-6">

                  {/* Title + Chevron Row */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <h2 className="text-xl font-bold text-foreground">Video</h2>
                      {/* NEW — assessment icon returns to AI */}
                      <button onClick={() => setShowVideo(false)} className="p-2 hover:bg-muted rounded-lg">
                        <FaClipboardList size={16} />
                      </button>
                    </div>
                  </div>
                  
                  {currentResponse?.video_url ? (  
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Left: Video */}
                      <div className="w-full h-full flex flex-col">
                        <video
                          ref={videoRef}
                          src={currentResponse.video_url}
                          controls
                          onTimeUpdate={() => setCurrentTime(videoRef.current.currentTime)}
                          className="w-full rounded-lg bg-black"
                        />

                        {/* Overlay controls */}
                        <div className="relative w-full h-2 flex items-center bg-gray-300 rounded-full my-2 px-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          
                          {/* Previous Mark */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              const prev = [...segments].reverse().find(s => s.start < currentTime)
                              if (prev) videoRef.current.currentTime = prev.start
                            }}
                            className="pointer-events-auto bg-black/60 text-white px-2 py-1 rounded-full text-xs backdrop-blur-sm hover:bg-black/80"
                          >
                            ◀ Prev Mark
                          </button>

                          {/* Next Mark */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              const next = segments.find(s => s.start > currentTime)
                              if (next) videoRef.current.currentTime = next.start
                            }}
                            className="pointer-events-auto bg-black/60 text-white px-2 py-1 rounded-full text-xs backdrop-blur-sm hover:bg-black/80"
                          >
                            Next Mark ▶
                          </button>
                        </div>
                      

                        <div className="relative w-full h-2 bg-gray-300 rounded-full my-2">
                          {segments.map(s => (
                            <div
                              key={s.id}
                              className="absolute w-2 h-2 rounded-full cursor-pointer"
                              style={{
                                left: `${(s.start / videoRef.current?.duration) * 100}%`,
                                background: s.redflag
                                  ? "red"
                                  : s.factMinus?.length
                                  ? "orange"
                                  : s.doubt
                                  ? "yellow"
                                  : s.factPlus?.length
                                  ? "green"
                                  : "gray"
                              }}
                              onClick={() => videoRef.current.currentTime = s.start}
                            />
                          ))}
                        </div>
                      </div>
                      {/* Right: Transcript + Key Moments */}
                      <div className="relative pl-6 space-y-3 overflow-y-auto" 
                                      style={{maxHeight: videoHeight  }}>

                        {segments && segments.length > 0 && (
                          <div>
                            <h5 className="font-semibold text-foreground mb-2">Transcription:</h5>
                            {currentSegment && (
                              <p className="text-sm font-semibold text-primary mb-2">
                                🎬 {currentSegment.title}
                              </p>
                            )}
                            {/* Only show the current segment text */}
                            <div className="p-2 bg-muted/30 rounded text-sm transition-opacity duration-200">
                              {currentSegment ? currentSegment.text : "…"}
                            </div>
                          </div>
                        )}
                        {/* Key Moments Timeline */}
                        <div>
                          {/*<h5 className="text-sm font-semibold text-foreground mb-3">Key Moments</h5> */}
                          {segments.length > 0 ? (
                            <div className="relative pl-6 space-y-4">
                              {/* Vertical timeline line */}
                              <div className="absolute left-2 top-0 bottom-0 w-[2px] bg-muted"></div>
                              {segments.map((segment, idx) => (
                                <div key={idx} className="relative">

                                  {/* Timeline dot */}
                                  <div className="absolute -left-5 top-1 w-3 h-3 rounded-full bg-primary border-2 border-background"></div>
                              
                                  {/* Content */}
                                  <div className="flex items-start space-x-2 text-sm">
                                    <span className="text-muted-foreground font-mono text-xs whitespace-nowrap">
                                      {formatTime(segment.start)}
                                    </span>
                                    
                                    <div className="flex items-center space-x-1.5 flex-shrink-0">
                                      {segment.redflag && (
                                        <FaExclamationTriangle className="text-red-600" size={14} />
                                      )}
                                      {segment.doubt && (
                                        <FaQuestionCircle className="text-yellow-600" size={14} />
                                      )}
                                      {segment.factPlus && segment.factPlus.length > 0 && (
                                        <FaCheckCircle className="text-green-600" size={14} />
                                      )}
                                      {segment.factMinus && segment.factMinus.length > 0 && (
                                        <FaTimesCircle className="text-orange-600" size={14} />
                                      )}
                                    </div>
                                    
                                    <span
                                      className="text-foreground flex-1 cursor-pointer hover:underline"
                                      onClick={() => {
                                        const video = videoRef.current;
                                        video.currentTime = segment.start;
                                        if (video.paused) video.play();
                                      }}
                                    >
                                      {segment.title}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">No key moments detected</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No video available for this question
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


            {/* Bottom Right: Your Decision Panel 
            <div className="interview-card glass-effect p-6">
              <h2 className="text-xl font-bold text-foreground mb-4">Your Decision</h2>
              <div className="space-y-4">
                {/* Overall score row */}
                {/*<div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Overall score:</div>
                  <div className="flex items-center space-x-2 group">
                    {editingScore ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min={0}
                          max={10}
                          value={localOverall ?? ''}
                          onChange={(e) => setLocalOverall(e.target.value)}
                          className="w-16 p-1 rounded border bg-card/5 text-sm"
                        />
                        <button onClick={() => handleOverallSave(localOverall)} className="text-sm px-2 py-1 rounded bg-primary text-primary-foreground">Save</button>
                        <button onClick={() => { setEditingScore(false); setLocalOverall(typeof currentInstance?.overall_ai_analysis === 'object' ? currentInstance.overall_ai_analysis?.overallScore : (currentInstance?.overall_ai_analysis && tryParseJSON(currentInstance.overall_ai_analysis)?.overallScore)) }} className="text-sm px-2 py-1 rounded border">Cancel</button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <div className="font-semibold">{localOverall ?? '—'} /10</div>
                        <button onClick={() => setEditingScore(true)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted/30">
                          <FaEdit size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Skills header */}
                {/*<div className="text-sm text-muted-foreground font-medium">Skills:</div>


                {/* Skills list - show first 3 by default */}
                {/*<div className="space-y-2">
                  {localSkills ? (
                    Object.entries(localSkills).slice(0, showAllSkills ? undefined : 3).map(([key, val]) => (
                      <div key={key} className="flex items-center justify-between">
                        <div className="text-sm truncate w-48">{key}</div>
                        <div className="flex items-center space-x-2 group">
                          {editingSkillKey === key ? (
                            <div className="flex items-center space-x-2">
                              <input type="number" min={0} max={10} value={val} onChange={(e) => setLocalSkills(prev => ({ ...prev, [key]: e.target.value }))} className="w-14 p-1 rounded border bg-card/5 text-sm" />
                              <button onClick={() => handleSkillSave(key, localSkills[key])} className="text-sm px-2 py-1 rounded bg-primary text-primary-foreground">Save</button>
                              <button onClick={() => setEditingSkillKey(null)} className="text-sm px-2 py-1 rounded border">Cancel</button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <div className="font-semibold">{val} /10</div>
                              <button onClick={() => setEditingSkillKey(key)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted/30">
                                <FaEdit size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">No AI analysis available</div>
                    )}

                    {localSkills && Object.keys(localSkills).length > 3 && (
                      <button onClick={() => setShowAllSkills(!showAllSkills)} className="text-sm text-primary hover:underline">
                        {showAllSkills ? 'Show less' : 'View all'}
                      </button>
                    )}
                  </div>


                  {/* Notes */}
                  {/*<div>
                    <div className="text-sm text-muted-foreground font-medium mb-2">Notes:</div>
                    <textarea
                      value={localNotes}
                      onChange={(e) => setLocalNotes(e.target.value)}
                      placeholder="Your feedback from the interview"
                      className="w-full rounded-lg p-3 border bg-card/5 text-sm max-h-36 overflow-y-auto"
                      style={{ minHeight: '3.2rem' }} // roughly 2 sentence height; will scroll vertically if larger
                      onBlur={handleNotesSave}
                    />
                  </div>


                  {/* Decision buttons */}
                  {/*<div>
                    <div className="text-sm text-muted-foreground font-medium mb-2">Decision:</div>
                    
                  </div>

                {/* Action Buttons */}
                {/*<div className="space-y-3">
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
                </div>*/}

                {/* Next candidate summary and view all status */}
                {/*<div className="text-sm text-muted-foreground">
                  <div>Next: <span className="font-semibold">{nextCandidate ? (candidates.find(c => c.id === nextCandidate.candidate_id)?.name || 'Unknown') : 'None'}</span> ({numLeft} left)</div>
                  <button onClick={() => router.push('/results')} className="mt-2 text-sm text-primary hover:underline">View all status</button>
                </div>

              </div>
            </div> */}
          
export default function AdminResults() {
  return (
    <ProtectedRoute adminOnly={true}>
      <AdminResultsContent />
    </ProtectedRoute>
  )
}