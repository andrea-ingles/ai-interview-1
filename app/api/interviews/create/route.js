import { supabase } from '../../../lib/database'
import { v4 as uuidv4 } from 'uuid'
//import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

/*const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)*/

// POST method - Create new interview
export async function POST(request) {
  try {
    const {
      jobTitle,
      companyName,
      questions,
      analysisPrompts,
      nextSteps,
      timeLimit
    } = await request.json()
    // Validate required fields
    if (!jobTitle || !companyName || !questions || !analysisPrompts) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const sessionId = `interview_${uuidv4()}`
    console.log('Generated sessionId:', sessionId)

    const { data, error } = await supabase
      .from('interviews')
      .insert({
        session_id: sessionId,
        job_title: jobTitle,
        company_name: companyName,
        questions: questions,
        analysis_prompts: analysisPrompts,
        next_steps: nextSteps,
        time_limit: timeLimit || 120
      })
      .select()
      .single()

    if(error){
      console.error('Insert failed:', {
        message: error.message,
        hint: error.hint,
        details: error.details,
        code: error.code
      })
    }else{
      console.log(' Interview inserted')
      console.log('interview:', data)
    }

    const interviewUrl = `${process.env.NEXT_PUBLIC_APP_URL}/interview/${sessionId}`

    return NextResponse.json({
      sessionId,
      interviewUrl,
      interview: data
    }, { status: 201 })

  } catch (error) {
    console.error('Create interview error:', error)
    return NextResponse.json({ error: 'Failed to create interview' }, { status: 500 })
  }

}