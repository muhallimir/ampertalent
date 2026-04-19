'use client'

import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { CreditCard, X } from 'lucide-react'
import { postWithImpersonation, putWithImpersonation } from '@/lib/api-client'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')

interface PaymentMethodFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  onError: (message: string) => void
  userType?: 'employer' | 'seeker'
  paymentMethodId?: string
  onPaymentMethodAdded?: () => void
  mode?: 'add' | 'update'
}

// ─── Inner form (uses Stripe hooks, must be inside <Elements>) ───────────────

function StripeCardForm({
  onClose,
  onSuccess,
  onError,
  userType = 'employer',
  paymentMethodId,
  mode = 'add',
  onPaymentMethodAdded,
}: Omit<PaymentMethodFormProps, 'isOpen'>) {
  const stripe = useStripe()
  const elements = useElements()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDefault, setIsDefault] = useState(false)
  const [cardReady, setCardReady] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) {
      onError('Payment system not loaded. Please refresh the page.')
      return
    }

    const cardElement = elements.getElement(CardElement)
    if (!cardElement) {
      onError('Card element not found.')
      return
    }

    setIsSubmitting(true)

    try {
      const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      })

      if (stripeError || !paymentMethod) {
        throw new Error(stripeError?.message || 'Failed to tokenize card')
      }

      const apiEndpoint =
        userType === 'seeker'
          ? '/api/seeker/subscription/payment-methods'
          : '/api/employer/billing/payment-methods'

      const isUpdating = mode === 'update' && paymentMethodId
      const requestBody = isUpdating
        ? { paymentMethodId, action: 'update', stripePaymentMethodId: paymentMethod.id }
        : { paymentMethodId: paymentMethod.id, isDefault }

      const apiResponse = isUpdating
        ? await putWithImpersonation(apiEndpoint, requestBody)
        : await postWithImpersonation(apiEndpoint, requestBody)

      const result = await apiResponse.json()

      if (!apiResponse.ok) {
        throw new Error(result.error || `Failed to ${isUpdating ? 'update' : 'add'} payment method`)
      }

      cardElement.clear()
      if (onPaymentMethodAdded) onPaymentMethodAdded()
      onSuccess()
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save payment method'
      onError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#1a2d47',
        fontFamily: '"Inter", sans-serif',
        '::placeholder': { color: '#9ca3af' },
      },
      invalid: { color: '#ef4444' },
    },
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <Label className="mb-1.5 block">Card Details *</Label>
        <div className="rounded-md border border-gray-200 bg-white p-3 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
          <CardElement
            options={cardElementOptions}
            onReady={() => setCardReady(true)}
          />
        </div>
      </div>

      {mode === 'add' && (
        <div className="flex items-center space-x-2">
          <Checkbox
            id="isDefault"
            checked={isDefault}
            onCheckedChange={(checked) => setIsDefault(!!checked)}
          />
          <Label htmlFor="isDefault" className="cursor-pointer">
            Set as default payment method
          </Label>
        </div>
      )}

      <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
        <p className="text-sm text-blue-800">
          <strong>Secure Processing:</strong> Card data is tokenized by Stripe and never stored on our servers.
        </p>
      </div>

      <div className="flex space-x-3">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || !stripe || !cardReady}
          className="flex-1 bg-blue-600 hover:bg-blue-700"
        >
          {isSubmitting
            ? 'Processing...'
            : mode === 'update'
            ? 'Update Payment Method'
            : 'Add Payment Method'}
        </Button>
      </div>
    </form>
  )
}

// ─── Public export: wraps inner form with Stripe Elements provider ───────────

export function PaymentMethodForm({
  isOpen,
  onClose,
  onSuccess,
  onError,
  userType = 'employer',
  paymentMethodId,
  mode = 'add',
  onPaymentMethodAdded,
}: PaymentMethodFormProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 !mt-0">
      <Card className="w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5 text-blue-600" />
                <span>{mode === 'update' ? 'Update Payment Method' : 'Add Payment Method'}</span>
              </CardTitle>
              <CardDescription>
                {mode === 'update'
                  ? 'Replace your card with a new one'
                  : 'Add a card to use for purchases'}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <Elements stripe={stripePromise}>
            <StripeCardForm
              onClose={onClose}
              onSuccess={onSuccess}
              onError={onError}
              userType={userType}
              paymentMethodId={paymentMethodId}
              mode={mode}
              onPaymentMethodAdded={onPaymentMethodAdded}
            />
          </Elements>
        </CardContent>
      </Card>
    </div>
  )
}

export default PaymentMethodForm
