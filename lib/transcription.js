import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})


export async function transcribeAudio(audioFile) {
  try {


    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "gpt-4o-mini-transcribe", // ⚙️ updated model name from "whisper-1"
      language: "en", // or detect automatically
      response_format: "text"
    })

    return transcription
  } catch (error) {
    console.error('Transcription error:', error)
    throw new Error('Failed to transcribe audio')
  }
}

// Alternative: Web Speech API for real-time transcription
export function setupWebSpeechAPI(onResult, onError) {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    throw new Error('Speech recognition not supported')
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  const recognition = new SpeechRecognition()

  recognition.continuous = true
  recognition.interimResults = true
  recognition.lang = 'en-US'

  recognition.onresult = (event) => {
    let finalTranscript = ''
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript
      }
    }
    if (finalTranscript) {
      onResult(finalTranscript)
    }
  }

  recognition.onerror = onError

  return recognition
}