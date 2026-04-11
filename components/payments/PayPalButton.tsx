// Mock PayPal Button component for Phase 3
// This will be replaced with Stripe integration in Phase 6
// See docs/01-TECH-STACK-AND-FREE-ALTERNATIVES.md for Stripe implementation details

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface PayPalButtonProps {
  amount: number
  onSuccess: (details: any) => void
  onError: (error: any) => void
  disabled?: boolean
}

export function PayPalButton({ amount, onSuccess, onError, disabled }: PayPalButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = async () => {
    setIsLoading(true)

    try {
      // Mock PayPal payment - always succeeds in development
      console.log(`Mock PayPal: Processing payment for $${amount}`)

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Mock successful payment
      const mockDetails = {
        id: `paypal_mock_${Date.now()}`,
        amount: amount,
        currency: 'USD',
        status: 'COMPLETED',
        payer: {
          email: 'test@example.com',
          name: 'Test User'
        }
      }

      onSuccess(mockDetails)
    } catch (error) {
      console.error('Mock PayPal payment failed:', error)
      onError(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || isLoading}
      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        `Pay $${amount} with PayPal (Mock)`
      )}
    </Button>
  )
}

// Mock hook for PayPal return handling
export function usePayPalReturn() {
  return {
    isLoading: false,
    error: null,
    success: false,
    handleReturn: async () => {
      console.log('Mock PayPal: Handling return')
      // Mock successful return
      return { success: true }
    }
  }
}

// Mock PayPal subscription functions
export async function createPayPalSubscription(planId: string, userId: string) {
  console.warn('⚠️ Using deprecated mock PayPal function - will be replaced with Stripe in Phase 6')
  return {
    id: `paypal_sub_mock_${Date.now()}`,
    status: 'ACTIVE',
    planId
  }
}

export async function cancelPayPalSubscription(subscriptionId: string) {
  console.warn('⚠️ Using deprecated mock PayPal function - will be replaced with Stripe in Phase 6')
  console.log(`Mock PayPal: Canceled subscription ${subscriptionId}`)
  return { success: true }
}
