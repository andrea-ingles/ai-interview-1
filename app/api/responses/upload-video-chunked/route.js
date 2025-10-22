// file app/api/responses/upload-video-chunked/route.js
import { supabase } from '../../../../lib/database.js'
import { uploadVideo } from '../../../../lib/storage.js'
import { randomUUID  } from 'crypto'

const uuidv4 = () => randomUUID()
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
    responseLimit: false,
  },
}

// POST method - Upload video
export async function POST(request) {
  try {

    console.log('📹 Chunked video upload started')
    console.log('📄 Parsing chunked form data...')

    const formData = await request.formData()
    console.log('📄 Chunked form parsed successfully')
    console.log('📋 Fields received:', Array.from(formData.keys()))

    const video = formData.get("video")
    const sessionId = formData.get("sessionId")
    const questionIndex = formData.get("questionIndex")
    const responseId = formData.get("responseId")
    const candidateId = formData.get("candidateId")

    console.log('📋 Chunked upload params:', { 
      sessionId, 
      questionIndex, 
      responseId, 
      hasVideo: !!video,
      fileSize: video ? (video.size / 1024 / 1024).toFixed(2) + ' MB' : 'N/A'
    })

    // Validation, detailed error handling
    /*if (!sessionId || questionIndex === null || !video) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }*/

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing sessionId",
          details: 'sessionId is required for chunked upload'
         },
        { status: 400 }
      )
    }

    if (questionIndex === null) {
      return NextResponse.json(
        { error: "Missing questionIndex",
          details: 'questionIndex must be a valid number'
         },
        { status: 400 }
      )
    }

    if (!responseId) {
      return NextResponse.json(
        { error: "Missing responseId",
          details: 'responseId is required to associate video with response'
         },
        { status: 400 }
      )
    }

    if (!video) {
      return NextResponse.json(
        { error: "Missing video file",
          details: 'No video file was uploaded'
         },
        { status: 400 }
      )
    }


    // File size check (25MB limit)
    const fileSizeMB = video.size / (1024 * 1024)

    const MAX_FILE_SIZE = 25 * 1024 * 1024 // 50MB
    if (video.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB" },
        { status: 400 }
      )
    }

    if (fileSizeMB === 0) {
      return NextResponse.json(
        { 
          error: 'Empty file', 
          details: 'Uploaded video file appears to be empty'
        },
        { status: 400 }
      )
    }

    // Convert video to buffer
    console.log('📖 Reading chunked video file...') 
    const bytes = await video.arrayBuffer()
    const videoBuffer = Buffer.from(bytes)
    console.log('📖 Chunked file read successfully, buffer size:', videoBuffer.length)

    // ADDED: Validate buffer is not empty
    if (videoBuffer.length === 0) {
      return NextResponse.json(
        { error: 'Video file buffer is empty after reading' },
        { status: 400 }
      )
    }

    console.log('🧪 uuidv4 test:', typeof uuidv4)
    // CHANGED: Generate filename with proper structure
    const fileName = `${sessionId}/${candidateId}/${questionIndex}/${uuidv4()}.webm`
    console.log('📁 Generated chunked filename:', fileName)

    // ADDED: Chunked upload with retry logic
    console.log('☁️ Starting chunked upload to Supabase Storage...')
    
    let uploadAttempts = 0
    const maxAttempts = 3
    let uploadData, uploadError
    
    while (uploadAttempts < maxAttempts) {
      uploadAttempts++
      console.log(`☁️ Chunked upload attempt ${uploadAttempts}/${maxAttempts}`)
      
      try {
        const uploadResult = await supabase.storage
          .from('interview-videos')
          .upload(fileName, videoBuffer, {
            contentType: 'video/webm',
            upsert: true,
            cacheControl: '3600',
            duplex: 'half' // ADDED: Required for chunked uploads
          })
        
        uploadData = uploadResult.data
        uploadError = uploadResult.error
        
        if (!uploadError) {
          console.log('✅ Chunked upload successful on attempt', uploadAttempts)
          break
        } else {
          console.log(`❌ Chunked upload attempt ${uploadAttempts} failed:`, uploadError)
          
          // ADDED: Handle specific error types
          if (uploadError.message?.includes('already exists')) {
            console.log('⚠️ File already exists, continuing with existing file')
            break
          }
          
          if (uploadError.message?.includes('timeout') || uploadError.message?.includes('network')) {
            console.log('⚠️ Network issue detected, will retry')
          }
          
          // ADDED: Wait before retry with exponential backoff
          if (uploadAttempts < maxAttempts) {
            const waitTime = 1000 * Math.pow(2, uploadAttempts - 1) // 1s, 2s, 4s
            console.log(`⏳ Waiting ${waitTime}ms before retry...`)
            await new Promise(resolve => setTimeout(resolve, waitTime))
          }
        }
      } catch (attemptError) {
        console.log(`❌ Chunked upload attempt ${uploadAttempts} exception:`, attemptError)
        uploadError = attemptError
        
        // ADDED: Wait before retry
        if (uploadAttempts < maxAttempts) {
          const waitTime = 1000 * Math.pow(2, uploadAttempts - 1)
          console.log(`⏳ Waiting ${waitTime}ms before retry...`)
          await new Promise(resolve => setTimeout(resolve, waitTime))
        }
      }
    }

    // ADDED: Check if all attempts failed
    if (uploadError) {
      console.log('❌ All chunked upload attempts failed:', uploadError)
      return NextResponse.json(
        { 
          error: 'Chunked upload failed',
          details: `Failed after ${maxAttempts} attempts: ${uploadError.message || uploadError}`,
          uploadMethod: 'chunked',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      )
    }

    console.log('✅ Chunked upload successful:', uploadData)

    // CHANGED: Generate public URL with proper configuration
    console.log('🔗 Generating public URL for chunked upload...')
    const { data: { publicUrl } } = supabase.storage
      .from('interview-videos')
      .getPublicUrl(fileName)
      
    
    console.log('🔗 Chunked upload public URL generated:', publicUrl)

    // ADDED: Test URL accessibility
    try {
      console.log('🧪 Testing chunked upload URL accessibility...')
      const urlTest = await fetch(publicUrl, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })
      console.log('✅ Chunked URL accessibility:', urlTest.ok ? 'ACCESSIBLE' : 'ISSUES DETECTED')
      
      if (!urlTest.ok) {
        console.log('⚠️ URL accessibility issues (non-critical):', urlTest.status, urlTest.statusText)
      }
    } catch (urlError) {
      console.log('⚠️ URL accessibility test failed (non-critical):', urlError.message)
      // Continue anyway as this is not critical
    }

    // REMOVED: The interview/candidate lookup logic (you're passing responseId directly)
    /*// Get candidate ID
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
    }*/

    // CHANGED: Update response record instead of upsert
    console.log('💾 Updating response record with chunked upload URL...')
    const { error: updateError } = await supabase
      .from('responses')
      .update({
        video_url: publicUrl,
        updated_at: new Date().toISOString(), // ADDED
        upload_method: 'chunked' // ADDED: Track upload method
      })
      .eq('id', responseId)

    if (updateError) {
      console.log('❌ Database update error for chunked upload:', updateError)
      return NextResponse.json(
        { 
          error: 'Failed to update response record',
          details: updateError.message
        },
        { status: 500 }
      )
    }

    console.log('✅ Response record updated successfully with chunked upload')
    console.log('🎉 Chunked video upload completed successfully')

    return NextResponse.json({
      success: true,
      videoUrl: publicUrl,
      fileName: fileName, // ADDED
      fileSize: fileSizeMB.toFixed(2) + ' MB', // ADDED
      uploadMethod: 'chunked', // ADDED
      attempts: uploadAttempts, // ADDED
      responseId: responseId
    })

  } catch (error) {
    console.error('💥 Chunked upload error:', error)

    return NextResponse.json(
      { 
        success: false, // ADDED
        error: 'Failed to upload video with chunked method',
        details: error.message,
        uploadMethod: 'chunked', // ADDED
        timestamp: new Date().toISOString() // ADDED
      },
      { status: 500 }
    )
  }
}