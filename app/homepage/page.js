'use client'
import { useState, useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { FaHome, FaPlus, FaRegEdit, FaList, FaCog, FaKey, FaSignOutAlt, FaNewspaper, FaLightbulb, FaClock, FaArrowRight } from 'react-icons/fa'

import ProtectedRoute from '../../components/ProtectedRoute'
import { useAuthContext } from '../../components/AuthProvider'
import { supabaseClient } from '../../lib/authClient'
import Navigation from '../../components/Navigation'


function LoggedHomepageContent() {
  const router = useRouter()
  const { user } = useAuthContext()
  const [isPending, startTransition] = useTransition()


  return (
    <div className="flex h-screen bg-muted/70 overflow-hidden">
      <Navigation />

      <div className="bg-muted/70 flex-1 flex flex-col overflow-hidden pr-2">
        {/* Top Panel */}
        <div className="bg-muted/70 px-4 py-3">
          <div className="relative flex items-center justify-between w-full gap-2 overflow-hidden">
            
            {/* Left: Job Title - Company Name */}
            <div className="flex items-center gap-2 min-w-0 truncate">
              <span className="text-lg font-semibold text-foreground">
                Hey {user.name || 'there'}, welcome to your Prescrin Board 
              </span>
            </div>
          </div>
        </div>
        {/* Main Content */}
        <div className="flex-1 overflow-hidden p-0">
          <div className="content-page w-full sm:px-6 py-4 sm:py-6 glass-effect shadow-sm border-border flex flex-col justify-between"
            style={{ 
              height: 'calc(100vh - 70px)', 
              marginBottom: 'clamp(0.25rem, 2vw, 0.5rem)', }}
          >
          </div>
        </div>
      </div>
    </div>

  )
}

export default function LoggedHomepage() {
  return (
    <ProtectedRoute adminOnly={true}>
      <LoggedHomepageContent />
    </ProtectedRoute>
  )
}