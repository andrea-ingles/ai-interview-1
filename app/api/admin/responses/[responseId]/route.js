import { NextResponse } from 'next/server'
import { withAdminAuth } from '../../../../../lib/authMiddleware.js'

// GET method - Get all interviews (Admin-only)
async function getHandler(request, { params, user }) {
  try {

        const { responseId } = await params

        // Get response
        const { data: response, error } = await supabase
            .from('responses')
            .select(`
                *,
                candidates (
                    name,
                    email,
                    interviews (
                        job_title,
                        company_name,
                        questions,
                        created_by
                    )
                )
            `)
            .eq('id', responseId)
            .single()

        if (error || !response) {
            return NextResponse.json({ error: 'Response not found' }, {status: 404})
        }

        // Security check: ensure the response belongs to an interview created by current user
        if (response.candidates.interviews.created_by !== req.user.id) {
            return NextResponse.json({ error: 'Access denied' }, {status: 403})
    }


        // Calculate some statistics
        const interview = response.candidates.interviews // Assuming one candidate per interview
        const question = interview.questions[response.question_index]


        return NextResponse.json({
            success: true, 
            response:{
                ...response,
                question: question,
                candidateName: response.candidates.name,
                jobTitle: interview.job_title,
                companyName: interview.company_name
            }
        }, {status: 200})

    } catch (error) {
      console.error('Get response error:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch response',
        details: error.message}, 
        {status: 500})
    }
}

export const GET = withAdminAuth(getHandler)