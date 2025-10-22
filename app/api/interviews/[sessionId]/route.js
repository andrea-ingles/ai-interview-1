//file app/api/interviews/[sessionId]/route.js
import { supabase } from '../../../../lib/database.js'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

/*const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)*/

// GET method - Get interview configuration
export async function GET(request, { params }) {
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

      return NextResponse.json({ interview })

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

    // Get interview
    const { data: interview, error: interviewError } = await supabase
      .from('interviews')
      .select('id')
      .eq('session_id', sessionId)
      .single()

    if (interviewError || !interview){
      return NextResponse.json({ error: interviewError.message }, { status: 400 })
    }

    // Create or update candidate
    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .upsert({
        interview_id: interview.id,
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

    return NextResponse.json({ candidate })

  } catch (error) {
    console.error('Update candidate error:', error)
    return NextResponse.json({ error: 'Failed to update candidate' }, { status: 500 })
  }
}
