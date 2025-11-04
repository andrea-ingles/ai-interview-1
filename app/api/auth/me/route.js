// app/api/auth/me/route.js
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabase } from '../../../../lib/authServer.js'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('linkedin_session')?.value

    if (!sessionToken) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    // Verify session and get candidate data from Supabase
    const { data: session, error: sessionError } = await supabase
      .from('linkedin_sessions')
      .select(`
        expires_at,
        candidate:candidates!inner (
          id,
          email,
          name,
          phone,
          linkedin_profile
        )
      `)
      .eq('session_token', sessionToken)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    const candidate = session.candidate

    // Parse LinkedIn profile if stored as JSON
    const linkedinProfile = typeof candidate.linkedin_profile === 'string' 
      ? JSON.parse(candidate.linkedin_profile) 
      : candidate.linkedin_profile

     // Extract name from LinkedIn profile or candidate record
    const firstName = linkedinProfile?.given_name || linkedinProfile?.localizedFirstName || ''
    const lastName = linkedinProfile?.family_name || linkedinProfile?.localizedLastName || ''

    return NextResponse.json({
      authenticated: true,
      firstName,
      lastName,
      email: candidate.email || linkedinProfile?.email,
      phone: candidate.phone,
      linkedinProfile: linkedinProfile
    })

  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json({ authenticated: false }, { status: 500 })
  }
}