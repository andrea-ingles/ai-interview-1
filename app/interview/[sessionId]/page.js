//file app/interview/[sessionId]/page.js

'use client'
import { useState, useRef, useEffect, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { FaPlay, FaSquare, FaArrowRight, FaCheckCircle, FaCamera, FaClock, FaUser, FaEnvelope, FaPhone, FaBuilding, FaLinkedin, FaFilePdf, FaFileUpload } from 'react-icons/fa'

export default function InterviewPage() {
  const router = useRouter()
  const params = useParams()
  /** @type {string} */
  const sessionId = params.sessionId  // ← CHANGED: Use params instead of router.query
  const videoRef = useRef(null)
  
  const [interview, setInterview] = useState(null)
  const [interviewQuestions, setInterviewQuestions] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState(null)
  const [stream, setStream] = useState(null)
  const [responses, setResponses] = useState({})
  const [timer, setTimer] = useState(0)
  const [isActive, setIsActive] = useState(false)
  const [candidateInfo, setCandidateInfo] = useState({
    name: '',
    email: '',
    phone: '',
    linkedinProfile: null, // Store LinkedIn profile data
    linkedinProfileLink: null, // Store link of Linkedin profile
    cvFile: null, // Store CV file
    cvParsed: null // Store parsed CV data
  })
  const [linkedinAuthInProgress, setLinkedinAuthInProgress] = useState(false)
  const [isLinkedinAuthenticated, setIsLinkedinAuthenticated] = useState(false)
  const [step, setStep] = useState('info') // info, interview, complete
  const [saving, setSaving] = useState(false)
  const [processingError, setProcessingError] = useState(null)
  const [isPending, startTransition] = useTransition();
  const [interviewInstanceId, setInterviewInstanceId] = useState(null)

  // Timer effect
  useEffect(() => {
    let interval = null
    if (isActive && timer > 0) {
      interval = setInterval(() => {
        setTimer(timer => timer - 1)
      }, 1000)
    } else if (timer === 0 && isActive) {
      stopRecording()
    }
    return () => clearInterval(interval)
  }, [isActive, timer])

  // Load interview configuration
  useEffect(() => {
    if (sessionId && sessionId !== 'demo') {
      fetchInterview()
    } else if (sessionId === 'demo') {
      setInterview({
        job_title: 'Demo Position',
        company_name: 'Demo Company',
        time_limit: 120,
        next_steps: "This is a demo interview. In a real interview, we would review your responses."
      })
      setLoading(false)
    }
  }, [sessionId])

  // Handle auth errors from Linkedin sign-in
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const authError = urlParams.get('auth_error')
    
    if (authError) {
      setLinkedinAuthInProgress(false)
      alert('LinkedIn authentication failed. Please try again.')
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  useEffect(() => {
    async function checkLinkedInSession() {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" })
        if (res.ok) {
          const data = await res.json()
          setCandidateInfo(prev => ({
            ...prev,
            name: `${data.firstName} ${data.lastName}` || prev.name,
            email: data.email || prev.email,
            linkedinProfile: data.linkedinProfile,
            linkedinProfileLink: `https://www.linkedin.com/in/${data.linkedinProfile?.sub || ''}`
          }))
          setIsLinkedinAuthenticated(true)
        }
      } catch (e) {
        console.log("No LinkedIn session yet")
      }
    }

    checkLinkedInSession()
  }, [])

  // Handle LinkedIn OAuth
  const initiateLinkedInAuth = () => {
    const clientId = process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID
    const redirectUri = `${window.location.origin}/api/auth/linkedin/callback`
    const scope = 'openid profile email r_basicprofile'
    const state = sessionId
    
    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?` +
    `response_type=code` +
    `&client_id=${clientId}` + 
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${encodeURIComponent(state)}` +
    `&scope=${encodeURIComponent(scope)}`
    
    setLinkedinAuthInProgress(true)
    window.location.href = authUrl
  }

  // Handle LinkedIn callback
  const handleLinkedInCallback = async (code) => {
    try {
      setLinkedinAuthInProgress(true)
      
      const response = await fetch('/api/auth/linkedin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code, 
          redirectUri: `${window.location.origin}/interview/${sessionId}` 
        })
      })

      if (!response.ok) {
        throw new Error('LinkedIn authentication failed')
      }

      const data = await response.json()
      
      // Update candidate info with LinkedIn data
      setCandidateInfo(prev => ({
        ...prev,
        name: `${data.profile.given_name} ${data.profile.family_name}`,
        email: data.profile.email,
        phone: data.profile.phone || prev.phone,
        linkedinProfile: data.profile
      }))
      
      setIsLinkedinAuthenticated(true)
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
      
    } catch (error) {
      console.error('LinkedIn auth error:', error)
      alert('Failed to authenticate with LinkedIn. Please try again.')
    } finally {
      setLinkedinAuthInProgress(false)
    }
  }

  // Handle CV upload
  const handleCVUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file')
      return
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      alert('File size must be less than 10MB')
      return
    }

    setCandidateInfo(prev => ({ ...prev, cvFile: file }))

    // Parse CV
    try {
      const formData = new FormData()
      formData.append('cv', file)

      const response = await fetch('/api/parse-cv', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const parsed = await response.json()
        setCandidateInfo(prev => ({ ...prev, cvParsed: parsed }))
      }
    } catch (error) {
      console.error('CV parsing error:', error)
    }
  }

  const fetchInterview = async () => {
    try {
      const response = await fetch(`/api/interviews/${sessionId}`)
      if (response.ok) {
        const data = await response.json()
        setInterview(data.interview)
        setInterviewQuestions(data.interviewQuestions)
      } else {
        startTransition(() => {
          router.push('/')
        })
      }
    } catch (error) {
      console.error('Error fetching interview:', error)
      startTransition(() => {
        router.push('/')
      })
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const initializeCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, frameRate: 15 },
        audio: {
          sampleRate: 22050,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (error) {
      console.error('Error accessing camera:', error)
      alert('Please allow camera and microphone access to continue with the interview.')
    }
  }

  const startRecording = () => {
    if (!stream) return

    const options = {
      mimeType: 'video/webm;codecs=vp8,opus',
      videoBitsPerSecond: 250000,
      audioBitsPerSecond: 64000
    }

    let recorder
    try {
      recorder = new MediaRecorder(stream, options)
    } catch (e) {
      try {
        recorder = new MediaRecorder(stream, { mimeType: 'video/webm' })
      } catch (e2) {
        recorder = new MediaRecorder(stream)
      }
    }

    const chunks = []
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data)
      }
    }

    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: 'video/webm' })
      const fileSizeMB = blob.size / (1024 * 1024)
      
      if (fileSizeMB > 25) {
        alert(`Video file is too large (${fileSizeMB.toFixed(1)}MB). Maximum size is 25MB.`)
        return
      }
      
      const newResponse = {
        blob: blob,
        url: URL.createObjectURL(blob),
        timestamp: new Date().toISOString(),
        size: fileSizeMB.toFixed(2) + ' MB'
      }
      
      setResponses(prev => ({
        ...prev,
        [currentQuestion]: newResponse
      }))

      await saveResponse(interviewQuestions[currentQuestion].position, interviewQuestions[currentQuestion].category, blob)
    }

    recorder.start(1000)
    setMediaRecorder(recorder)
    setIsRecording(true)
    setTimer(interview?.time_limit || 120)
    setIsActive(true)
  }

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
    }
    setIsRecording(false)
    setIsActive(false)
    setTimer(0)
  }

  const saveResponse = async (position, category, videoBlob) => {
    if (sessionId === 'demo') {
      console.log('Demo mode - skipping save')
      return
    }

    try {
      setSaving(true)

      const isLastQuestion = currentQuestion === interviewQuestions.length - 1;
      
      // Step 1: Create response record
      const response = await fetch('/api/responses/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          position,
          category,
          step: isLastQuestion ? 'complete' : 'interview',
          interviewInstanceId
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const responseId = data.response.id
        const candidateId = data.response.candidate_id
        
        // Step 2: Upload video
        console.log('Uploading video...')
        const formData = new FormData()
        formData.append('video', videoBlob)
        formData.append('sessionId', sessionId)
        formData.append('questionIndex', position)
        formData.append('questionCategory', category)
        formData.append('responseId', responseId)
        formData.append('candidateId', candidateId)

        const uploadResponse = await fetch('/api/responses/upload-video-chunked', {
          method: 'POST',
          body: formData
        })

        if (!uploadResponse.ok) {
          const uploadError = await uploadResponse.json()
          throw new Error(`Upload failed: ${uploadError.details || uploadError.error}`)
        }

        // Step 3: Process (transcribe + analyze) in background
        console.log('Starting background processing...')
        fetch('/api/responses/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ responseId })
        }).then(async processResponse => {
          if (processResponse.ok) {
            console.log('Background processing completed')
          } else {
            const errorData = await processResponse.json()
            console.error('Background processing failed', errorData)
            setProcessingError(errorData.error)
          }
        }).catch(error => {
          console.error('Background processing error:', error)
          setProcessingError(error.message)
        })
 
      } else {
        const errorData = await response.json()  // ADD error handling for save failure
        throw new Error(`Save failed: ${errorData.error || errorData.details}`)
      }
    } catch (error) {
      console.error('Error saving response:', error)
    } finally {
      setSaving(false)
    }
  }

  const nextQuestion = () => {
    if (currentQuestion === interviewQuestions.length - 1) {
      setStep('complete')
    } else {
      setCurrentQuestion(currentQuestion + 1)
    }
  }

  const startInterview = async () => {

    if (!isLinkedinAuthenticated) {
      alert('Please sign in with LinkedIn first')
      return
    }

    if (!candidateInfo.name || !candidateInfo.email) {
      alert('Please fill in your name and email')
      return
    }
    // Save candidate info to database
    try {
      setSaving(true)  // Show loading state
      
      const response = await fetch(`/api/interviews/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          candidateName: candidateInfo.name,
          candidateEmail: candidateInfo.email,
          candidatePhone: candidateInfo.phone,
          linkedinProfile: candidateInfo.linkedinProfile,
          linkedinProfileLink: candidateInfo.linkedinProfileLink,
          cvParsed: candidateInfo.cvParsed
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Failed to save candidate info: ${errorData.error}`)
      }

      const instance = await response.json()
      console.log('✅ Candidate saved:', instance.candidate)
      console.log('Instance created: ', instance.interview_candidates.id)
      setInterviewInstanceId(instance.interview_candidates.id)

      setStep('interview')  // Now proceed to interview
      
    } catch (error) {
      console.error('Error saving candidate:', error)
      alert('Failed to save your information. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="interview-card p-8 glass-effect text-center">
          <div className="loading-spinner h-12 w-12 mx-auto mb-4"></div>
          <p className="text-muted-foreground font-medium">Loading interview...</p>
        </div>
      </div>
    )
  }

  if (!interview) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="interview-card p-8 glass-effect text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Interview Not Found</h2>
          <p className="text-muted-foreground mb-6">The interview link may be invalid or expired.</p>
          <button
            onClick={() => startTransition(() => {router.push('/')})}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    )
  }

  // Candidate Info Step
  if (step === 'info') {
    return (
      <div className="min-h-screen gradient-bg">
        <div className="py-12 px-4">
          <div className="max-w-2xl mx-auto">
            <div className="interview-card p-8 glass-effect">
              <div className="text-center mb-8">
                <div className="p-4 bg-primary rounded-2xl w-fit mx-auto mb-4">
                  <FaBuilding className="text-primary-foreground" size={32} />
                </div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  {interview.job_title}
                </h1>
                <p className="text-xl text-muted-foreground">
                  at {interview.company_name}
                </p>
              </div>

              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-semibold text-foreground mb-4">
                    Welcome to Your Video Interview
                  </h2>
                  <p className="text-muted-foreground">
                    Sign in with LinkedIn to get started
                  </p>
                </div>

                {/* LinkedIn Authentication Button */}
                {!isLinkedinAuthenticated && (
                  <button
                    onClick={initiateLinkedInAuth}
                    disabled={linkedinAuthInProgress}
                    className="w-full py-4 bg-[#0077B5] text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-200 flex items-center justify-center space-x-3"
                  >
                    <FaLinkedin size={24} />
                    <span>
                      {linkedinAuthInProgress ? 'Authenticating...' : 'Sign in with LinkedIn'}
                    </span>
                  </button>
                )}

                {/* Show form only after LinkedIn auth */}
                {isLinkedinAuthenticated && (
                  <>
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center text-green-700">
                        <FaCheckCircle className="mr-2" size={20} />
                        <span className="font-semibold">LinkedIn Connected</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground flex items-center">
                          <FaUser size={16} className="mr-2" />
                          Full Name *
                        </label>
                        <input
                          type="text"
                          value={candidateInfo.name}
                          onChange={(e) => setCandidateInfo({...candidateInfo, name: e.target.value})}
                          className="w-full input-enhanced h-12"
                          placeholder="Enter your full name"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground flex items-center">
                          <FaEnvelope size={16} className="mr-2" />
                          Email Address *
                        </label>
                        <input
                          type="email"
                          value={candidateInfo.email}
                          onChange={(e) => setCandidateInfo({...candidateInfo, email: e.target.value})}
                          className="w-full input-enhanced h-12"
                          placeholder="Enter your email address"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground flex items-center">
                          <FaPhone size={16} className="mr-2" />
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={candidateInfo.phone}
                          onChange={(e) => setCandidateInfo({...candidateInfo, phone: e.target.value})}
                          className="w-full input-enhanced h-12"
                          placeholder="Enter your phone number"
                        />
                      </div>

                      {/* CV Upload */}
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground flex items-center">
                          <FaFilePdf size={16} className="mr-2" />
                          Upload CV (Optional)
                        </label>
                        <div className="relative">
                          {/*onChange={handleCVUpload}*/}
                          <input
                            type="file"
                            accept=".pdf"
                            className="hidden"
                            id="cv-upload"
                          />
                          <label
                            htmlFor="cv-upload"
                            className="w-full flex items-center justify-center px-4 py-3 border-2 border-dashed border-muted-foreground/30 rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                          >
                            <FaFileUpload className="mr-2" size={20} />
                            <span>
                              {candidateInfo.cvFile 
                                ? candidateInfo.cvFile.name 
                                : 'Click to upload PDF'}
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="bg-muted/50 p-4 rounded-lg border">
                      <h3 className="font-semibold text-foreground mb-2">Interview Details:</h3>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• {interviewQuestions.length} questions</li>
                        <li>• {Math.floor(interview.time_limit / 60)} minutes per question</li>
                        <li>• Camera and microphone required</li>
                        <li>• You can re-record if needed</li>
                      </ul>
                    </div>

                    <button
                      onClick={startInterview}
                      disabled={!candidateInfo.name || !candidateInfo.email}
                      className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-200"
                    >
                      {saving ? 'Saving...' : 'Start Interview'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Interview Complete Step
  if (step === 'complete') {
    return (
      <div className="min-h-screen gradient-bg">
        <div className="py-12 px-4">
          <div className="max-w-2xl mx-auto">
            <div className="interview-card p-8 glass-effect text-center">
              <div className="p-4 bg-green-500 rounded-2xl w-fit mx-auto mb-6">
                <FaCheckCircle className="text-white" size={48} />
              </div>
              
              <h1 className="text-3xl font-bold text-foreground mb-4">
                Interview Complete!
              </h1>
              
              <p className="text-lg text-muted-foreground mb-8">
                Thank you for completing the video interview for <strong>{interview.job_title}</strong>
              </p>

              <div className="bg-muted/50 p-6 rounded-lg border mb-8">
                <p className="text-foreground">
                  {interview.next_steps}
                </p>
              </div>

              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Interview ID: {sessionId}
                </div>
                
                <button
                  onClick={() => startTransition(() => {router.push('/')})}
                  className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Main Interview Step
  return (
    <div className="min-h-screen gradient-bg">
      <div className="py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="interview-card p-6 glass-effect mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {interview.job_title} Interview
                </h1>
                <p className="text-muted-foreground">
                  Question {currentQuestion + 1} of {interviewQuestions.length}
                </p>
              </div>
              
              <div className="flex items-center space-x-4">
                {isActive && (
                  <div className="flex items-center space-x-2 px-4 py-2 bg-red-100 rounded-lg">
                    <FaClock className="text-red-600" size={16} />
                    <span className="font-mono text-red-600 font-semibold">
                      {formatTime(timer)}
                    </span>
                  </div>
                )}
                
                {saving && (
                  <div className="flex items-center space-x-2 px-4 py-2 bg-blue-100 rounded-lg">
                    <div className="loading-spinner h-4 w-4"></div>
                    <span className="text-blue-600 text-sm">Saving...</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>Progress</span>
              <span>{Math.round(((currentQuestion + 1) / interviewQuestions.length) * 100)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestion + 1) / interviewQuestions.length) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Question Card */}
          <div className="interview-card p-8 glass-effect mb-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary rounded-full mb-4">
                <span className="text-primary-foreground font-bold text-lg">
                  {currentQuestion + 1}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-4">
                {interviewQuestions[currentQuestion]?.question_text}
              </h2>
              <p className="text-muted-foreground">
                Please look at the camera and speak clearly. You have {Math.floor(interview.time_limit / 60)} minutes to answer.
              </p>
            </div>

            {/* Video Section */}
            <div className="mb-8">
              <div className="relative bg-gray-900 rounded-xl overflow-hidden shadow-lg">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  className="w-full h-80 object-cover"
                />
                {isRecording && (
                  <div className="absolute top-4 right-4 flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-full">
                    <div className="w-3 h-3 bg-white rounded-full recording-indicator"></div>
                    <span className="text-sm font-semibold">RECORDING</span>
                  </div>
                )}
                {!stream && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <div className="text-center text-white">
                      <FaCamera size={48} className="mx-auto mb-4 opacity-50" />
                      <p>Camera not initialized</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="flex justify-center space-x-4">
              {!stream && (
                <button
                  onClick={initializeCamera}
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transform hover:scale-105 transition-all duration-200"
                >
                  <FaCamera className="mr-2" size={18} />
                  Enable Camera
                </button>
              )}
              
              {stream && !isRecording && (
                <button
                  onClick={startRecording}
                  className="inline-flex items-center px-8 py-4 bg-red-600 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  <FaPlay className="mr-3" size={20} />
                  Start Recording
                </button>
              )}
              
              {isRecording && (
                <button
                  onClick={stopRecording}
                  className="inline-flex items-center px-8 py-4 bg-gray-600 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  <FaSquare className="mr-3" size={20} />
                  Stop Recording
                </button>
              )}
              
              {responses[currentQuestion] && (
                <button
                  onClick={nextQuestion}
                  className="inline-flex items-center px-8 py-4 bg-green-600 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  {currentQuestion === interviewQuestions.length - 1 ? 'Complete Interview' : 'Next Question'}
                  <FaArrowRight className="ml-3" size={20} />
                </button>
              )}
            </div>

            {/* Success Message */}
            {responses[currentQuestion] && (
              <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg animate-fade-in">
                <div className="flex items-center text-green-700">
                  <FaCheckCircle className="mr-3" size={20} />
                  <div>
                    <span className="font-semibold">Response recorded successfully!</span>
                    <p className="text-sm text-green-600 mt-1">
                      File size: {responses[currentQuestion].size}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}