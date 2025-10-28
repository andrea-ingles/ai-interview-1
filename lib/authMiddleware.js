//file lib/authMiddleware.js - Server-only
import { getServerUser } from './authServer'
import { NextResponse } from 'next/server'

export function withAuth(handler) {
  return async (request, context) => {
    try {
      const { user, error } = await getServerUser(request)
      
      if (error || !user) {
        return NextResponse.json({ 
          error: 'Unauthorized', 
          message: error.message ||'Please log in to access this resource' 
        },
        { status: 401 })
      }
      
      // Continue to the actual handler
      return handler(request, { ...context, user })
    } catch (error) {
      return NextResponse.json({ 
        error: 'Authentication error', 
        message: error.message 
        },
        { status: 500 })
    }
  }
}

// Admin-only middleware
export function withAdminAuth(handler) {
  return async (request, context) => {
    try {
      const { user, error } = await getServerUser(request)
      //console.log('Authenticated user:', user.email, user.role)
      if (error || !user) {
        return NextResponse.json({ 
          error: 'Unauthorized', 
          message: error.message || 'Please log in to access this resource' 
        },
        { status: 401 })
      }

      // Check if user is admin (you can customize this logic)
      const isAdmin = user.role === 'admin'
      //console.log('IsAdmin:', isAdmin)
      
      if (!isAdmin) {
        return NextResponse.json({ 
          error: 'Forbidden', 
          message: 'Admin access required' 
        },
        { status: 403 })
      }

      return handler(request, { ...context, user })
    } catch (error) {
      return NextResponse.json({ 
        error: 'Authentication error', 
        message: error.message 
        },
        { status: 500 })
    }
  }
}
