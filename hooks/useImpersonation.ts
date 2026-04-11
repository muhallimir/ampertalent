'use client'

import { useContext } from 'react'
import { useImpersonation as useImpersonationContext } from '@/components/admin/ImpersonationContext'

// Re-export the hook from the context for easier imports
export const useImpersonation = useImpersonationContext

// Additional utility hooks for specific use cases
export function useImpersonationStatus() {
  const { isImpersonating, impersonatedUser, impersonationDuration } = useImpersonation()
  
  return {
    isActive: isImpersonating,
    user: impersonatedUser,
    duration: impersonationDuration,
    isEmployer: impersonatedUser?.role === 'employer',
    isSeeker: impersonatedUser?.role === 'seeker',
  }
}

export function useImpersonationActions() {
  const { startImpersonation, stopImpersonation, refreshSession } = useImpersonation()
  
  return {
    start: startImpersonation,
    stop: stopImpersonation,
    refresh: refreshSession,
  }
}