//import { supabase } from '../../../lib/database'
import { v4 as uuidv4 } from 'uuid'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  // Test Supabase connection
  //console.log('=== Testing Supabase connection ===')
  //console.log('Supabase client exists:', !!supabase)
  //console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  //console.log('Supabase key exists:', !!process.env.SUPABASE_ANON_KEY)


  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  console.log( '=== API Route Called===')

  try {
    const {
      jobTitle,
      companyName,
      questions,
      analysisPrompts,
      nextSteps,
      timeLimit
    } = req.body


    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    console.log(' Client created')

    // Validate required fields
    if (!jobTitle || !companyName || !questions || !analysisPrompts) {
      return res.status(400).json({ error: 'Missing required fields' })
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

    res.status(201).json({
      sessionId,
      interviewUrl,
      interview: data
    })

    //res.status(201).json({success: true})

  } catch (error) {
    console.error('Create interview error:', error)
    res.status(500).json({ error: 'Failed to create interview' })
  }
}