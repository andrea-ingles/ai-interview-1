// For dashboard, not for the review.
import { supabase } from '../../../../../lib/authServer.js'
import { withAdminAuth } from '../../../../../lib/authMiddleware.js'
import { NextResponse } from 'next/server'

// GET method - Get all interviews (Admin-only)
async function getHandler(request, context) {
  try {

        //console.log('Context: ', context)
        const { params, user } = await context
        const { sessionId } = await params
        //console.log('sessionId: ',sessionId)


        if (!sessionId) {
            return NextResponse.json({ error: 'Missing sessionId in params' }, { status: 400 })
        }
        

        // Get interview configuration
        const { data: interview, error } = await supabase
            .from('interviews')
            .select(`
                *,
                interview_questions (
                    id,
                    short_name,
                    question_text,
                    tags_questions,
                    position,
                    created_at
                    ),
                candidates (
                    id,
                    name,
                    email,
                    phone,
                    completed_at,
                    created_at,
                    responses (
                        id,
                        interview_question_id,
                        video_url,
                        transcription,
                        ai_analysis,
                        recorded_at,
                        tags_answers,
                        notes
    
                    )
                )
            `)
            .eq('session_id', sessionId)
            .single()

        if (error || !interview) {
            return NextResponse.json({ error: 'Interview not found' }, {status: 404})
        }

        // Calculate some statistics
        const candidate = interview.candidates[0] // Assuming one candidate per interview
        const responses = candidate?.responses || []
        const totalQuestions = interview.questions.length
        const completedQuestions = responses.length

        return NextResponse.json({
            ...interview,
            success: true, 
            stats:{
                totalQuestions,
                completedQuestions,
                completionRate: totalQuestions > 0 ? (completedQuestions / totalQuestions * 100).toFixed(1) : 0,
                candidateName: candidate?.name || 'Unknown',
                startedAt: candidate?.created_at,
                completedAt: candidate?.completed_at,
                hasTranscriptions: responses.filter(r => r.transcription).length,
                hasAnalysis: responses.filter(r => r.ai_analysis).length
            }
        })

    } catch (error) {
      console.error('Get interview error:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch interview',
        details: error.message}, 
        {status: 500})
    }
}

export const GET = withAdminAuth(getHandler)