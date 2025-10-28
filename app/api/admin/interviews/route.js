import { supabase } from '../../../../lib/authServer.js'
import { withAdminAuth } from '../../../../lib/authMiddleware.js'
import { NextResponse } from 'next/server'

// GET method - Get all interviews (Admin-only)
async function getHandler(request, { user }) {
  try {
        console.log(`Now I'll get the interviews`)
        // Get interview configuration
        const { data: interviews, error } = await supabase
            .from('interviews')
            .select(`
                *,
                candidates (
                    id,
                    name,
                    email,
                    phone,
                    completed_at,
                    created_at,
                    responses (
                        id,
                        question_index,
                        video_url,
                        transcription,
                        ai_analysis,
                        recorded_at
    
                    )
                )
            `)
            .order('created_at', { ascending: false })
        console.log('Number of interviews fetched: ', interviews.length)

        if (error) {
            return NextResponse.json({ error: 'Interviews not found' }, {status: 404})
        }

        // Calculate statistics for each interview
        const interviewsWithStats = interviews.map(interview => {
            const candidates = interview.candidates || []
            const totalQuestions = interview.questions?.length

            const stats = candidates.map(candidate => {
                const responses = candidate.responses || []
                return {
                    ...candidate,
                    totalQuestions,
                    completedQuestions: responses.length,
                    completionRate: 
                        totalQuestions > 0 
                        ? (responses.length / totalQuestions * 100).toFixed(1) 
                        : 0,
                    hasTranscriptions: responses.filter(r => r.transcription).length,
                    hasAnalysis: responses.filter(r => r.ai_analysis).length
                }
            })

            return {
                ...interview,
                candidates: stats,
                totalCandidates: candidates.length,
                completedCandidates: candidates.filter(c => c.completed_at).length
            }
        })

        console.log('success: true, interviews:', interviewsWithStats || [], ', total:', interviewsWithStats?.length || 0)

        return NextResponse.json({
            success: true, 
            interviews: interviewsWithStats || [],
            total: interviewsWithStats?.length || 0
        })

    } catch (error) {
      console.error('Get interviews error:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch interviews',
        details: error.message }, 
        {status: 500})
    }
}

export const GET = withAdminAuth(getHandler)