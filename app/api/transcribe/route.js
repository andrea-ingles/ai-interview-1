import { transcribeAudio } from '../../../lib/transcription.js'
import { supabase } from '../../../lib/database.js'

import { NextResponse } from 'next/server'
/*import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)*/

// POST method - Update response with transcription
export async function POST(request) {
  try{
    const { responseId, audioBlob } = await request.json()

    if (!responseId || !audioBlob) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Convert base64 to buffer
    const audioBuffer = Buffer.from(audioBlob, 'base64')

    // Transcribe audio
    const transcription = await transcribeAudio(audioBuffer)

    // Update response with transcription
    const { error } = await supabase
      .from('responses')
      .update({ transcription })
      .eq('id', responseId)

    if (error) throw error

    return NextResponse.json({
      success: true,
      transcription
    }, {status: 200})

  } catch (error) {
    console.error('Transcription error:', error)
    return NextResponse.json({ error: 'Failed to transcribe audio' }, {status: 500})
  }

}