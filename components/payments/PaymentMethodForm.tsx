'use client'

import React, { useState } from 'react'
import { useElements, useStripe, CardElement } from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle } from 'lucide-react'

/**
 * PaymentMethodForm Component
 *
 * Securely captures and saves payment method using Stripe CardElement.
 * Does NOT store card details - only Stripe payment method ID is stored server-side.
 *
 * Features:
 * - Secure CardElement for PCI compliance
 * - Real-time validation feedback
 * - Error handling and display
 * - Loading state management
 * - Success callback
 *
 * Usage:
 * ```jsx
 * <StripeElementsWrapper>
 *   <PaymentMethodForm
 *     onSuccess={(paymentMethodId) => console.log(paymentMethodId)}
 *   />
 * </StripeElementsWrapper>
 * ```
 */

interface PaymentMethodFormProps {
  onSuccess?: (paymentMethodId: string) => void
  onError?: (error: string) => void
  customerId?: string
}

export function PaymentMethodForm({
  onSuccess,
  onError,
  customerId,
}: PaymentMethodFormProps) {
  const stripe = useStripe()
  const elements = useElements()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!stripe || !elements) {
      setError('Payment system not loaded. Please refresh the page.')
      onError?.('Payment system not loaded')
      return
    }

    setIsLoading(true)

    try {
      const cardElement = elements.getElement(CardElement)

      if (!cardElement) {
        throw new Error('Card element not found')
      }

      // Create payment method with card details
      const { error: methodError, paymentMethod } =
        await stripe.createPaymentMethod({
          type: 'card',
          card: cardElement,
        })

      if (methodError) {
        throw new Error(methodError.message || 'Failed to create payment method')
      }

      if (!paymentMethod) {
        throw new Error('Payment method creation returned no result')
      }

      // Save payment method to backend
      const response = await fetch('/api/payment-methods/attach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethodId: paymentMethod.id,
          customerId,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save payment method')
      }

      setSuccess(true)
      setError(null)

      // Clear card element
      cardElement.clear()

      // Call success callback
      onSuccess?.(paymentMethod.id)

      // Reset success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#fa755a',
      },
    },
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg border border-gray-200 p-4">
        <CardElement options={cardElementOptions} />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">
            Payment method saved successfully!
          </AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        disabled={isLoading || !stripe || !elements}
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving payment method...
          </>
        ) : (
          'Save Payment Method'
        )}
      </Button>
    </form>
  )
}

export default PaymentMethodForm
const [isSubmitting, setIsSubmitting] = useState(false);
const [isAcceptJsLoaded, setIsAcceptJsLoaded] = useState(false);
