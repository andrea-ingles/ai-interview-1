//file: app/api/responses/save/route.js
import { supabase } from '../../../../lib/database.js'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/*const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)*/

// ✅ Helper: update candidate completion time
async function markCandidateComplete(supabase, interviewId, candidateName) {
  return await supabase
    .from('candidates')
    .update({ completed_at: new Date().toISOString() })
    .eq('interview_id', interviewId)
    .eq('name', candidateName)
    .select()
    .single()
}



// POST method - Save response
export async function POST(request) {
  try{
    console.log('💾 Save response endpoint called')

    const { sessionId, questionIndex, candidateName, step } = await request.json()
    console.log('📋 Save request params:', { sessionId, questionIndex, candidateName, step })

    if (!sessionId || questionIndex === undefined) {
        return NextResponse.json({ error: 'Missing required fields' }, {status: 400})
    }

    // Get interview and candidate
    console.log('🔍 Getting interview for sessionId:', sessionId)
    const { data: interview, error: interviewError } = await supabase
        .from('interviews')
        .select('id')
        .eq('session_id', sessionId)
        .single()

    if (interviewError) {
        console.log('❌ Interview not found:', interviewError)
        return NextResponse.json({ error: 'Interview not found' }, {status: 404})
    }

    console.log('🔍 Getting candidate for interview:', interview.id)
    const { data: candidate, error: candidateError } = await supabase
        .from('candidates')
        .select('id')
        .eq('interview_id', interview.id)
        .eq('name', candidateName)
        .maybeSingle()

    if (candidateError) {
        console.log('❌ Candidate not found:', candidateError)
        return NextResponse.json({ error: 'Candidate not found' }, {status: 404})
    }

    // Check if response already exists
    console.log('🔍 Checking for existing response...')
    const { data: existingResponse, error: checkError } = await supabase
        .from('responses')
        .select('id')
        .eq('candidate_id', candidate.id)
        .eq('question_index', questionIndex)
        .maybeSingle()

    let response

    if (existingResponse) {
        console.log('🔄 Updating existing response:', existingResponse.id)
        // Update existing response
        const { data: updatedResponse, error: updateError } = await supabase
            .from('responses')
            .update({
            updated_at: new Date().toISOString()
            })
            .eq('id', existingResponse.id)
            .select()
            .single()

        if (updateError) throw updateError

        response = updatedResponse

    } else {
        console.log('➕ Creating new response...')
        // Create new response
        const { data: newResponse, error: insertError } = await supabase
            .from('responses')
            .insert({
            candidate_id: candidate.id,
            question_index: questionIndex,
            video_url: null, // Will be updated when video is uploaded
            recorded_at: new Date().toISOString()
            })
            .select()
            .single()

        if (insertError) throw insertError
        response = newResponse
    }

    console.log('✅ Response saved successfully:', response.id)
    
    // ✅ If interview is complete, update candidate completion timestamp
    if (step === 'complete') {
        console.log('⏰ Interview marked complete — updating candidate completion time...')
        const { data: updatedCandidate, error: completionError } =
            await markCandidateComplete(supabase, interview.id, candidateName)

        if (completionError) {
            console.error('❌ Failed to update candidate completion time:', completionError)
        } else {
            console.log('✅ Candidate completion time updated at:', updatedCandidate.completed_at)
        }
    }

    
    return NextResponse.json({ 
      success: true, 
      response: response 
    }, {status: 200})

  } catch (error) {
    console.error('💥 Save response error:', error)
    return NextResponse.json({ 
      error: 'Failed to save response',
      details: error.message 
    }, {status: 500})
  }
}