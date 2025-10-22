'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FaArrowLeft, FaVideo, FaComment, FaFileAlt, FaClock, FaCheckCircle, FaUser, FaBrain } from 'react-icons/fa'

export default function ResultsDetailPage() {
  const router = useRouter()
  const { sessionId } = router.query
  const [loading, setLoading] = useState(true)
  const [interview, setInterview] = useState(null)

  useEffect(() => {
    if (sessionId) {
      fetchInterviewDetails()
    }
  }, [sessionId])

  const fetchInterviewDetails = async () => {
    try {
      // This would fetch specific interview details
      const response = await fetch(`/api/admin/interview/${sessionId}`)
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
            onClick={() => router.push('/results')}
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
      <div className="py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="interview-card p-8 glass-effect mb-8">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => router.push('/results')}
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

          {/* Coming Soon Section */}
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
                onClick={() => router.push('/admin')}
                className="px-8 py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                Create New Interview
              </button>
              
              <button
                onClick={() => router.push('/results')}
                className="px-8 py-4 bg-secondary text-secondary-foreground rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                View All Results
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}