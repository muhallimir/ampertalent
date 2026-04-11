'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { getImpersonationSession } from '@/lib/admin-impersonation'
import { useUserProfile } from '@/components/providers/UserProfileProvider'

interface SavedJobsContextValue {
  savedJobs: Set<string>
  isLoading: boolean
  saveJob: (jobId: string) => Promise<boolean>
  unsaveJob: (jobId: string) => Promise<boolean>
  toggleSaveJob: (jobId: string) => Promise<boolean>
  isSaved: (jobId: string) => boolean
  refetch: () => Promise<void>
}

const SavedJobsContext = createContext<SavedJobsContextValue | undefined>(undefined)

export function SavedJobsProvider({ children }: { children: ReactNode }) {
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)
  const { profile } = useUserProfile()

  const isSeeker = profile?.role === 'seeker'

  const fetchSavedJobs = useCallback(async () => {
    setIsLoading(true)
    try {
      // Check for impersonation context
      const headers: HeadersInit = {}

      if (typeof window !== 'undefined') {
        const impersonationSession = getImpersonationSession()
        if (impersonationSession) {
          headers['x-impersonated-user-id'] = impersonationSession.impersonatedUser.id
          headers['x-admin-user-id'] = impersonationSession.adminId
        }
      }

      const response = await fetch('/api/seeker/saved-jobs', { headers })
      if (response.ok) {
        const data = await response.json()
        const savedJobIds = new Set<string>(data.savedJobs.map((job: any) => job.id as string))
        setSavedJobs(savedJobIds)
      }
    } catch (error) {
      console.error('Error fetching saved jobs:', error)
    } finally {
      setIsLoading(false)
      setHasFetched(true)
    }
  }, [])

  // Fetch saved jobs only once on mount, and only for seekers
  useEffect(() => {
    if (!hasFetched && isSeeker) {
      fetchSavedJobs()
    }
  }, [fetchSavedJobs, hasFetched, isSeeker])

  const saveJob = useCallback(async (jobId: string): Promise<boolean> => {
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' }

      if (typeof window !== 'undefined') {
        const impersonationSession = getImpersonationSession()
        if (impersonationSession) {
          headers['x-impersonated-user-id'] = impersonationSession.impersonatedUser.id
          headers['x-admin-user-id'] = impersonationSession.adminId
        }
      }

      const response = await fetch('/api/seeker/saved-jobs', {
        method: 'POST',
        headers,
        body: JSON.stringify({ jobId })
      })

      if (response.ok) {
        setSavedJobs(prev => new Set([...prev, jobId]))
        return true
      }
      return false
    } catch (error) {
      console.error('Error saving job:', error)
      return false
    }
  }, [])

  const unsaveJob = useCallback(async (jobId: string): Promise<boolean> => {
    try {
      const headers: HeadersInit = {}

      if (typeof window !== 'undefined') {
        const impersonationSession = getImpersonationSession()
        if (impersonationSession) {
          headers['x-impersonated-user-id'] = impersonationSession.impersonatedUser.id
          headers['x-admin-user-id'] = impersonationSession.adminId
        }
      }

      const response = await fetch(`/api/seeker/saved-jobs?jobId=${jobId}`, {
        method: 'DELETE',
        headers
      })

      if (response.ok) {
        setSavedJobs(prev => {
          const newSet = new Set(prev)
          newSet.delete(jobId)
          return newSet
        })
        return true
      }
      return false
    } catch (error) {
      console.error('Error unsaving job:', error)
      return false
    }
  }, [])

  const toggleSaveJob = useCallback(async (jobId: string): Promise<boolean> => {
    if (savedJobs.has(jobId)) {
      return await unsaveJob(jobId)
    } else {
      return await saveJob(jobId)
    }
  }, [savedJobs, saveJob, unsaveJob])

  const isSaved = useCallback((jobId: string): boolean => {
    return savedJobs.has(jobId)
  }, [savedJobs])

  const value = {
    savedJobs,
    isLoading,
    saveJob,
    unsaveJob,
    toggleSaveJob,
    isSaved,
    refetch: fetchSavedJobs
  }

  return (
    <SavedJobsContext.Provider value={value}>
      {children}
    </SavedJobsContext.Provider>
  )
}

export function useSavedJobs() {
  const context = useContext(SavedJobsContext)
  if (context === undefined) {
    throw new Error('useSavedJobs must be used within a SavedJobsProvider')
  }
  return context
}
