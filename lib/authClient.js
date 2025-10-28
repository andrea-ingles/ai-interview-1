// ===== 1. AUTH UTILITIES (lib/auth.js) - CLIENT SIDE =====
'use client'
import { createClient } from '@supabase/supabase-js'
import { useState, useEffect } from 'react'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Client-side Supabase instance (for auth)
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)

// Server-side auth utilities
export async function getServerUser(request) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { user: null, error: 'No authorization header' }
    }

    const token = authHeader.split(' ')[1]

    // Create server client with the token (I am verifying a USER's token, not performing admin operations.)
    // The JWT token was issued against the ANON_KEY
    // Supabase uses the key to verify the token's signature
    // Service role key can't properly verify user-issued tokens
    // I am authenticating AS the user, not as an admin
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // Verify the JWT token and get user
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return { user: null, error: error?.message || 'Invalid token' }
    }

    return { user, error: null }
  } catch (error) {
    return { user: null, error: error.message }
  }
}

// Client-side auth hooks
export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return { user, loading }
}

// Auth-aware client creator
export function createAuthClient(accessToken) {
  if (!supabaseAnonKey) {
    throw new Error('Missing Supabase Anon key in environment variables')
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  })
}
