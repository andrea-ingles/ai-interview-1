import { transcribeAudio } from '../../lib/transcription.js'
import { supabase } from '../../lib/database.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { responseId, audioBlob } = req.body

    if (!responseId || !audioBlob) {
      return res.status(400).json({ error: 'Missing required fields' })
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

    res.status(200).json({
      success: true,
      transcription
    })
  } catch (error) {
    console.error('Transcription error:', error)
    res.status(500).json({ error: 'Failed to transcribe audio' })
  }
}