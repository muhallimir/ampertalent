'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useUser } from '@clerk/nextjs'
import {
  ImpersonatedUser,
  ImpersonationSession,
  getImpersonationSession,
  getSecureImpersonationSession,
  startImpersonation as startImpersonationService,
  stopImpersonation as stopImpersonationService,
  initializeImpersonationCleanup,
  getImpersonationStatus
} from '@/lib/admin-impersonation'

interface ImpersonationContextType {
  isImpersonating: boolean
  impersonatedUser: ImpersonatedUser | null
  impersonationDuration: string | null
  startImpersonation: (adminId: string, targetUser: ImpersonatedUser) => Promise<{ success: boolean; error?: string }>
  stopImpersonation: () => Promise<{ success: boolean; error?: string }>
  refreshSession: () => void
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined)

interface ImpersonationProviderProps {
  children: ReactNode
}

export function ImpersonationProvider({ children }: ImpersonationProviderProps) {
  const [session, setSession] = useState<ImpersonationSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useUser()

  // Initialize and load session
  useEffect(() => {
    initializeImpersonationCleanup()
    refreshSession()
    setIsLoading(false)
  }, [])

  // Refresh session from storage
  const refreshSession = () => {
    // Use secure session retrieval if we have the current admin's ID
    const currentSession = user?.id
      ? getSecureImpersonationSession(user.id)
      : getImpersonationSession()
    setSession(currentSession)
  }

  // Start impersonation
  const handleStartImpersonation = async (
    adminId: string,
    targetUser: ImpersonatedUser
  ): Promise<{ success: boolean; error?: string }> => {
    const result = await startImpersonationService(adminId, targetUser)

    if (result.success) {
      refreshSession()
    }

    return result
  }

  // Stop impersonation
  const handleStopImpersonation = async (): Promise<{ success: boolean; error?: string }> => {
    // Pass the current admin's ID to ensure proper session cleanup
    const result = await stopImpersonationService(user?.id)

    if (result.success) {
      setSession(null)
    }

    return result
  }

  // Get current status
  const status = getImpersonationStatus()

  const contextValue: ImpersonationContextType = {
    isImpersonating: status.isActive,
    impersonatedUser: status.user || null,
    impersonationDuration: status.duration || null,
    startImpersonation: handleStartImpersonation,
    stopImpersonation: handleStopImpersonation,
    refreshSession,
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <ImpersonationContext.Provider value={contextValue}>
      {children}
    </ImpersonationContext.Provider>
  )
}

export function useImpersonation() {
  const context = useContext(ImpersonationContext)
  if (context === undefined) {
    throw new Error('useImpersonation must be used within an ImpersonationProvider')
  }
  return context
}

// Hook for components that need to know if they're being viewed in impersonation mode
export function useImpersonationAware() {
  try {
    const context = useImpersonation()
    if (!context) {
      return {
        isImpersonating: false,
        impersonatedUser: null,
        isViewingAsEmployer: false,
        isViewingAsSeeker: false,
      }
    }

    const { isImpersonating, impersonatedUser } = context

    return {
      isImpersonating: isImpersonating || false,
      impersonatedUser: impersonatedUser || null,
      isViewingAsEmployer: isImpersonating && impersonatedUser?.role === 'employer',
      isViewingAsSeeker: isImpersonating && impersonatedUser?.role === 'seeker',
    }
  } catch (error) {
    console.error('Error in useImpersonationAware:', error)
    return {
      isImpersonating: false,
      impersonatedUser: null,
      isViewingAsEmployer: false,
      isViewingAsSeeker: false,
    }
  }
}