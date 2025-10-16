import { analyzeResponse } from '../../lib/ai-analysis.js'
import { supabase } from '../../lib/database.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { responseId, transcription, question, analysisPrompts } = req.body

    if (!responseId || !transcription || !question || !analysisPrompts) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Analyze response with AI
    const analysis = await analyzeResponse(transcription, question, analysisPrompts)

    // Update response with analysis
    const { error } = await supabase
      .from('responses')
      .update({ ai_analysis: analysis })
      .eq('id', responseId)

    if (error) throw error

    res.status(200).json({
      success: true,
      analysis
    })
  } catch (error) {
    console.error('Analysis error:', error)
    res.status(500).json({ error: 'Failed to analyze response' })
  }
}