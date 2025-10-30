// file: app/create/page.js
// Page where an admin can create a new interview
'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { FaCog, FaPaperPlane, FaCamera, FaPlus, FaTimesCircle, FaExclamationTriangle, FaCheckCircle, FaUser, FaSignOutAlt, FaStar } from 'react-icons/fa'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useAuthContext } from '../../components/AuthProvider'
import { supabaseClient } from '../../lib/authClient'
import Navigation from '../../components/Navigation'


function AdminPageContent() {
  const router = useRouter()
  const { user } = useAuthContext()
  const [loading, setLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [generatedLink, setGeneratedLink] = useState('')
  const [isPending, startTransition] = useTransition()
  const [draggedIndex, setDraggedIndex] = useState(null)
  
  const [interviewConfig, setInterviewConfig] = useState({
    jobTitle: '',
    companyName: '',
    analysisPrompts: [],
    nextSteps: '',
    timeLimit: 120
  })
  const [questionsConfig, setQuestionsConfig] = useState([])

  const defaultQuestions = [
    "Tell me about yourself and your professional background",
    "Why are you interested in this position?",
    "Describe your greatest professional achievement",
    "How do you handle challenging situations at work?",
    "Where do you see yourself in 5 years?",
    "Do you have any questions about the role or company?"
  ]

  const defaultAnalysisPrompts = [
    "Rate the candidate's communication skills (1-10) and explain why",
    "Assess the candidate's enthusiasm and motivation for the role",
    "Evaluate the relevance of their experience to the position",
    "Identify any red flags or concerns",
    "Summarize their key strengths",
    "Provide an overall recommendation (Hire/Maybe/Pass) with reasoning"
  ]

  // Helper function to generate short_name from question text
  const generateShortName = (questionText) => {
    /* To use afterwards
    if (!questionText) return "Background"
    
    const words = questionText.trim().split(' ')
    if (words.length === 0) return "Background"
  
    return words.slice(0, 2).join(' ') || "Background"*/
    return "Background"
  }

  // Initialize default questions in questionsConfig format
  const getDefaultQuestionsConfig = () => {
    return defaultQuestions.map((q, index) => ({
      short_name: generateShortName(q),
      question_text: q,
      tags_questions: ["check"],
      position: index
    }))
  }

  const addQuestion = () => {
    const newQuestionText = prompt("Enter new question:")
    if (newQuestionText && newQuestionText.trim()) {
      const currentQuestions = questionsConfig.length > 0 ? questionsConfig : getDefaultQuestionsConfig()
      const newQuestion = {
        short_name: generateShortName(newQuestionText),
        question_text: newQuestionText.trim(),
        tags_questions: ["check"],
        position: currentQuestions.length
      }
      setQuestionsConfig([...currentQuestions, newQuestion])
    }
  }

  const removeQuestion = (index) => {
    const currentQuestions = questionsConfig.length > 0 ? questionsConfig : getDefaultQuestionsConfig()
    const newQuestions = currentQuestions
      .filter((_, i) => i !== index)
      .map((q, i) => ({ ...q, position: i }))
    setQuestionsConfig(newQuestions)
  }

  // Toggle critical/check tag
  const toggleCritical = (index) => {
    const currentQuestions = questionsConfig.length > 0 ? questionsConfig : getDefaultQuestionsConfig()
    const newQuestions = [...currentQuestions]
    const currentTag = newQuestions[index].tags_questions[0] // Get first tag from array
    newQuestions[index] = {
      ...newQuestions[index],
      tags_questions: currentTag === "check" ? ["critical"] : ["check"] // Toggle between arrays
    }
    setQuestionsConfig(newQuestions)
  }

  // Drag and drop handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e, dropIndex) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === dropIndex) return

    const currentQuestions = questionsConfig.length > 0 ? questionsConfig : getDefaultQuestionsConfig()
    const newQuestions = [...currentQuestions]
    const draggedQuestion = newQuestions[draggedIndex]
    
    // Remove dragged item
    newQuestions.splice(draggedIndex, 1)
    // Insert at new position
    newQuestions.splice(dropIndex, 0, draggedQuestion)
    
    // Update all positions
    const reorderedQuestions = newQuestions.map((q, i) => ({ ...q, position: i }))
    
    setQuestionsConfig(reorderedQuestions)
    setDraggedIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const handleLogout = async () => {
    await supabaseClient.auth.signOut()
    startTransition(() => {
      router.push('/login')
    })
  }


  const generateInterviewLink = async () => {
    if (!interviewConfig.jobTitle || !interviewConfig.companyName) {
      alert('Please fill in job title and company name')
      return
    }

    setLoading(true)
    setShowSuccess(false)
    
    try {
      // Get the current user's session for the API call
      const { data: { session } } = await supabaseClient.auth.getSession()
      console.log('session :', session)

      if (!session) {
        console.error("No session found!")
      return
  }
      // STEP 1: Create interview without questions
      const interviewResponse  = await fetch('/api/admin/interviews/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          jobTitle: interviewConfig.jobTitle,
          companyName: interviewConfig.companyName,
          analysisPrompts: interviewConfig.analysisPrompts.length > 0 ? interviewConfig.analysisPrompts : defaultAnalysisPrompts,
          nextSteps: interviewConfig.nextSteps || "Thank you for completing the interview. We will review your responses and get back to you within 3-5 business days.",
          timeLimit: interviewConfig.timeLimit
        }),
      })

      const interviewData = await interviewResponse.json()

      if (!interviewResponse.ok) {
        alert('Error creating interview: ' + (interviewData.error || 'Unknown error'))
        return
      }

      const interviewId = interviewData.interview.id
      const link = interviewData.interviewUrl

      // STEP 2: Create questions with interview_id
      const finalQuestionsConfig = questionsConfig.length > 0 ? questionsConfig : getDefaultQuestionsConfig()
      
      const questionsResponse = await fetch('/api/admin/interviews/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          interview_id: interviewId,
          questions: finalQuestionsConfig
        }),
      })

      const questionsData = await questionsResponse.json()

      if (!questionsResponse.ok) {
        alert('Interview created but error adding questions: ' + (questionsData.error || 'Unknown error'))
        return
      }

      // Success!
      setGeneratedLink(link)
      setShowSuccess(true)

      // Copy to clipboard
      navigator.clipboard.writeText(link)
      alert(`Interview link created and copied to clipboard!\n${link}`)

    } catch (error) {
      console.error('Error:', error)
      alert('Error creating interview. Please check your configuration.')
    } finally {
      setLoading(false)
    }
  }

  const currentQuestions = questionsConfig.length > 0 ? questionsConfig : getDefaultQuestionsConfig()

  return (
    <div className="min-h-screen gradient-bg">
      <Navigation />

      {/* Rest of your existing admin page content */}
      <div className="py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header Card */}
          <div className="interview-card p-8 mb-8 glass-effect">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-4 bg-primary rounded-2xl shadow-lg">
                  <FaCog className="text-primary-foreground" size={32} />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-foreground">AI Interview Setup</h1>
                  <p className="text-muted-foreground text-lg mt-2">Configure and customize your interview experience</p>
                </div>
              </div>
              <div className="glass-effect px-4 py-2 rounded-lg">
                <span className="text-sm font-semibold text-muted-foreground">Admin Panel</span>
              </div>
            </div>
          </div>

          {/* Success Alert */}
          {showSuccess && (
            <div className="interview-card p-6 mb-8 bg-green-50 border-green-200 animate-fade-in">
              <div className="flex items-start space-x-3">
                <FaCheckCircle className="text-green-600 mt-0.5" size={20} />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-green-800">Interview Created Successfully!</h3>
                  <p className="text-green-700 mt-1">Link copied to clipboard</p>
                  <div className="mt-3 p-3 bg-white rounded-md border">
                    <code className="text-sm text-gray-700 break-all">{generatedLink}</code>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Configuration Panel */}
            <div className="interview-card p-8 glass-effect">
              <div className="flex items-center mb-8">
                <div className="w-1 h-8 bg-primary rounded-full mr-4"></div>
                <h2 className="text-2xl font-bold text-foreground">Interview Configuration</h2>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Job Title *</label>
                  <input
                    type="text"
                    value={interviewConfig.jobTitle}
                    onChange={(e) => setInterviewConfig({...interviewConfig, jobTitle: e.target.value})}
                    className="w-full input-enhanced h-12"
                    placeholder="e.g., Frontend Developer"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Company Name *</label>
                  <input
                    type="text"
                    value={interviewConfig.companyName}
                    onChange={(e) => setInterviewConfig({...interviewConfig, companyName: e.target.value})}
                    className="w-full input-enhanced h-12"
                    placeholder="Your Company Name"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Time Limit per Question</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={interviewConfig.timeLimit}
                      onChange={(e) => setInterviewConfig({...interviewConfig, timeLimit: parseInt(e.target.value)})}
                      className="w-full input-enhanced h-12 pr-20"
                      min="30"
                      max="300"
                    />
                    <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">
                      seconds
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Next Steps Message</label>
                  <textarea
                    value={interviewConfig.nextSteps}
                    onChange={(e) => setInterviewConfig({...interviewConfig, nextSteps: e.target.value})}
                    className="w-full input-enhanced min-h-[100px] resize-none"
                    placeholder="Thank you for completing the interview..."
                  />
                </div>
              </div>
            </div>

            {/* Questions Panel */}
            <div className="interview-card p-8 glass-effect">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center">
                  <div className="w-1 h-8 bg-gradient-to-b from-green-500 to-blue-500 rounded-full mr-4"></div>
                  <h2 className="text-2xl font-bold text-foreground">Interview Questions</h2>
                </div>
                <button
                  onClick={addQuestion}
                  className="inline-flex items-center px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors text-sm font-medium"
                >
                  <FaPlus size={16} className="mr-2" />
                  Add Question
                </button>
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {currentQuestions.map((question, index) => (
                  <div 
                    key={index}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`group p-4 bg-muted/50 rounded-lg border border-border hover:border-primary/50 transition-all duration-200  cursor-move ${
                      draggedIndex === index ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground text-xs font-bold rounded-full flex-shrink-0 mt-1">
                          {index + 1}
                        </span>

                        {/* Critical Star Button */}
                        <button
                          onClick={() => toggleCritical(index)}
                          className={`flex-shrink-0 mt-1 transition-all duration-200 ${
                            question.tags_questions === "critical"
                              ? 'text-primary scale-110'
                              : 'text-gray-300 hover:text-gray-400'
                          }`}
                          title={question.tags_questions === "critical" ? "Critical question" : "Regular question"}
                        >
                          <FaStar size={16} />
                        </button>
                        
                        <div className="flex-1">
                          <span className="text-foreground font-semibold">
                            {question.short_name}
                          </span>
                          <span className="text-muted-foreground"> - </span>
                          <span className="text-foreground">
                            {question.question_text}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => removeQuestion(index)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all duration-200 p-1 ml-2"
                      >
                        <FaTimesCircle size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-12 flex justify-center space-x-6">
            <button
              onClick={generateInterviewLink}
              disabled={loading || !interviewConfig.jobTitle || !interviewConfig.companyName}
              className="inline-flex items-center px-8 py-4 bg-primary text-primary-foreground rounded-xl font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transform hover:scale-105 transition-all duration-200 text-lg"
            >
              {loading ? (
                <>
                  <div className="loading-spinner h-5 w-5 mr-3"></div>
                  Creating Interview...
                </>
              ) : (
                <>
                  <FaPaperPlane className="mr-3" size={20} />
                  Generate Interview Link
                </>
              )}
            </button>
            
            <button
              onClick={() => startTransition(() => {router.push('/interview/demo')}) }
              className="inline-flex items-center px-8 py-4 bg-secondary text-secondary-foreground rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 text-lg"
            >
              <FaCamera className="mr-3" size={20} />
              Preview Experience
            </button>
          </div>

          {/* Info Card */}
          <div className="mt-8 interview-card p-6 glass-effect">
            <div className="flex items-start space-x-3">
              <FaExclamationTriangle className="text-amber-500 mt-0.5" size={20} />
              <div>
                <h3 className="font-semibold text-foreground mb-2">Important Notes</h3>
                <ul className="text-muted-foreground text-sm space-y-1">
                  <li>• Candidates will need camera and microphone access</li>
                  <li>• Each question has a time limit (default: 2 minutes)</li>
                  <li>• Videos are automatically processed and analyzed by AI</li>
                  <li>• Drag and drop questions to reorder them</li>
                  <li>• Click the star icon to mark questions as critical, they'll be giving more importance in the AI-analysis</li>
                  <li>• You can review each candidates results by clicking in the top menu Review</li>
                  <li>• All results reviewed or not will be available in your dashboard</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminPage() {
  return (
    <ProtectedRoute adminOnly={true}>
      <AdminPageContent />
    </ProtectedRoute>
  )
}
