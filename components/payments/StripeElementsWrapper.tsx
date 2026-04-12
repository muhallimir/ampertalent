'use client'

import React from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
)

/**
 * StripeElementsWrapper Component
 *
 * Wraps children with Stripe Elements provider.
 * This component handles Stripe initialization and provides the Elements context
 * to child components like PaymentMethodForm.
 *
 * Usage:
 * ```jsx
 * <StripeElementsWrapper>
 *   <PaymentMethodForm onSuccess={handleSuccess} />
 * </StripeElementsWrapper>
 * ```
 */
interface StripeElementsWrapperProps {
  children: React.ReactNode
}

export function StripeElementsWrapper({ children }: StripeElementsWrapperProps) {
  const options = {
    mode: 'setup' as const,
    currency: 'usd',
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      {children}
    </Elements>
  )
}

export default StripeElementsWrapper
