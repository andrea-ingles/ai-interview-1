import { analyzeResponse } from '../../../../lib/ai-analysis.js'
import { supabase } from '../../../../lib/authServer.js'

import { NextResponse } from 'next/server'
/*import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)*/

// POST method - Update response with AI analysis
export async function POST(request) {
  try{
    const { responseId, transcription, question, analysisPrompts } = await request.json()

    if (!responseId || !transcription || !question || !analysisPrompts) {
      return NextResponse.json({ error: 'Missing required fields' }, {status: 400})
    }

    // Analyze response with AI
    const analysis = await analyzeResponse(transcription, question, analysisPrompts)

    // Update response with analysis
    const { error } = await supabase
      .from('responses')
      .update({ ai_analysis: analysis })
      .eq('id', responseId)

    if (error) throw error

    return NextResponse.json({
      success: true,
      analysis
    }, {status: 200})

  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json({ error: 'Failed to analyze response' }, {status: 500})
  }

}