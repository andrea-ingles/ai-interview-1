'use client'
import { useRouter } from 'next/navigation'
import { useAuthContext } from './AuthProvider'
import { useEffect, useTransition } from 'react'

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuthContext()
  const [isPending, startTransition] = useTransition();
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
        startTransition(() => {
            router.push('/login')
        })
    }
    
    if (!loading && user && adminOnly) {
      // Check if user is admin
      const isAdmin = user.role === 'admin'
      
      if(user.role === 'authenticated'){
            startTransition(() => {
                router.push('/homepage')
            })
        } else if(!isAdmin) {
            startTransition(() => {
                router.push('/unauthorized')
            })
        }
    }
  }, [user, loading, router, adminOnly])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#719e74' }}>
        <div className="text-center bg-white p-8 rounded-2xl shadow-xl">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 mx-auto mb-4" style={{ borderColor: '#719e74' }}></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to login
  }

  return children
}
