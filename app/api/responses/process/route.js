//file: app/api/responses/process/route.js
import { supabase } from '../../../../lib/authServer.js'
import { NextResponse } from 'next/server'

// POST method - Save response
export async function POST(request) {
  try{
  
    const { responseId } = await request.json()

    if (!responseId) {
        return NextResponse.json({ 
        error: 'Missing response ID',
        details: error.message 
        }, {status: 400})
    }

    // Get response details
    const { data: response, error: responseError } = await supabase
      .from('responses')
      .select(`
        *,
        interview_questions (
            *,
            interviews (
                analysis_prompts
          )
        )
      `)
      .eq('id', responseId)
      .single()

    if (responseError) throw responseError

    const videoUrl = response.video_url
    if (!videoUrl) {
      return NextResponse.json({ 
        error: 'No video URL found for this response',
        details: error.message 
        }, {status: 400})
    }

    // Step 1: Transcribe if not already done
    let transcription = response.transcription
    if (!transcription) {
      console.log('Starting transcription...')
      const transcribeResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/responses/transcribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responseId, videoUrl })
      })

      if (transcribeResponse.ok) {
        const transcribeData = await transcribeResponse.json()
        transcription = transcribeData.transcription
        console.log('Transcription completed')
      } else {
        throw new Error('Transcription failed')
      }
    }

    // Step 2: Analyze if not already done
    let analysis = response.ai_analysis
    if (!analysis && transcription) {
      console.log('Starting AI analysis...')
      const interview = response.interview_questions.interviews
      const question = response.interview_questions.question_text
      const analysisPrompts = interview.analysis_prompts

      console.log('Now, to analyze question: ', question, '.')
      console.log('Transcription is: ', transcription)

      const analyzeResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/responses/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          responseId, 
          transcription, 
          question, 
          analysisPrompts 
        })
      })

      if (analyzeResponse.ok) {
        const analyzeData = await analyzeResponse.json()
        analysis = analyzeData.analysis
        console.log('AI analysis completed')
      } else {
        throw new Error('AI analysis failed')
      }
    }

    return NextResponse.json({ 
        success: true,
        message: 'Response processing completed',
        transcription: transcription,
        analysis: analysis 
        }, {status: 200})

  } catch (error) {
    console.error('Process response error:', error)
    return NextResponse.json({
        error: 'Failed to process response',
        details: error.message }, 
        {status: 500})
  }

}