import { supabase } from '../../../../lib/database.js'
import { uploadVideo } from '../../../../lib/storage.js'
/*import formidable from 'formidable'
import fs from 'fs'*/

import { NextResponse } from 'next/server'
/*import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)*/

// Disable body parsing for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
}

// POST method - Upload video
export async function POST(request) {
  try {
    const formData = await request.formData()
    const video = formData.get("video")
    const sessionId = formData.get("sessionId")
    const questionIndex = formData.get("questionIndex")

    // Validation
    if (!sessionId || questionIndex === null || !video) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // File size check (50MB limit)
    const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
    if (video.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB" },
        { status: 400 }
      )
    }

    // Convert video to buffer
    const bytes = await video.arrayBuffer()
    const videoBuffer = Buffer.from(bytes)

    // Upload to storage
    const { fileName, publicUrl } = await uploadVideo(
      sessionId,
      parseInt(questionIndex),
      videoBuffer
    )

    // Get candidate ID
    const { data: interview } = await supabase
      .from('interviews')
      .select('id')
      .eq('session_id', sessionId)
      .single()

    if (!interview) {
      return NextResponse.json(
        { error: 'Interview not found' },
        { status: 404 }
      )
    }

    const { data: candidate } = await supabase
      .from('candidates')
      .select('id')
      .eq('interview_id', interview.id)
      .single()

    if (!candidate) {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 }
      )
    }

    // Save response record
    const { data: response, error } = await supabase
      .from('responses')
      .upsert({
        candidate_id: candidate.id,
        question_index: parseInt(questionIndex),
        video_url: publicUrl
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      videoUrl: publicUrl,
      responseId: response.id
    })

  } catch (error) {
    console.error('Upload video error:', error)
    return NextResponse.json(
      { error: 'Failed to upload video' },
      { status: 500 }
    )
  }
}