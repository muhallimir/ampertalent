'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface StripeCheckoutButtonProps {
  amount: number
  onSuccess: (sessionId: string) => void
  onError: (error: string) => void
  disabled?: boolean
  className?: string
  planId?: string
  pendingSignupId?: string
  sessionToken?: string
}

export function StripeCheckoutButton({
  amount,
  onSuccess,
  onError,
  disabled = false,
  className = '',
  planId = '',
  pendingSignupId = '',
  sessionToken = ''
}: StripeCheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = async () => {
    setIsLoading(true)

    try {
      // Call backend to create Stripe checkout session
      const response = await fetch('/api/payments/stripe-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          planId,
          amount: Math.round(amount * 100), // Convert to cents
          pendingSignupId,
          sessionToken
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const { sessionId, url } = await response.json()

      if (!url) {
        throw new Error('No checkout URL provided')
      }

      // Redirect directly to Stripe's hosted checkout page
      window.location.href = url

      onSuccess(sessionId)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Payment failed'
      onError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || isLoading}
      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
      size="lg"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing with Stripe...
        </>
      ) : (
        <>
          <svg className="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 11c.93 0 1.83-.46 2.41-1.23a3 3 0 0 0 0-3.54C9.83 5.46 8.93 5 8 5H5v6h3zM5 3h3c1.66 0 3.31.82 4.24 2.19a5 5 0 0 1 0 5.62C11.31 12.18 9.66 13 8 13H5v4h3c2.76 0 5-2.24 5-5V5c0-2.76-2.24-5-5-5H5v3z" />
          </svg>
          Pay ${amount.toFixed(2)} with Stripe
        </>
      )}
    </Button>
  )
}
