// app/api/auth/reset-password/route.js
import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/authServer'

export async function POST(request) {
  try {
    const { email, newPassword } = await request.json()

    // Validate input
    if (!email || !newPassword) {
      return NextResponse.json(
        { error: 'Email and new password are required' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    // Look up user by email
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers()
    if (userError) {
      console.error('Error fetching users:', userError)
      return NextResponse.json({ error: 'Unable to fetch users' }, { status: 500 })
    }

    const user = userData.users.find((u) => u.email === email)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Update the password
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    )

    if (updateError) {
      console.error('Password update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to reset password' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: true, message: 'Password updated successfully' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
