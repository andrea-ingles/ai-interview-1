'use client'
import { useState, useEffect } from 'react'
import { FaFileAlt, FaUser, FaBrain, FaVideo, FaComment, FaCheckCircle, FaTimesCircle, FaClock, FaArrowLeft, FaDownload, FaEye } from 'react-icons/fa'
import { useRouter } from 'next/navigation'

export default function AdminResults() {
  const router = useRouter()
  const [interviews, setInterviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedInterview, setSelectedInterview] = useState(null)
  const [expandedCandidates, setExpandedCandidates] = useState(new Set())
  const [videoModal, setVideoModal] = useState({ open: false, url: '', candidate: '', question: '' })

  useEffect(() => {
    fetchResults()
  }, [])

  const fetchResults = async () => {
    try {
      const response = await fetch('/api/admin/interviews')

      if (response.ok) {
        const data = await response.json()
        setInterviews(data.interviews || [])
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

  const getRecommendationColor = (recommendation) => {
    switch (recommendation?.toLowerCase()) {
      case 'hire': return 'bg-green-100 text-green-800 border-green-200'
      case 'maybe': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'pass': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getRecommendationIcon = (recommendation) => {
    switch (recommendation?.toLowerCase()) {
      case 'hire': return <FaCheckCircle size={16} />
      case 'maybe': return <FaClock size={16} />
      case 'pass': return <FaTimesCircle size={16} />
      default: return <FaClock size={16} />
    }
  }

  const toggleCandidateExpansion = (candidateId) => {
    const newExpanded = new Set(expandedCandidates)
    if (newExpanded.has(candidateId)) {
      newExpanded.delete(candidateId)
    } else {
      newExpanded.add(candidateId)
    }
    setExpandedCandidates(newExpanded)
  }

  const getScoreColor = (score, maxScore = 10) => {
    const percentage = (score / maxScore) * 100
    if (percentage >= 80) return 'text-green-600'
    if (percentage >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const handleViewVideo = (videoUrl, candidateName, questionIndex) => {
    setVideoModal({
      open: true,
      url: videoUrl,
      candidate: candidateName,
      question: `Question ${questionIndex + 1}`
    })
  }

  const handleDownloadVideo = async (videoUrl, candidateName, questionIndex) => {
    try {
      const response = await fetch(videoUrl)
      if (!response.ok) throw new Error('Failed to fetch video')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${candidateName}_Question_${questionIndex + 1}.webm`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error downloading video:', error)
      alert('Failed to download video. Please try again.')
    }
  }

  const closeVideoModal = () => {
    setVideoModal({ open: false, url: '', candidate: '', question: '' })
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

  return (
    <div className="min-h-screen gradient-bg">
      <div className="py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="interview-card p-8 glass-effect mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-4 bg-primary rounded-2xl shadow-lg">
                  <FaBrain className="text-primary-foreground" size={32} />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-foreground">Interview Results</h1>
                  <p className="text-muted-foreground text-lg mt-2">
                    Interview Results Dashboard
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.push('/admin')}
                className="inline-flex items-center px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors"
              >
                <FaArrowLeft className="mr-2" size={18} />
                Back to Admin
              </button>
            </div>
          </div>

          {interviews.length === 0 ? (
            <div className="interview-card p-12 glass-effect text-center">
              <div className="p-6 bg-muted rounded-full w-fit mx-auto mb-6">
                <FaFileAlt className="text-muted-foreground" size={48} />
              </div>
              <h2 className="text-3xl font-bold text-foreground mb-4">No Interviews Found</h2>
              <p className="text-muted-foreground text-lg mb-8">
                Create an interview in the admin panel to get started.
              </p>
              <button
                onClick={() => router.push('/admin')}
                className="px-8 py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                Create Interview
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {interviews.map((interview) => (
                <div key={interview.id} className="interview-card glass-effect overflow-hidden">
                  {/* Interview Header */}
                  <div className="bg-gradient-to-r from-primary to-primary/80 p-6 text-primary-foreground">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-bold mb-2">
                          {interview.job_title} at {interview.company_name}
                        </h2>
                        <div className="flex items-center space-x-6 text-primary-foreground/90">
                          <div className="flex items-center space-x-2">
                            <FaUser size={16} />
                            <span>{interview.totalCandidates} candidates</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <FaCheckCircle size={16} />
                            <span>{interview.completedCandidates} completed</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm opacity-90">Interview ID</div>
                        <div className="font-mono text-lg">{interview.session_id}</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    {interview.candidates?.length === 0 ? (
                      <div className="text-center py-12">
                        <FaClock className="text-muted-foreground mx-auto mb-4" size={48} />
                        <p className="text-muted-foreground text-lg">
                          No candidates have completed this interview yet
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {interview.candidates?.map((candidate) => (
                          <div key={candidate.id} className="border rounded-xl overflow-hidden">
                            {/* Candidate Header */}
                            <div 
                              className="p-6 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() => toggleCandidateExpansion(candidate.id)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                  <div className="p-3 bg-primary rounded-full">
                                    <FaUser className="text-primary-foreground" size={20} />
                                  </div>
                                  <div>
                                    <h3 className="text-xl font-semibold text-foreground">
                                      {candidate.name}
                                    </h3>
                                    <p className="text-muted-foreground">{candidate.email}</p>
                                  </div>
                                </div>
                                
                                <div className="flex items-center space-x-4">
                                  <div className="text-right">
                                    <div className="text-sm text-muted-foreground">Responses</div>
                                    <div className="font-semibold">
                                      {candidate.responses?.length || 0} / {interview.questions?.length || 0}
                                    </div>
                                  </div>
                                  
                                  {candidate.responses?.length > 0 && (
                                    <div className="flex items-center space-x-2">
                                      {candidate.responses.some(r => r.ai_analysis?.recommendation === 'hire') && (
                                        <span className="status-badge-success">
                                          <FaCheckCircle size={12} className="mr-1" />
                                          Recommended
                                        </span>
                                      )}
                                      {candidate.responses.some(r => r.video_url) && (
                                        <span className="status-badge-info">
                                          <FaVideo size={12} className="mr-1" />
                                          Video
                                        </span>
                                      )}
                                      {candidate.responses.some(r => r.ai_analysis) && (
                                        <span className="status-badge-warning">
                                          <FaBrain size={12} className="mr-1" />
                                          Analyzed
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  
                                  <button className="p-2 hover:bg-background rounded-lg transition-colors">
                                    <FaEye size={16} className="text-muted-foreground" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Expanded Candidate Details */}
                            {expandedCandidates.has(candidate.id) && (
                              <div className="p-6 border-t bg-background">
                                {candidate.responses?.length === 0 ? (
                                  <div className="text-center py-8">
                                    <FaComment className="text-muted-foreground mx-auto mb-4" size={32} />
                                    <p className="text-muted-foreground">No responses yet</p>
                                  </div>
                                ) : (
                                  <div className="space-y-8">
                                    {candidate.responses?.map((response, index) => (
                                      <div key={response.id} className="bg-muted/20 rounded-xl p-6">
                                        {/* Response Header */}
                                        <div className="flex items-start justify-between mb-6">
                                          <div>
                                            <h4 className="text-lg font-semibold text-foreground mb-2">
                                              Question {response.question_index + 1}
                                            </h4>
                                            <p className="text-muted-foreground">
                                              {interview.questions?.[response.question_index] || 'Question not available'}
                                            </p>
                                          </div>
                                          
                                          <div className="flex items-center space-x-2">
                                            {response.video_url && (
                                              <span className="status-badge-info">
                                                <FaVideo size={12} className="mr-1" />
                                                Video
                                              </span>
                                            )}
                                            {response.transcription && (
                                              <span className="status-badge-success">
                                                <FaComment size={12} className="mr-1" />
                                                Transcribed
                                              </span>
                                            )}
                                            {response.ai_analysis && (
                                              <span className="status-badge-warning">
                                                <FaBrain size={12} className="mr-1" />
                                                Analyzed
                                              </span>
                                            )}
                                          </div>
                                        </div>

                                        {/* Transcription */}
                                        {response.transcription && (
                                          <div className="mb-6">
                                            <h5 className="font-semibold text-foreground mb-2">Transcription:</h5>
                                            <div className="p-4 bg-background rounded-lg border">
                                              <p className="text-foreground leading-relaxed">
                                                {response.transcription}
                                              </p>
                                            </div>
                                          </div>
                                        )}

                                        {/* AI Analysis */}
                                        {response.ai_analysis && (
                                          <div className="space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                              {/* Communication Score */}
                                              <div className="text-center p-4 bg-background rounded-lg border">
                                                <div className={`text-2xl font-bold ${getScoreColor(response.ai_analysis.communicationSkill)}`}>
                                                  {response.ai_analysis.communicationSkill}/10
                                                </div>
                                                <div className="text-sm text-muted-foreground">Communication</div>
                                              </div>
                                              
                                              {/* Enthusiasm */}
                                              <div className="text-center p-4 bg-background rounded-lg border">
                                                <div className="text-lg font-bold text-foreground">
                                                  {response.ai_analysis.enthusiasm}
                                                </div>
                                                <div className="text-sm text-muted-foreground">Enthusiasm</div>
                                              </div>
                                              
                                              {/* Experience */}
                                              <div className="text-center p-4 bg-background rounded-lg border">
                                                <div className="text-sm font-bold text-foreground">
                                                  {response.ai_analysis.relevantExperience}
                                                </div>
                                                <div className="text-sm text-muted-foreground">Experience</div>
                                              </div>
                                              
                                              {/* Confidence */}
                                              <div className="text-center p-4 bg-background rounded-lg border">
                                                <div className={`text-2xl font-bold ${getScoreColor(response.ai_analysis.confidence)}`}>
                                                  {response.ai_analysis.confidence}/10
                                                </div>
                                                <div className="text-sm text-muted-foreground">AI Confidence</div>
                                              </div>
                                            </div>

                                            {/* Key Strengths */}
                                            {response.ai_analysis.keyStrengths && (
                                              <div>
                                                <h5 className="font-semibold text-foreground mb-2">Key Strengths:</h5>
                                                <div className="flex flex-wrap gap-2">
                                                  {response.ai_analysis.keyStrengths.map((strength, idx) => (
                                                    <span key={idx} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                                                      {strength}
                                                    </span>
                                                  ))}
                                                </div>
                                              </div>
                                            )}

                                            {/* Red Flags */}
                                            {response.ai_analysis.redFlags && response.ai_analysis.redFlags !== 'None identified' && (
                                              <div>
                                                <h5 className="font-semibold text-foreground mb-2">Areas of Concern:</h5>
                                                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                                  <p className="text-red-800">{response.ai_analysis.redFlags}</p>
                                                </div>
                                              </div>
                                            )}

                                            {/* Detailed Analysis */}
                                            {response.ai_analysis.reasoning && (
                                              <div>
                                                <h5 className="font-semibold text-foreground mb-2">Detailed Analysis:</h5>
                                                <div className="p-4 bg-background rounded-lg border">
                                                  <p className="text-foreground leading-relaxed">
                                                    {response.ai_analysis.reasoning}
                                                  </p>
                                                </div>
                                              </div>
                                            )}

                                            {/* Final Recommendation */}
                                            <div className="flex items-center justify-between pt-6 border-t">
                                              <span className="text-lg font-semibold text-foreground">Final Recommendation:</span>
                                              <div className={`inline-flex items-center px-6 py-3 rounded-xl font-bold border-2 ${getRecommendationColor(response.ai_analysis.recommendation)}`}>
                                                {getRecommendationIcon(response.ai_analysis.recommendation)}
                                                <span className="ml-2 text-lg">{response.ai_analysis.recommendation}</span>
                                              </div>
                                            </div>
                                          </div>
                                        )}

                                        {/* Video Actions */}
                                        {response.video_url && (
                                          <div className="mt-6 pt-6 border-t">
                                            <div className="flex items-center justify-between">
                                              <span className="text-sm text-muted-foreground">
                                                Recorded: {new Date(response.recorded_at).toLocaleString()}
                                              </span>
                                              <div className="flex items-center space-x-2">
                                                <button className="inline-flex items-center px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                                                  <FaEye size={14} className="mr-1" />
                                                  View Video
                                                </button>
                                                <button className="inline-flex items-center px-3 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors">
                                                  <FaDownload size={14} className="mr-1" />
                                                  Download
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}