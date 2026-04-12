'use client'

import React from 'react'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

/**
 * DemoModeBanner Component
 *
 * Displays a banner warning when running in Stripe test mode.
 * Shows test card numbers and instructions for testing.
 *
 * Only renders when NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY starts with 'pk_test'
 *
 * Usage:
 * ```jsx
 * <DemoModeBanner />
 * ```
 */

export function DemoModeBanner() {
  const isTestMode =
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_test') ?? false

  if (!isTestMode) {
    return null
  }

  return (
    <Alert className="border-yellow-200 bg-yellow-50 mb-4">
      <AlertCircle className="h-4 w-4 text-yellow-600" />
      <AlertDescription className="text-yellow-800">
        <p className="font-semibold mb-2">🧪 Test Mode Active</p>
        <p className="text-sm mb-2">This is a test payment environment. Use these test card numbers:</p>
        <div className="space-y-1 text-sm font-mono">
          <p>• <strong>Success:</strong> 4242 4242 4242 4242</p>
          <p>• <strong>Decline:</strong> 4000 0000 0000 0002</p>
          <p>• Any future date for expiration, any 3-digit CVC</p>
        </div>
      </AlertDescription>
    </Alert>
  )
}

export default DemoModeBanner
