import { supabase } from '../../../lib/database.js'

export default async function handler(req, res) {
  const { sessionId } = req.query

  if (req.method === 'GET') {
    try {
      // Get interview configuration
      const { data: interview, error } = await supabase
        .from('interviews')
        .select('*')
        .eq('session_id', sessionId)
        .single()

      if (error || !interview) {
        return res.status(404).json({ error: 'Interview not found' })
      }

      res.status(200).json({ interview })
    } catch (error) {
      console.error('Get interview error:', error)
      res.status(500).json({ error: 'Failed to fetch interview' })
    }
  } else if (req.method === 'PUT') {
    try {
      const { candidateName, candidateEmail, candidatePhone } = req.body

      // Get interview
      const { data: interview, error: interviewError } = await supabase
        .from('interviews')
        .select('id')
        .eq('session_id', sessionId)
        .single()

      if (interviewError) throw interviewError

      // Create or update candidate
      const { data: candidate, error: candidateError } = await supabase
        .from('candidates')
        .upsert({
          interview_id: interview.id,
          name: candidateName,
          email: candidateEmail,
          phone: candidatePhone
        })
        .select()
        .single()

      if (candidateError) throw candidateError

      res.status(200).json({ candidate })
    } catch (error) {
      console.error('Update candidate error:', error)
      res.status(500).json({ error: 'Failed to update candidate' })
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}