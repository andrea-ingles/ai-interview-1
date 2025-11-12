// app/api/auth/signup/route.js
import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/authServer'

export async function POST(request) {
  try {
    const { email, password } = await request.json()

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    // Create user with service role key
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      role: 'admin'
    })

    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    // Update user's app metadata to set role as admin
    {/*const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      authData.user.id,
      {
        app_metadata: {
          role: 'admin'
        }
      }
    )

    if (updateError) {
      console.error('Update error:', updateError)
      // User was created but role wasn't set - log this
      return NextResponse.json(
        { 
          error: 'User created but role assignment failed',
          userId: authData.user.id 
        },
        { status: 500 }
      )
    }*/}

    return NextResponse.json(
      {
        success: true,
        message: 'Admin account created successfully',
        user: {
          id: authData.user.id,
          email: authData.user.email,
          role: 'admin'
        }
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}