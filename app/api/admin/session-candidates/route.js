//file app/api/admin/session-candidates/route.js
import { supabase, getServerUser } from '../../../../lib/authServer.js'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

/*const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)*/

// GET method - Get interview configuration
export async function GET(request, { params, user }) {
  try {

        const interviewId = request.nextUrl.searchParams.get("interview_id")
        // ✅ Step 1: Authenticate admin user
        const { user, error: authError } = await getServerUser(request)
        if (authError || !user) {
            console.log(authError)
            console.log('user :', user)
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get interview configuration
        const { data: interview, error } = await supabase
            .from('interviews')
            .select('*')
            .eq('id', interviewId)
            .single()

        if (error || !interview) {
            return NextResponse.json({ error: 'Interview not found with this interviewId ', interviewId }, {status: 404})
        }

        // Get interview questions configuration
        const { data: interviewQuestions, errorQuestions } = await supabase
            .from('interview_questions')
            .select('*')
            .eq('interview_id', interviewId)

        if (errorQuestions || !interviewQuestions) {
            return NextResponse.json({ error: 'Interview questions not found with this interviewId ', interviewId }, {status: 404})
        }

        // Get all candidates that match interview_id
        const { data: candidates, errorCandidates } = await supabase
        .from('candidates')
        .select(`
            *,
            interview_candidates!inner(
            id,
            candidate_id
            )
        `)
        .eq('interview_candidates.interview_id', interviewId)

        if (errorCandidates || !candidates) {
            return NextResponse.json({ error: 'Interview candidates not found with this interviewId ', interviewId }, {status: 404})
        }

        
        // Get instances of interview_candidates that match interview_id
        const { data: instances, errorInstances } = await supabase
            .from('interview_candidates')
            .select('*')
            .eq('interview_id', interviewId)

        if (errorInstances || !instances) {
            return NextResponse.json({ error: 'Interview candidates not found with this interviewId ', interviewId }, {status: 404})
        }

        // Get all responses for all interview_candidates in this interview
        // with status: completed, reviewed, or reviewing
        const { data: responses, errorResponse } = await supabase
            .from('responses')
            .select(`
                *,
                interview_candidates!inner(
                id,
                status,
                interview_id
                )
            `)
            .eq('interview_candidates.interview_id', interviewId)
            .in('interview_candidates.status', ['completed', 'reviewed', 'reviewing'])

        if (errorResponse || !responses) {
            return NextResponse.json({ error: 'Interview candidates not found with this interviewId ', interviewId }, {status: 404})
        }

        //console.log('Interview: ',interview)
        //console.log('Interview questions: ',interviewQuestions)
        //console.log('Interview instances: ',instances)
        //console.log('Canditates: ', candidates)
        //console.log('Responses: ', responses)
        return NextResponse.json({ interview, interviewQuestions, instances, candidates, responses })

        } catch (error) {
        console.error('Error fetching data:', error)
        return NextResponse.json({ error: 'Failed to fetch data' }, {status: 500})
        }
}