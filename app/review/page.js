// file: app/review/page.js
'use client'
import { useState, useEffect, useTransition, useRef } from 'react'
import { FaFileAlt, FaBrain, FaVideo, FaComment, FaCheckCircle, FaTimesCircle, FaClock, FaDownload, FaEye, FaCircle, FaDotCircle, FaSpinner, FaCheck, FaTimes, FaFire, FaExclamationTriangle, FaStar, FaChevronLeft, FaChevronRight, FaUser, FaEdit, FaQuestionCircle, FaClipboardList, FaInfoCircle, FaEllipsisV   } from 'react-icons/fa'
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
  const [currentStep, setCurrentStep] = useState('BASIC')
  const [unlockedSteps, setUnlockedSteps] = useState(['BASIC'])

  


  // --- Local UI states for Decision Panel ---
  const [editingScore, setEditingScore] = useState(false)
  const [editingSkillKey, setEditingSkillKey] = useState(null)
  const [localOverall, setLocalOverall] = useState(null)
  const [localSkills, setLocalSkills] = useState(null)
  const [localNotes, setLocalNotes] = useState('')
  const [localNumCultureFit, setLocalNumCultureFit] = useState('')
  const [localEvalCultureFit, setLocalEvalCultureFit] = useState('')
  const [showAllSkills, setShowAllSkills] = useState(false)
  const [saving, setSaving] = useState(false)
  const [navigationTab, setNavigationTab] = useState('questions')

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
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (interviewId) {
      fetchResults()
    }
  }, [interviewId])

  // Conversation UI: 
  // Progressive visibility
  const [visibleMessages, setVisibleMessages] = useState({
    basic: 0,
    experience: 0,
    resume: 0,
    motivation: 0,
    softSkills: 0,
    culture: 0
  });
  // chatAreaRef for scroll container
  const chatAreaRef = useRef(null);

  // Scroll sync effect (maps scroll position to currentStep)
  useEffect(() => {
    const area = chatAreaRef.current;
    if (!area) return;

    const panels = [
      { id: 'basic-panel', step: 'BASIC' },
      { id: 'experience-panel', step: 'EXPERIENCE' },
      { id: 'resume-panel', step: 'RESUME' },
      { id: 'motivation-panel', step: 'MOTIVATION' },
      { id: 'soft-skills-panel', step: 'SOFT-SKILLS' },
      { id: 'culture-panel', step: 'CULTURE' },
    ];

    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        const scrollPos = area.scrollTop + area.clientHeight / 2;
        let active = currentStep;

        for (let i = panels.length - 1; i >= 0; i--) {
          const el = document.getElementById(panels[i].id);
          if (el && el.offsetTop <= scrollPos) {
            active = panels[i].step;
            break;
          }
        }

        //if (active !== currentStep) setCurrentStep(active);
        ticking = false;
      });
    };

    area.addEventListener('scroll', handleScroll);
    return () => area.removeEventListener('scroll', handleScroll);
  }, [currentStep]);

  // Progressive message reveal effect
  useEffect(() => {
    const stepMessageCounts = {
      'BASIC': { key: 'basic', count: 2 },
      'EXPERIENCE': { key: 'experience', count: 2 },
      'RESUME': { key: 'resume', count: 2 },
      'MOTIVATION': { key: 'motivation', count: 2 },
      'SOFT-SKILLS': { key: 'softSkills', count: 2 },
      'CULTURE': { key: 'culture', count: 2 },
    };

    const stepConfig = stepMessageCounts[currentStep];
    if (!stepConfig) return;

    // Only initialize if messages haven't been started
    if (visibleMessages[stepConfig.key] > 0) return

    const timers = [];
    for (let i = 1; i <= stepConfig.count; i++) {
      timers.push(
        setTimeout(() => {
          setVisibleMessages(prev => ({ ...prev, [stepConfig.key]: i }));
        }, i * 1)
      );
    }

    return () => timers.forEach(timer => clearTimeout(timer));
  }, [currentStep]);

  // Auto-scroll when content appears
  const lastVisibleRef = useRef({});

  useEffect(() => {
    const area = chatAreaRef.current;
    if (!area) return;

    const totalVisible = Object.values(visibleMessages).reduce((a, b) => a + b, 0);

    if (lastVisibleRef.current.total !== totalVisible) {
      area.scrollTo({ top: area.scrollHeight, behavior: 'smooth' });
      lastVisibleRef.current.total = totalVisible;
    }
  }, [visibleMessages]);

  const handleStepChange = (step) => {
    setCurrentStep(step);

    setTimeout(() => {
      const area = chatAreaRef.current;
      const panel = document.getElementById(stepToPanelId[step]);
      if (area && panel) {
        area.scrollTo({ top: panel.offsetTop, behavior: 'smooth' });
      }
    }, 10);
  };

  useEffect(() => {
    console.log('Unlocked steps changed:', unlockedSteps)
  }, [unlockedSteps])

  useEffect(() => {
    console.log('Current step changed:', currentStep)
  }, [currentStep])

  const handleUnlockNextStep = () => {
    const steps = ['BASIC', 'EXPERIENCE', 'RESUME', 'MOTIVATION', 'SOFT-SKILLS', 'CULTURE']
    const currentIndex = steps.indexOf(currentStep)
    const stepMessageCounts = {
      'BASIC': { key: 'basic', count: 2 },
      'EXPERIENCE': { key: 'experience', count: 2 },
      'RESUME': { key: 'resume', count: 2 },
      'MOTIVATION': { key: 'motivation', count: 2 },
      'SOFT-SKILLS': { key: 'softSkills', count: 2 },
      'CULTURE': { key: 'culture', count: 2 },
    };
    if (currentIndex < steps.length - 1) {
      console.log('handleUnlockNextStep starting...')
      const nextStep = steps[currentIndex + 1]
      console.log('next Step: ', nextStep)
      console.log('current index: ', currentIndex)
      console.log('Step', currentStep)
      console.log('Unlocked steps: ', unlockedSteps)
      console.log('visibleMessages: ',visibleMessages)
      const step = steps[currentIndex]
      const stepConfig = stepMessageCounts[nextStep]
      setUnlockedSteps(prev => [...new Set([...prev, nextStep])])
      handleStepChange(nextStep)
      
      setVisibleMessages(prev => ({ ...prev, [stepConfig.key] : stepConfig.count }))
      console.log('handleUnlockNextStep done...')
      
    }
  }
  useEffect(() => {
    console.log('🔁 AdminResultsContent mounted or remounted');
    return () => console.log('🧹 AdminResultsContent unmounted');
  }, []);

  // Step-to-panel mapping
  const stepToPanelId = {
    'BASIC': 'basic-panel',
    'EXPERIENCE': 'experience-panel',
    'RESUME': 'resume-panel',
    'MOTIVATION': 'motivation-panel',
    'SOFT-SKILLS': 'soft-skills-panel',
    'CULTURE': 'culture-panel',
  };

  // Step-to-category mapping
  const stepToCategory = {
    'BASIC': 'basic',
    'EXPERIENCE': 'experience',
    'RESUME': 'resume',
    'MOTIVATION': 'motivation',
    'SOFT-SKILLS': 'soft_skills', 
    'CULTURE': 'culture',
  };

  const getQuestionsByCategory = (questions, step) => {
    const category = stepToCategory[step];  
    return questions
      .filter(q => q.category === category)
      .sort((a, b) => a.position - b.position);
  };

  const [currentBasicQuestions, setCurrentBasicQuestions] = useState([])
  const [currentBasicAnswers, setCurrentBasicAnswers] = useState([])
  const [currentExperienceQuestions, setCurrentExperienceQuestions] = useState([])
  const [currentExperienceAnswers, setCurrentExperienceAnswers] = useState([])
  const [currentMotivationQuestions, setCurrentMotivationQuestions] = useState([])
  const [currentMotivationAnswers, setCurrentMotivationAnswers] = useState([])
  const [currentResumeQuestions, setCurrentResumeQuestions] = useState([])
  const [currentResumeAnswers, setCurrentResumeAnswers] = useState([])


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

  

  // When currentInstance changes, hydrate local editable copies
  useEffect(() => {
    const currentInstance = interviewCandidates[currentCandidateIndex]
    const analysis = currentInstance?.overall_ai_analysis || null

    setCurrentBasicQuestions(getQuestionsByCategory(interviewQuestions, 'BASIC'))
    setCurrentExperienceQuestions(getQuestionsByCategory(interviewQuestions, 'EXPERIENCE'))
    setCurrentMotivationQuestions(getQuestionsByCategory(interviewQuestions, 'MOTIVATION'))
    setCurrentResumeQuestions(getQuestionsByCategory(interviewQuestions, 'RESUME'))
    const interviewCandidateResponses = interviewAnswers[currentInstance?.id] || [];

    setCurrentBasicAnswers(currentBasicQuestions.map(q =>
      interviewCandidateResponses.find(r => r.interview_question_id === q.id)
    ))
    setCurrentExperienceAnswers(currentExperienceQuestions.map(q =>
      interviewCandidateResponses.find(r => r.interview_question_id === q.id)
    ))
    setCurrentMotivationAnswers(currentMotivationQuestions.map(q =>
      interviewCandidateResponses.find(r => r.interview_question_id === q.id)
    ))
    console.log('Use effect setting up a new Instance...')
    console.log('InterviewCandidates? ', interviewCandidates)
    console.log('currentCandidateIndex? ', currentCandidateIndex)
    console.log('Is there analysis? ', analysis)
    if (analysis) {
      // Defensive: make sure it's an object
      const parsed = typeof analysis === 'string' ? tryParseJSON(analysis) : analysis
      setLocalOverall(parsed?.overallScore ?? null)
      setLocalSkills(parsed?.skillEvaluations ? { ...parsed.skillEvaluations } : null)
      setLocalNotes(currentInstance?.notes ?? '')
      setLocalNumCultureFit(parsed?.cultureFit ?? '')
      setLocalEvalCultureFit(parsed?.cultureFitEvaluation ?? '' )
      console.log('AI analysis:', parsed)
    } else {
      setLocalOverall(null)
      setLocalSkills(null)
      setLocalNotes(currentInstance?.notes ?? '')
    }
  }, [interviewCandidates])

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

  const handleNext = () => {
    console.log('Next candidate....')
    console.log('currentCandidateIndex: ',currentCandidateIndex)
    console.log('interviewCandidates.length: ',interviewCandidates.length)
    if (currentCandidateIndex === interviewCandidates.length-1) {
      startTransition(() => {
        router.push('/homepage')
      })
    }else {
      setCurrentCandidateIndex(currentCandidateIndex + 1)
    }
    
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
  const togglePlay = () => {
  if (!videoRef.current) return;
  if (isPlaying) {
    videoRef.current.pause();
  } else {
    videoRef.current.play();
  }
  setIsPlaying(!isPlaying);
};

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
        if (currentCandidateIndex === interviewCandidates.length-1){
          startTransition(() => {
            router.push('/homepage')
          })
        }else{
          setInterviewCandidates(prev => prev.filter((_, i) => i !== currentCandidateIndex))
          setCurrentCandidateIndex(i => Math.max(0, i - 1))
        }
         
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
    const skills = { ...(analysis.skillsEvaluations || {}) }
    skills[key] = Number(value)
    const newAnalysis = { ...analysis, skillsEvaluations: skills }
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

  // Initialize visible messages for first step
  useEffect(() => {
    // Initialize first step immediately
    setVisibleMessages(prev => ({ ...prev, basic: 2 }))
  }, [])

  const [actionsOpen, setActionsOpen] = useState(false)

  
  
  const handlePrevStep = () => {
    const steps = ['BASIC', 'EXPERIENCE', 'RESUME', 'MOTIVATION', 'SOFT-SKILLS', 'CULTURE']
    const index = steps.indexOf(currentStep)
    if (index > 0) handleStepChange(steps[index - 1])
  }

  const handleNextStep = () => {
    const steps = ['BASIC', 'EXPERIENCE', 'RESUME', 'MOTIVATION', 'SOFT-SKILLS', 'CULTURE']
    const index = steps.indexOf(currentStep)
    if (index < steps.length - 1) handleStepChange(steps[index + 1])
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

  // helper for next candidate text
  const nextCandidate = interviewCandidates[currentCandidateIndex + 1]
  const numLeft = Math.max(0, interviewCandidates.length - (currentCandidateIndex + 1))

  return (
    <div className="flex h-screen bg-muted/70 overflow-hidden">
      <Navigation />

      {/* Main Content Area */}
      <div className="bg-muted/70 flex-1 flex flex-col overflow-hidden pr-2">

        {/* Top Panel - Candidate Overview */}
        <div className="bg-muted/70 px-4 py-3">
          <div className="relative flex items-center justify-between w-full gap-2 overflow-hidden">
          
            {/* Left: Name, OverallScore and Status */}
            <div className="flex items-center gap-2 min-w-0 truncate">
              <a 
                href={currentCandidate?.linkedin_profile?.url || '#'} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-lg font-semibold text-foreground hover:text-primary transition-colors"
                title="View LinkedIn profile"
              >
                {currentCandidate?.name || 'Unknown Candidate'}
              </a>
              <span className="text-sm text-muted-foreground">
                {currentCandidateIndex + 1} of {interviewCandidates.length}
              </span>

              {/* Overall score */}
              <span className="text-green-600 font-semibold text-sm">{localOverall}% match</span>

              {/* Status Badge */} 
              <div 
                className="relative group cursor-pointer flex-shrink-0"
                title={
                  currentInstance.status === 'completed' ? 'Not reviewed yet' :
                  currentInstance.status === 'reviewing' ? 'In progress' :
                  currentInstance.status === 'reviewed' ? 'To reject/approve' :
                  'Pending'
                }
              >
                <FaInfoCircle 
                  className={`w-5 h-5 ${
                    currentInstance.status === 'completed' ? 'text-blue-500' :
                    currentInstance.status === 'reviewing' ? 'text-amber-500' :
                    currentInstance.status === 'reviewed' ? 'text-teal-500' :
                    'text-muted-foreground'
                  }`}
                />
              </div>
            </div>

            {/* Middle: Interview Navigation */}
            <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-2 text-sm text-muted-foreground">
              {/* Normal mode (md and up) */}
              <div className="hidden md:flex items-center gap-2">
                {['BASIC', 'EXPERIENCE', 'RESUME', 'MOTIVATION', 'SOFT-SKILLS', 'CULTURE'].map((step, idx) => {
                  // Define visibility/unlock rules
                  const stepUnlocked = unlockedSteps.includes(step);

                  return (
                    <div key={step} className="flex items-center">
                      <button
                        onClick={() => stepUnlocked && handleStepChange(step)}
                        disabled={!stepUnlocked}
                        className={`relative px-2 py-1 font-medium hover:text-primary transition-colors ${
                          currentStep === step ? 'text-primary after:content-[""] after:absolute after:left-0 after:bottom-0 after:w-full after:h-0.5 after:bg-primary after:rounded-full' : ''
                        }`}
                      >
                        {step}
                      </button>
                      {idx < 5 && <span className="text-muted-foreground mx-1">›</span>}
                    </div>
                  )
                })}
              </div>  

              {/* Compact mode (below md) */}
              <div className="flex md:hidden items-center gap-3">
                <button
                  onClick={handlePrevStep}
                  className="p-1 rounded-full hover:bg-muted transition"
                  title="Previous step"
                >
                  <FaChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium text-foreground">{currentStep}</span>
                <button
                  onClick={handleNextStep}
                  className="p-1 rounded-full hover:bg-muted transition"
                  title="Next step"
                >
                  <FaChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Right: Action Buttons */} 
            <div className="flex items-center gap-3 ml-auto"> 
              {/* Full buttons on md+ */}
              <div className="hidden sm:flex items-center gap-3">
                {[
                  { action: 'Reject', icon: FaTimes, color: 'red', active: localOverall < 40 },
                  { action: 'Review later', icon: FaQuestionCircle, color: 'gray', active: false },
                  { action: 'Shortlist', icon: FaCheck, color: 'green', active: localOverall > 70 }
                ].map(({ action, icon: Icon, color, active }) => (
                  <button
                    key={action}
                    onClick={() => handleDecisionClick(action)}
                    title={action}
                    className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-150
                      ${active 
                        ? color === 'green' ? 'bg-green-100 text-green-600 border-green-300' :
                          color === 'red' ? 'bg-red-100 text-red-600 border-red-300' :
                          'bg-primary/10 text-primary border-primary/30'
                        : 'text-muted-foreground border-border hover:text-foreground'}
                    `}
                  >
                    <Icon size={16} />
                  </button>
                ))} 
              </div>
              
              {/* 3-dot menu for xs */}
              <div className="relative sm:hidden">
                <button
                  onClick={() => setActionsOpen(!actionsOpen)}
                  className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground"
                  title="More actions"
                >
                  <FaEllipsisV size={16} />
                </button>

                {actionsOpen && (
                  <div className="absolute right-0 mt-2 bg-card border border-border rounded-lg shadow-md z-50">
                    {[
                      { action: 'Shortlist', icon: FaCheck },
                      { action: 'Review later', icon: FaQuestionCircle },
                      { action: 'Reject', icon: FaTimes },
                    ].map(({ action, icon: Icon }) => (
                      <button
                        key={action}
                        onClick={() => handleDecisionClick(action)}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted/50 transition"
                      >
                        <Icon size={14} />
                        {action}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div> 
          </div> 
        </div>
        {/* Main Content */}
        <div ref={chatAreaRef} className="flex-1 overflow-y-auto p-0">
          <div className="content-page w-full sm:px-6 py-4 sm:py-6 glass-effect shadow-sm border-border overflow-y-auto"
            style={{ 
              minheight: 'calc(100vh - 70px)', 
              marginBottom: 'clamp(0.25rem, 2vw, 0.5rem)', }}
          >
            <div className="max-w-4xl mx-auto flex flex-col space-y-6 pb-24">
              {/* BASIC Panel */}
              {visibleMessages.basic >= 0 && (
                <div id="basic-panel" className="space-y-6">
                  {visibleMessages.basic >= 1 && (
                    <div className="bg-transparent p-4 rounded-lg">
                      {(() => {
                        const flaggedQuestions = currentBasicQuestions.filter((q, idx) => {
                          const a = currentBasicAnswers[idx];
                          const recommendation = a?.ai_analysis?.recommendation;

                          // Check if the recommendation is 'Pass' OR 'Maybe'
                          return recommendation === 'Pass' || recommendation === 'Maybe';
                        });

                        if (flaggedQuestions.length === 0) {
                          return <p className="text-foreground text-base">✓ All essential requirements seem ok.</p>;
                        } else if (flaggedQuestions.length === 1) {
                          return (
                            <p className="text-foreground text-base">
                              ⚠ {flaggedQuestions[0].short_name} might not be satisfied. 
                            </p>
                          );
                        } else {
                          return (
                            <p className="text-foreground text-base">
                              🚩 Essential requirements seem that are not met:</p>
                          );
                        }
                      })()}
                    </div>
                  )}
                  {visibleMessages.basic >= 2 && (
                    <div className="bg-muted/50 p-6 rounded-lg border border-border">
                      {/* Basic content */}
                      {currentBasicQuestions.map((q, idx) => {
                        const a = currentBasicAnswers[idx];
                        const rec = a?.ai_analysis?.recommendation;
                        const color =
                          rec === 'Hire' ? 'bg-green-500' :
                          rec === 'Maybe' ? 'bg-yellow-500' :
                          rec === 'Pass' ? 'bg-red-500' : 'bg-gray-300';
                        return (
                          <details key={q.id} className="p-4 border rounded-2xl mb-2">
                            <summary className="flex items-center gap-2 cursor-pointer">
                              <span className={`w-3 h-3 rounded-full ${color}`} />
                              <span className="font-medium">{q.short_name}</span>
                            </summary>
                            <div className="mt-2 space-y-2 pl-5">
                              <p className="text-sm text-gray-700">{q.question_text}</p>
                              <p className="text-sm text-gray-600 italic">{a?.transcription}</p>
                              <p className="text-sm text-gray-500">{a?.ai_analysis?.reasoning}</p>
                            </div>
                          </details>
                        )
                      })}
                    </div>
                  )}
                  {currentStep === 'BASIC' && (
                    <div className="flex justify-center mt-6">
                      <button
                        onClick={handleUnlockNextStep}
                        className="w-12 h-12 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
                        title="Continue to next section"
                      >
                        <FaChevronRight className="rotate-90" size={20} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* EXPERIENCE Panel */}
              <div id="experience-panel" className="space-y-6">
                {unlockedSteps.includes('EXPERIENCE') && visibleMessages.experience >= 1 && (
                  <div className="bg-transparent p-4 rounded-lg">
                    {(() => {
                      const flaggedQuestions = currentExperienceQuestions.filter((q, idx) => {
                        const a = currentExperienceAnswers[idx];
                        const recommendation = a?.ai_analysis?.recommendation;

                        // Check if the recommendation is 'Pass' OR 'Maybe'
                        return recommendation === 'Pass' || recommendation === 'Maybe';
                      });

                      if (flaggedQuestions.length === 0) {
                        return <p className="text-foreground text-base">✓ All ok</p>;
                      } else if (flaggedQuestions.length === 1) {
                        return (
                          <p className="text-foreground text-base">
                            ⚠ Is {flaggedQuestions[0].short_name} critical for the position?
                          </p>
                        );
                      } else {
                        return (
                          <p className="text-foreground text-base">
                            🚩 Insufficient experience for this position.</p>
                        );
                      }
                    })()}
                  </div>
                )}
                {unlockedSteps.includes('EXPERIENCE') && visibleMessages.experience >= 2 && (
                  <div className="bg-muted/50 p-6 rounded-lg border border-border">
                    {/* Experience content */}
                    {currentExperienceQuestions.map((q, idx) => {
                      const a = currentExperienceAnswers[idx];
                      const rec = a?.ai_analysis?.recommendation;
                      const color =
                        rec === 'Hire' ? 'bg-green-500' :
                        rec === 'Maybe' ? 'bg-yellow-500' :
                        rec === 'Pass' ? 'bg-red-500' : 'bg-gray-300';
                      return (
                        <details key={q.id} className="p-4 border rounded-2xl mb-2">
                          <summary className="flex items-center gap-2 cursor-pointer">
                            <span className={`w-3 h-3 rounded-full ${color}`} />
                            <span className="font-medium">{q.short_name}</span>
                          </summary>
                          <div className="mt-2 space-y-2 pl-5">
                            <p className="text-sm text-gray-700">{q.question_text}</p>
                            <p className="text-sm text-gray-600 italic">{a?.transcription}</p>
                            <p className="text-sm text-gray-500">{a?.ai_analysis?.reasoning}</p>
                          </div>
                        </details>
                      )
                    })}
                  </div>
                )}
                {currentStep === 'EXPERIENCE' && (
                  <div className="flex justify-center mt-6">
                    <button
                      onClick={handleUnlockNextStep}
                      className="w-12 h-12 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
                      title="Continue to next section"
                    >
                      <FaChevronRight className="rotate-90" size={20} />
                    </button>
                  </div>
                )}
              </div>

              {/* RESUME Panel */}
              <div id="resume-panel" className="space-y-6">
                {unlockedSteps.includes('RESUME') && visibleMessages.resume >= 1 && (
                  <div className="bg-transparent p-4 rounded-lg">
                    {(() => {
                      const flaggedQuestions = currentResumeQuestions.filter((q, idx) => {
                        const a = currentExperienceAnswers[idx];
                        const recommendation = a?.ai_analysis?.recommendation;

                        // Check if the recommendation is 'Pass' OR 'Maybe'
                        return recommendation === 'Pass' || recommendation === 'Maybe';
                      });

                      if (flaggedQuestions.length === 0) {
                        return <p className="text-foreground text-base">✓ Great candidate:</p>;
                      } else if (flaggedQuestions.length === 1) {
                        return (
                          <p className="text-foreground text-base">
                            ⚠ Check {flaggedQuestions[0].short_name} answer to be sure.
                          </p>
                        );
                      } else {
                        return (
                          <p className="text-foreground text-base">
                            🚩 There are a lot of question marks about their resume.</p>
                        );
                      }
                    })()}
                  </div>
                )}
                {unlockedSteps.includes('RESUME') && visibleMessages.resume >= 2 && (
                  <div className="bg-muted/50 p-6 rounded-lg border border-border">
                    {/* Soft skills content - include AI panel, video, etc. */}
                    {currentResumeQuestions.map((q, idx) => {
                      const a = currentExperienceAnswers[idx];
                      const rec = a?.ai_analysis?.recommendation;
                      const color =
                        rec === 'Hire' ? 'bg-green-500' :
                        rec === 'Maybe' ? 'bg-yellow-500' :
                        rec === 'Pass' ? 'bg-red-500' : 'bg-gray-300';
                      return (
                        <details key={q.id} className="p-4 border rounded-2xl mb-2">
                          <summary className="flex items-center gap-2 cursor-pointer">
                            <span className={`w-3 h-3 rounded-full ${color}`} />
                            <span className="font-medium">{q.short_name}</span>
                          </summary>
                          <div className="mt-2 space-y-2 pl-5">
                            <p className="text-sm text-gray-700">{q.question_text}</p>
                            <p className="text-sm text-gray-600 italic">{a?.transcription}</p>
                            <p className="text-sm text-gray-500">{a?.ai_analysis?.reasoning}</p>
                          </div>
                        </details>
                      )
                    })}
                  </div>
                )}
                {currentStep === 'RESUME' && (
                  <div className="flex justify-center mt-6">
                    <button
                      onClick={handleUnlockNextStep}
                      className="w-12 h-12 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
                      title="Continue to next section"
                    >
                      <FaChevronRight className="rotate-90" size={20} />
                    </button>
                  </div>
                )}
              </div>
              

              {/* MOTIVATION Panel */}
              <div id="motivation-panel" className="space-y-6">
                {unlockedSteps.includes('MOTIVATION') && visibleMessages.motivation >= 1 && (
                  <div className="bg-transparent p-4 rounded-lg">
                    {(() => {
                      console.log('currentMotivationQuestions: ', currentMotivationQuestions)
                      const flaggedQuestions = currentMotivationQuestions.filter((q, idx) => {
                        const a = currentMotivationAnswers[idx];
                        const recommendation = a?.ai_analysis?.recommendation;

                        // Check if the recommendation is 'Pass' OR 'Maybe'
                        return recommendation === 'Pass' || recommendation === 'Maybe';
                      });

                      if (flaggedQuestions.length === 0) {
                        return <p className="text-foreground text-base">✓ Shows clear enthusiasm and motivation for the role.</p>;
                      } else {
                        return (
                          <p className="text-foreground text-base">
                            🚩 Motivation and interest do not come across strongly:</p>
                        );
                      }
                    })()}
                  </div>
                )}
                {unlockedSteps.includes('MOTIVATION') && visibleMessages.motivation >= 2 && (
                  <div className="bg-muted/50 p-6 rounded-lg border border-border">
                    {/* Motivation content */}
                    {currentMotivationQuestions.map((q, idx) => {
                      const a = currentMotivationAnswers[idx];
                      const rec = a?.ai_analysis?.recommendation;
                      const color =
                        rec === 'Hire' ? 'bg-green-500' :
                        rec === 'Maybe' ? 'bg-yellow-500' :
                        rec === 'Pass' ? 'bg-red-500' : 'bg-gray-300';
                      return (
                        <details key={q.id} className="p-4 border rounded-2xl mb-2">
                          <summary className="flex items-center gap-2 cursor-pointer">
                            <span className={`w-3 h-3 rounded-full ${color}`} />
                            <span className="font-medium">{q.short_name}</span>
                          </summary>
                          <div className="mt-2 space-y-2 pl-5">
                            <p className="text-sm text-gray-700">{q.question_text}</p>
                            <p className="text-sm text-gray-600 italic">{a?.transcription}</p>
                            <p className="text-sm text-gray-500">{a?.ai_analysis?.reasoning}</p>
                          </div>
                        </details>
                      )
                    })}
                  </div>
                )}
                {currentStep === 'MOTIVATION' && (
                  <div className="flex justify-center mt-6">
                    <button
                      onClick={handleUnlockNextStep}
                      className="w-12 h-12 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
                      title="Continue to next section"
                    >
                      <FaChevronRight className="rotate-90" size={20} />
                    </button>
                  </div>
                )}
              </div>
              

              {/* SOFT-SKILLS Panel */}
              <div id="soft-skills-panel" className="space-y-6">
                {unlockedSteps.includes('SOFT-SKILLS') && visibleMessages.softSkills >= 1 && (
                  <div className="bg-transparent p-4 rounded-lg">
                    {localSkills ? (
                      (() => {
                          console.log('localSkills: ', localSkills)
                          const flaggedSkills = Object.entries(localSkills)
                            .filter(([_, value]) => value < 7)
                            .map(([key]) => key);

                          const goodSkills = Object.entries(localSkills)
                            .filter(([_, value]) => value > 7)
                            .map(([key]) => key);

                          const greatSkills = Object.entries(localSkills)
                            .filter(([_, value]) => value > 9)
                            .map(([key]) => key);
                          
                          
                          if (flaggedSkills.length > 1) {
                            return <p className="text-foreground text-base">Light on {flaggedSkills.length} skills.</p>;
                          } else if (flaggedSkills.length === 0 && greatSkills.length > 0 && greatSkills.length < 3) {
                            return <p className="text-foreground text-base">Strong on {greatSkills.join(', ')}</p>;
                          } else if (flaggedSkills.length === 0 && greatSkills.length >= 3) {
                            return <p className="text-foreground text-base">Strong soft-skills candidate.</p>;
                          } else if (flaggedSkills.length === 0 && greatSkills.length === 0) {
                            return <p className="text-foreground text-base">No shortcomings or strong points identified.</p>;
                          } else{
                            return null; // fallback for any other cases
                          }
                        })()
                    ):(
                      
                        (() => {
                          console.log('localSkills: ', localSkills)
                          return(
                          <p className="text-foreground text-base">No AI analysis available</p>
                          ) 
                        })()
                  
                    )}
                  </div>
                )}
                {unlockedSteps.includes('SOFT-SKILLS') && visibleMessages.softSkills >= 2 && (
                  <div className="bg-muted/50 p-6 rounded-lg border border-border">
                    {/* Soft skills content - include AI panel, video, etc. */}
                    {localSkills ? (
                      Object.entries(localSkills).map(([key, val]) => (
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
                  </div>    
                )}
                {currentStep === 'SOFT-SKILLS' && (
                  <div className="flex justify-center mt-6">
                    <button
                      onClick={handleUnlockNextStep}
                      className="w-12 h-12 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
                      title="Continue to next section"
                    >
                      <FaChevronRight className="rotate-90" size={20} />
                    </button>
                  </div>
                )}
              </div>
              
              {/* CULTURE Panel */}
              <div id="culture-panel" className="space-y-6">
                {unlockedSteps.includes('CULTURE') && visibleMessages.culture >= 1 && (
                  <div className="bg-transparent p-4 rounded-lg">
                    {interviewData.company_culture === "" ? (
                      <p className="text-foreground text-base">The company culture wasn't filled in the interview setup.</p>
                    ):(
                      
                      (() => {
                        const color =
                        localNumCultureFit >= '8' ? 'bg-green-500' :
                        localNumCultureFit > '6' && localNumCultureFit < '8' ? 'bg-yellow-500' :
                        localNumCultureFit <= '6' ? 'bg-red-500' : 'bg-gray-300';

                        return (

                          <p className="text-foreground text-base">{color} {localEvalCultureFit}</p>
                        )
                      })()
                        
                    )
                    }
                    
                  </div>
                )}
                {currentStep === 'CULTURE' && (
                  <div className="flex justify-center mt-6">
                    <button
                      onClick={handleNext}
                      className="w-12 h-12 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
                      title="Continue to next section"
                    >
                      <FaChevronRight className="rotate-90" size={20} />
                    </button>
                  </div>
                )}
              </div>

            </div>

            {/* {!showVideo && (
              <>  
                {/* Top Right: AI Assessment Panel */}
                {/*<div ref={AIPanelRef} className="p-6">
                  {/* Header: Title + AI Score & Confidence with Icons + Chevron */}
                {/*  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      {/* Title */}
                {/*      <h2 className="text-xl font-bold text-foreground">AI Assessment</h2>

                      {/* NEW — video icon triggers showVideo */}
                {/*      <button onClick={() => setShowVideo(true)} className="p-2 hover:bg-muted rounded-lg">
                        <FaVideo size={16} />
                      </button>
                    </div>
                    {currentResponse?.ai_analysis && (
                      <div>
                        {/* Row 1: AI Score & Confidence with Icons */}
                {/*        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center space-x-3">
                            <span className="text-sm text-muted-foreground">AI Score:</span>
                            <span className="font-bold text-lg">{currentResponse.ai_analysis.overallScore || '—'}</span>
                            <span className="text-muted-foreground">/10</span>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {/* Red Flag Icon */}
              {/*              {currentResponse.ai_analysis.redFlags && currentResponse.ai_analysis.redFlags.length > 0 && (
                              <div className="relative group">
                                <FaExclamationTriangle className="text-red-600" size={18} />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                  Red Flags
                                </div>
                              </div>
                            )}
                            
                            {/* Doubt Icon */}
              {/*              {currentResponse.ai_analysis.doubts && currentResponse.ai_analysis.doubts.length > 0 && (
                              <div className="relative group">
                                <FaQuestionCircle className="text-yellow-600" size={18} />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                  Doubts
                                </div>
                              </div>
                            )}
                            
                            {/* Fact Plus Icon */}
              {/*              {segments?.some(seg => seg.factPlus && seg.factPlus.length > 0) && (
                              <div className="relative group">
                                <FaCheckCircle className="text-green-600" size={18} />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                  Verified Facts
                                </div>
                              </div>
                            )}
                            
                            {/* Fact Minus Icon */}
              {/*              {segments?.some(seg => seg.factMinus && seg.factMinus.length > 0) && (
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
              {/*        {currentResponse.ai_analysis.reasoning && (
                        <div className="p-4 bg-muted/30 rounded-lg border">
                          <p className="text-sm text-foreground leading-relaxed">
                            {currentResponse.ai_analysis.reasoning}
                          </p>
                        </div>
                      )}

                      {/* Row 3: Verified Facts Toggle */}
              {/*        <div className="border rounded-lg">
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
              {/*        {currentResponse.transcription && (
                        <div className="border rounded-lg">

                          {/* Header: Title + Search + Chevron */}
              {/*            <div className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors">

                            {/* Title */}
              {/*              <div
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
              {/*              <div className="relative w-48"
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
                {/*              <div className="relative">
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
                  {/*            {segments && segments.length > 0 && (
                                <div>
                                  <h5 className="text-sm font-semibold text-foreground mb-3">Key Moments</h5>
                                  <div className="relative pl-6 space-y-3">
                                    {/* Vertical timeline line */}
                  {/*                  <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-muted"></div>

                                    
                                    {segments.map((segment, idx) => (
                                      <div key={idx} className="relative">
                                        {/* Timeline dot */}
                  {/*                      <div className="absolute -left-[22px] top-1 w-3 h-3 rounded-full bg-primary border-2 border-background"></div>
                                      
                                        
                                        {/* Content */}
                  {/*                      <div className="flex items-start space-x-2 text-sm">
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
            )} */}

            {/* Bottom Riht: Video Panel */}
            {/*{showVideo && (
              <div ref={VideoPanelRef} className="p-6">

                {/* Title + Chevron Row */}
            {/*    <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <h2 className="text-xl font-bold text-foreground">Video</h2>
                    {/* NEW — assessment icon returns to AI */}
            {/*        <button onClick={() => setShowVideo(false)} className="p-2 hover:bg-muted rounded-lg">
                      <FaClipboardList size={16} />
                    </button>
                  </div>
                </div>
                
                {currentResponse?.video_url ? (  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Left: Video */}
            {/*        <div className="w-full h-full flex flex-col">
                      <div className="relative w-full">
                        <video
                          ref={videoRef}
                          src={currentResponse.video_url}
                          //controls
                          onTimeUpdate={() => setCurrentTime(videoRef.current.currentTime)}
                          className="w-full rounded-lg bg-black"
                        />

                        {/* Timeline */}
            {/*            <div className="relative w-full h-2 bg-gray-700 rounded-full mt-2 overflow-hidden">
                          {/* Marks behind the timeline */}
            {/*              {segments.map(s => (
                            <div
                              key={s.id}
                              className="absolute top-0 bottom-0 w-[1px] bg-gray-400 opacity-40"
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

                          {/* Cursor showing current time */}
            {/*              <div
                            className="absolute top-0 bottom-0 w-[2px] bg-primary transition-all duration-100"
                            style={{ left: `${(currentTime / videoRef.current?.duration) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Video controls */}
            {/*          <div className="flex items-center justify-center gap-4 mt-3">
                        {/* Go Back */}
                        {/*<button
                          onClick={(e) => {
                              e.stopPropagation()
                              const prev = [...segments].reverse().find(s => s.start < currentTime)
                              if (prev) videoRef.current.currentTime = prev.start
                            }}
                          className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                          title="Go to previous mark"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 text-foreground"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path d="M9.707 14.707a1 1 0 01-1.414 0L3.586 10l4.707-4.707a1 1 0 011.414 1.414L6.414 10l3.293 3.293a1 1 0 010 1.414zM13 5a1 1 0 000 2h3v6h-3a1 1 0 000 2h4a1 1 0 001-1V6a1 1 0 00-1-1h-4z" />
                          </svg>
                        </button>

                        {/* Play / Pause */}
                        {/*<button
                          onClick={togglePlay}
                          className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors"
                          title={isPlaying ? "Pause" : "Play"}
                        >
                          {isPlaying ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M6 4a1 1 0 00-1 1v10a1 1 0 002 0V5a1 1 0 00-1-1zm7 0a1 1 0 00-1 1v10a1 1 0 002 0V5a1 1 0 00-1-1z" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M4.5 3.5v13l11-6.5-11-6.5z" />
                            </svg>
                          )}
                        </button>

                        {/* Go Next */}
                        {/*<button
                          onClick={(e) => {
                              e.stopPropagation()
                              const next = segments.find(s => s.start > currentTime)
                              if (next) videoRef.current.currentTime = next.start
                            }}
                          className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                          title="Go to next mark"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 text-foreground"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path d="M10.293 5.293a1 1 0 011.414 0L16.414 10l-4.707 4.707a1 1 0 01-1.414-1.414L13.586 10l-3.293-3.293a1 1 0 010-1.414zM7 15a1 1 0 000-2H4V7h3a1 1 0 000-2H3a1 1 0 00-1 1v8a1 1 0 001 1h4z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  
                    {/* Right: Transcript + Key Moments */}
                    {/*<div className="relative pl-6 space-y-3 overflow-y-auto" 
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
                          {/*<div className="p-2 bg-muted/30 rounded text-sm transition-opacity duration-200">
                            {currentSegment ? currentSegment.text : "…"}
                          </div>
                        </div>
                      )}
                      {/* Key Moments Timeline */}
                      {/*<div>
                        {/*<h5 className="text-sm font-semibold text-foreground mb-3">Key Moments</h5> */}
                        {/*{segments.length > 0 ? (
                          <div className="relative pl-6 space-y-4">
                            {/* Vertical timeline line */}
                            {/*<div className="absolute left-2 top-0 bottom-0 w-[2px] bg-muted"></div>
                            {segments.map((segment, idx) => (
                              <div key={idx} className="relative">

                                {/* Timeline dot */}
                                {/*<div className="absolute -left-5 top-1 w-3 h-3 rounded-full bg-primary border-2 border-background"></div>
                            
                                {/* Content */}
                                {/*<div className="flex items-start space-x-2 text-sm">
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
            )}*/}
          </div>
        </div>
      </div>
    </div>
  )
}

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
                  </div>*/}
          
export default function AdminResults() {
  return (
    <ProtectedRoute adminOnly={true}>
      <AdminResultsContent />
    </ProtectedRoute>
  )
}