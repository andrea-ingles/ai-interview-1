//file: app/api/transcribe/route.js
import { transcribeAndFormat } from '../../../../lib/transcription.js'
import { supabase } from '../../../../lib/authServer.js'

import { NextResponse } from 'next/server'
/*import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)*/

// POST method - Update response with transcription
export async function POST(request) {
  try{
    const { responseId, videoUrl } = await request.json()

    if (!responseId || !videoUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 1. Fetch the video file from Supabase
    const videoResponse = await fetch(videoUrl)

    if (!videoResponse.ok){
      throw new Error ("Failed to fetch video from URL")
    }

    // 2. Get the file as a blob
    const videoBlob = await videoResponse.blob()

    // 3. Extract filename from URL or create a default one
    const  urlPath = new URL(videoUrl).pathname
    const filename = urlPath.split('/').pop() || 'audio.mp4'

    // 4. Create a File object that Openai expects
    const audioFile = new File([videoBlob], filename,{
      type: videoBlob.type ||  'video/mp4'
    })

    // 5. Transcribe audio
    const {rawTranscription, formattedSegments} = await transcribeAndFormat(audioFile)
    console.log('raw transcription: ', rawTranscription)
    console.log('formatted transcription: ', formattedSegments.segments)


    // 6. Update response with transcription
    const { error } = await supabase
      .from('responses')
      .update({ 
        transcription: rawTranscription,
        formatted_segments: formattedSegments.segments })
      .eq('id', responseId)

    if (error) throw error

    return NextResponse.json({
      success: true,
      rawTranscription,
      formattedSegments
    }, {status: 200})

  } catch (error) {
    console.error('Transcription error:', error)
    return NextResponse.json({ error: 'Failed to transcribe audio' }, {status: 500})
  }

}