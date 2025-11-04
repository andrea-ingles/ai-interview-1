// app/api/auth/linkedin/callback/route.js
import fetch from 'node-fetch'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabase } from '../../../../../lib/authServer.js'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state') // This is the sessionId

  if (!code) {
    return NextResponse.json({ error: 'Missing code' }, { status: 400 })
  }

  try {
    // Exchange code for token
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/linkedin/callback`,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET
      })
    })

    const tokenJson = await tokenRes.json()
    console.log("LinkedIn token response:", tokenJson)
    if (!tokenJson.id_token) {
      throw new Error('Token exchange failed')
    }

    // Fetch profile using OAuth 2.0 OIDC endpoint
    const accessToken = tokenJson.access_token
    const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { 
        'Authorization': `Bearer ${accessToken}`,
      }
    })

    /*const fullProfileRes = await fetch(
        `https://api.linkedin.com/v2/me?projection=(` +
        `id,localizedFirstName,localizedLastName,vanityName,localizedHeadline,` +
        `profilePicture(displayImage~:playableStreams))`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      )*/

    // Debug metadata
  //console.log("LinkedIn userinfo status:", profileRes.status);
  //console.log("LinkedIn userinfo headers:", Object.fromEntries(profileRes.headers.entries()));

    
    if (!profileRes.ok) {
      const err = await profileRes.text()
      console.error("LinkedIn profile error:", err)
      throw new Error('Failed to fetch profile')
    }
    
    const profile = await profileRes.json()
    console.log("LinkedIn OIDC profile:", profile)

    // Create/update candidate in Supabase
    // Upsert candidate by email
    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .upsert({
        email: profile.email || profile?.email_address,
        name: `${profile.given_name || ''} ${profile.family_name || ''}`.trim(),
        linkedin_profile: profile,
        linkedin_id: profile.sub // LinkedIn's unique user ID
      }, { 
        onConflict: 'linkedin_id',
        ignoreDuplicates: false 
      })
      .select()
      .single()

    if (candidateError) {
      console.error('Candidate upsert error:', candidateError)
      throw candidateError
    }

    // Create session
    const sessionToken = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    const { error: sessionError } = await supabase
      .from('linkedin_sessions')
      .insert({
        session_token: sessionToken,
        candidate_id: candidate.id,
        expires_at: expiresAt.toISOString()
      })

    if (sessionError) {
      console.error('Session creation error:', sessionError)
      throw sessionError
    }

    // Set session cookie
    const cookieStore = await cookies()
    cookieStore.set('linkedin_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/'
    })

    // Redirect back to interview page
    const redirectUrl = new URL(`/interview/${state || ''}`, request.url)
    return NextResponse.redirect(redirectUrl)

  } catch (error) {
    console.error('LinkedIn callback error:', error)
    
    // Redirect to interview page with error
    const redirectUrl = new URL(`/interview/${state || ''}`, request.url)
    redirectUrl.searchParams.set('auth_error', 'true')
    return NextResponse.redirect(redirectUrl)
  }
}