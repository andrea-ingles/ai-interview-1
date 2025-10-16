import { supabase } from '../../../lib/database.js'
import { uploadVideo } from '../../../lib/storage.js'
import formidable from 'formidable'
import fs from 'fs'

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const form = formidable({
      maxFileSize: 50 * 1024 * 1024, // 50MB
      keepExtensions: true
    })

    const [fields, files] = await form.parse(req)
    
    const sessionId = fields.sessionId[0]
    const questionIndex = parseInt(fields.questionIndex[0])
    const videoFile = files.video[0]

    if (!sessionId || questionIndex === undefined || !videoFile) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Read video file
    const videoBuffer = fs.readFileSync(videoFile.filepath)
    
    // Upload to storage
    const { fileName, publicUrl } = await uploadVideo(sessionId, questionIndex, videoBuffer)

    // Get candidate ID
    const { data: interview } = await supabase
      .from('interviews')
      .select('id')
      .eq('session_id', sessionId)
      .single()

    const { data: candidate } = await supabase
      .from('candidates')
      .select('id')
      .eq('interview_id', interview.id)
      .single()

    // Save response record
    const { data: response, error } = await supabase
      .from('responses')
      .upsert({
        candidate_id: candidate.id,
        question_index: questionIndex,
        video_url: publicUrl
      })
      .select()
      .single()

    if (error) throw error

    // Clean up temp file
    fs.unlinkSync(videoFile.filepath)

    res.status(200).json({
      success: true,
      videoUrl: publicUrl,
      responseId: response.id
    })
  } catch (error) {
    console.error('Upload video error:', error)
    res.status(500).json({ error: 'Failed to upload video' })
  }
}