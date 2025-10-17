'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FaCog, FaPaperPlane, FaCamera, FaPlus, FaTimesCircle, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa'

export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [generatedLink, setGeneratedLink] = useState('')
  
  const [interviewConfig, setInterviewConfig] = useState({
    jobTitle: '',
    companyName: '',
    questions: [],
    analysisPrompts: [],
    nextSteps: '',
    timeLimit: 120
  })

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

  const addQuestion = () => {
    const newQuestion = prompt("Enter new question:")
    if (newQuestion && newQuestion.trim()) {
      setInterviewConfig({
        ...interviewConfig,
        questions: [...(interviewConfig.questions.length > 0 ? interviewConfig.questions : defaultQuestions), newQuestion.trim()]
      })
    }
  }

  const removeQuestion = (index) => {
    const currentQuestions = interviewConfig.questions.length > 0 ? interviewConfig.questions : defaultQuestions
    const newQuestions = currentQuestions.filter((_, i) => i !== index)
    setInterviewConfig({...interviewConfig, questions: newQuestions})
  }

  const generateInterviewLink = async () => {
    if (!interviewConfig.jobTitle || !interviewConfig.companyName) {
      alert('Please fill in job title and company name')
      return
    }

    setLoading(true)
    setShowSuccess(false)
    
    try {
      const response = await fetch('/api/interviews/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobTitle: interviewConfig.jobTitle,
          companyName: interviewConfig.companyName,
          questions: interviewConfig.questions.length > 0 ? interviewConfig.questions : defaultQuestions,
          analysisPrompts: interviewConfig.analysisPrompts.length > 0 ? interviewConfig.analysisPrompts : defaultAnalysisPrompts,
          nextSteps: interviewConfig.nextSteps || "Thank you for completing the interview. We will review your responses and get back to you within 3-5 business days.",
          timeLimit: interviewConfig.timeLimit
        }),
      })

      const data = await response.json()
      if (data.success) {
        const link = `${window.location.origin}/interview/${data.sessionId}`
        setGeneratedLink(link)
        setShowSuccess(true)
        
        // Copy to clipboard
        navigator.clipboard.writeText(link)
      } else {
        alert('Error creating interview: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error creating interview. Please check your configuration.')
    } finally {
      setLoading(false)
    }
  }

  const currentQuestions = interviewConfig.questions.length > 0 ? interviewConfig.questions : defaultQuestions

  return (
    <div className="min-h-screen gradient-bg">
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
                  <div key={index} className="group p-4 bg-muted/50 rounded-lg border border-border hover:border-primary/50 transition-all duration-200">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground text-xs font-bold rounded-full flex-shrink-0 mt-1">
                          {index + 1}
                        </span>
                        <span className="text-foreground font-medium">{question}</span>
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
              onClick={() => router.push('/interview/demo')}
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
                  <li>• Results will be available in the admin dashboard</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
