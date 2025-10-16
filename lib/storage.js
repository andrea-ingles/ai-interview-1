import { supabase } from './database.js'
import { v4 as uuidv4 } from 'uuid'

export async function uploadVideo(sessionId, questionIndex, videoBlob) {
  try {
    const fileName = `${sessionId}/${questionIndex}/${uuidv4()}.webm`
    
    const { data, error } = await supabase.storage
      .from('interview-videos')
      .upload(fileName, videoBlob, {
        contentType: 'video/webm',
        upsert: false
      })

    if (error) throw error

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('interview-videos')
      .getPublicUrl(fileName)

    return { fileName, publicUrl }
  } catch (error) {
    console.error('Upload error:', error)
    throw new Error('Failed to upload video')
  }
}

export async function getSignedUploadUrl(sessionId, questionIndex) {
  try {
    const fileName = `${sessionId}/${questionIndex}/${uuidv4()}.webm`
    
    const { data, error } = await supabase.storage
      .from('interview-videos')
      .createSignedUploadUrl(fileName, {
        expiresIn: 3600 // 1 hour
      })

    if (error) throw error

    return { fileName, uploadUrl: data.signedUrl }
  } catch (error) {
    console.error('Signed URL error:', error)
    throw new Error('Failed to create upload URL')
  }
}