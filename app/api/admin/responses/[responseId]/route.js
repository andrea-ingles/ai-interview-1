import { supabase } from '../../../lib/database.js'
import { NextResponse } from 'next/server'

// GET method - Get all interviews
export async function GET(request, { params }) {
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

        // Calculate some statistics
        const interview = response.candidates.interviews // Assuming one candidate per interview
        const questions = interview.questions[response.question_index]


        return NextResponse.json({
            success: true, 
            response:{
                ...response,
                question: question,
                candidateName: response.candidates.name,
                jobTitle: interview.job_title,
                companyName: interview.company_name
            }
        })

    } catch (error) {
      console.error('Get response error:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch response',
        details: error.message}, 
        {status: 500})
    }
}