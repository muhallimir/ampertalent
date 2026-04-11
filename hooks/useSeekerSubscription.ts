'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'

interface SeekerSubscription {
  membershipPlan: string
  membershipExpiresAt: string | null
  isOnTrial: boolean
  resumeLimit: number
  resumesUsed: number
  trialEndsAt: string | null
  isSuspended: boolean
}

export function useSeekerSubscription() {
  const { user } = useUser()
  const [subscription, setSubscription] = useState<SeekerSubscription | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSubscription = async () => {
    if (!user) {
      setSubscription(null)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      
      const response = await fetch('/api/seeker/subscription/current')
      
      if (response.ok) {
        const data = await response.json()
        setSubscription(data.subscription)
      } else if (response.status === 404) {
        // User doesn't have a seeker profile yet
        setSubscription(null)
      } else {
        setError('Failed to load subscription data')
      }
    } catch (err) {
      console.error('Error fetching seeker subscription:', err)
      setError('Failed to load subscription data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSubscription()
  }, [user])

  // Listen for subscription update events
  useEffect(() => {
    const handleSubscriptionUpdate = () => {
      fetchSubscription()
    }

    window.addEventListener('seekerSubscriptionUpdated', handleSubscriptionUpdate)
    return () => {
      window.removeEventListener('seekerSubscriptionUpdated', handleSubscriptionUpdate)
    }
  }, [user])

  return { subscription, isLoading, error, refetch: fetchSubscription }
}