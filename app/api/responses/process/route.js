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
    let rawTranscription = response.transcription
    let formattedSegments = response.formatted_segments
    if (!rawTranscription) {
      console.log('Starting transcription...')
      const transcribeResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/responses/transcribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responseId, videoUrl })
      })

      if (transcribeResponse.ok) {
        const transcribeData = await transcribeResponse.json()
        rawTranscription = transcribeData.rawTranscription
        formattedSegments = transcribeData.formattedSegments
        console.log('Transcription completed')
      } else {
        throw new Error('Transcription failed')
      }
    }

    // Step 2: Analyze if not already done
    let analysis = response.ai_analysis
    if (!analysis && rawTranscription) {
      console.log('Starting AI analysis...')
      const interview = response.interview_questions.interviews
      const question = response.interview_questions.question_text
      const category = response.interview_questions.category
      const analysisPrompts = interview.analysis_prompts

      // Declare 'more' outside the if block
      const more = (category === 'basic' || category === 'experience') 
        ? response.interview_questions.more 
        : undefined


      console.log('Now, to analyze question: ', question, '.')
      console.log('Transcription is: ', rawTranscription)
      console.log('Transcription formatted is: ', formattedSegments)

      const analyzeResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/responses/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          responseId, 
          rawTranscription,
          formattedSegments, 
          question,
          ...(more !== undefined ? { more } : {}),
          analysisPrompts 
        })
      })

      if (analyzeResponse.ok) {
        const analyzeData = await analyzeResponse.json()
        analysis = analyzeData.analysis
        formattedSegments = analyzeData.formattedAnalysis
        console.log('AI analysis completed')
      } else {
        throw new Error('AI analysis failed')
      }
    }

    return NextResponse.json({ 
        success: true,
        message: 'Response processing completed',
        transcription: rawTranscription,
        analysis: analysis,
        formatted_segments: formattedSegments
        }, {status: 200})

  } catch (error) {
    console.error('Process response error:', error)
    return NextResponse.json({
        error: 'Failed to process response',
        details: error.message }, 
        {status: 500})
  }

}