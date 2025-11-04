//file app/api/auth/linkedin/route.js
// To DELETE
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { code, redirectUri } = await request.json()

    // Exchange code for access token
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET
      })
    })

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for token')
    }

    const { access_token } = await tokenResponse.json()

    // Fetch user profile
    const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { 'Authorization': `Bearer ${access_token}` }
    })

    if (!profileResponse.ok) {
      throw new Error('Failed to fetch profile')
    }

    const profile = await profileResponse.json()

    return NextResponse.json({ profile })

  } catch (error) {
    console.error('LinkedIn auth error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}