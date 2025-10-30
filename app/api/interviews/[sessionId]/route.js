//file app/api/interviews/[sessionId]/route.js
import { supabase } from '../../../../lib/authServer.js'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

/*const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)*/

// GET method - Get interview configuration
export async function GET(request, { params, user }) {
  try {

      const { sessionId } = await params

      // Get interview configuration
      const { data: interview, error } = await supabase
        .from('interviews')
        .select('*')
        .eq('session_id', sessionId)
        .single()

      if (error || !interview) {
        return NextResponse.json({ error: 'Interview not found' }, {status: 404})
      }

      // Get interview questions configuration
      const { data: interviewQuestions, errorQuestions } = await supabase
        .from('interview_questions')
        .select('*')
        .eq('interview_id', interview.id)

      if (errorQuestions || !interviewQuestions) {
        return NextResponse.json({ error: 'Interview questions not found' }, {status: 404})
      }


      return NextResponse.json({ interview, interviewQuestions })

    } catch (error) {
      console.error('Get interview error:', error)
      return NextResponse.json({ error: 'Failed to fetch interview' }, {status: 500})
    }
}


// PUT method - Update candidate info
export async function PUT(request, { params }) {
  try {
    const { sessionId } = await params
    const { candidateName, candidateEmail, candidatePhone } = await request.json()

    // 1. Get interview
    const { data: interview, error: interviewError } = await supabase
      .from('interviews')
      .select('id')
      .eq('session_id', sessionId)
      .single()

    if (interviewError || !interview){
      return NextResponse.json({ error: interviewError.message }, { status: 400 })
    }

    // 2. Create or update candidate
    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .upsert({
        name: candidateName,
        email: candidateEmail,
        phone: candidatePhone
      })
      .select()
      .maybeSingle()
    

    if (candidateError){
      console.error('❌ Supabase upsert error:', candidateError)
      return NextResponse.json({ error: candidateError.message }, { status: 400 })
    }

    if (!candidate) {
      console.warn('⚠️ Candidate upsert returned no data — possibly due to no changes or missing return preference.')
      return NextResponse.json({ message: 'Candidate updated (no data returned)' }, { status: 200 })
    }

    console.log('✅ Candidate created or updated:', candidate.name)

    //3. Create a new instance of interview_candidates
    const { data:interview_candidates, error: instanceError } = await supabase
      .from('interview_candidates')
      .insert({
        interview_id: interview.id,
        candidate_id: candidate.id,
        status: "not_started"
      })
      .select()
      .single()
    

    if (instanceError){
      console.error('❌ Supabase insert error:', instanceError)
      return NextResponse.json({ error: instanceError.message }, { status: 400 })
    }

    if (!interview_candidates) {
      console.warn('⚠️ Candidate insert returned no data — possibly due to missing return preference.')
      return NextResponse.json({ message: 'Interview instance created (no data returned)' }, { status: 200 })
    }

    console.log('✅ Instance of interview with sessionId; ', sessionId, 'and created for: ', candidate.name)
    console.log(interview_candidates)


    return NextResponse.json({ candidate, interview_candidates })

  } catch (error) {
    console.error('Update candidate error:', error)
    return NextResponse.json({ error: 'Failed to update candidate' }, { status: 500 })
  }
}
