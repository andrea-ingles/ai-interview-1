// file: app/api/admin/pending-reviews/route.js
import { supabase, getServerUser } from '../../../../lib/authServer.js'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    
    // ✅ Step 1: Authenticate admin user
    const { user, error: authError } = await getServerUser(request)
    if (authError || !user) {
        console.log(authError)
        console.log('user :', user)
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get interviews that have candidates pending review
    // Status filter: 'completed', 'reviewed', or 'reviewing'
    const { data: interviews, error } = await supabase
      .from('interviews')
      .select(`
        id,
        job_title,
        company_name,
        created_at,
        interview_candidates!inner(
          id,
          status
        )
      `)
      .in('interview_candidates.status', ['completed', 'reviewed', 'reviewing'])
      .order('created_at', { ascending: false })
   

    if (error) {
      console.error('Error fetching pending reviews:', error)
      return NextResponse.json(
        { error: 'Failed to fetch pending reviews' },
        { status: 500 }
      )
    }

    // Process the data to count pending candidates per interview
    const interviewsMap = new Map()
    //console.log('Interview data: ', interviews)
    interviews.forEach(interview => {
        const interviewId = interview.id
        
        if (!interviewsMap.has(interviewId)) {
            interviewsMap.set(interviewId, {
            id: interview.id,
            job_title: interview.job_title,
            company_name: interview.company_name,
            created_at: interview.created_at,
            pending_count: 0
            })
        }
        
        // Count candidates with pending review status
        for (const c of interview.interview_candidates) {
            if (['completed', 'reviewed', 'reviewing'].includes(c.status)) {
                const existing = interviewsMap.get(interviewId);
                existing.pending_count += 1;
            }
        }
    })

    // Convert map to array and filter out interviews with 0 pending
    let interviewsList = Array.from(interviewsMap.values())
      .filter(interview => interview.pending_count > 0)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5) // Limit to 5 most recent

    return NextResponse.json({
      interviews: interviewsList
    })

  } catch (error) {
    console.error('Error in pending-reviews API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}