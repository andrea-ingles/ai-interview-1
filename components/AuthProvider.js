'use client'
import { createContext, useContext } from 'react'
import { useAuth } from '../lib/authClient'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const auth = useAuth()
  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuthContext = () => useContext(AuthContext)
