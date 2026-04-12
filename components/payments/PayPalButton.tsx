'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'

// Extend window to include paypal
declare global {
  interface Window {
    paypal?: any
  }
}

interface PayPalButtonProps {
  amount: number
  onSuccess: (details: any) => void
  onError: (error: string) => void
  disabled?: boolean
  className?: string
  variant?: string
  size?: string
  [key: string]: any
}

export function PayPalButton({
  amount,
  onSuccess,
  onError,
  disabled = false,
  className = '',
  ...props
}: PayPalButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Load PayPal script
    if (!window.paypal) {
      const script = document.createElement('script')
      script.src = `https://www.paypal.com/sdk/js?client-id=${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}&components=buttons&enable-funding=venmo`
      script.async = true

      script.onload = () => {
        renderPayPalButton()
      }

      script.onerror = () => {
        onError('Failed to load PayPal SDK')
      }

      document.head.appendChild(script)
    } else {
      renderPayPalButton()
    }

    return () => {
      // Cleanup: remove existing PayPal buttons on unmount
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
    }
  }, [amount, onSuccess, onError])

  const renderPayPalButton = () => {
    if (!containerRef.current || !window.paypal) return

    // Clear any existing buttons
    containerRef.current.innerHTML = ''

    window.paypal
      .Buttons({
        createOrder: (data: any, actions: any) => {
          return actions.order.create({
            intent: 'CAPTURE',
            purchase_units: [
              {
                amount: {
                  value: amount.toFixed(2)
                }
              }
            ]
          })
        },
        onApprove: async (data: any, actions: any) => {
          try {
            const order = await actions.order.capture()
            onSuccess({
              id: order.id,
              status: order.status,
              amount: amount,
              payer: order.payer
            })
          } catch (error) {
            onError(`Payment capture failed: ${error}`)
          }
        },
        onError: (err: any) => {
          onError(`PayPal error: ${err.message || 'Unknown error'}`)
        }
      })
      .render(containerRef.current)
  }

  if (disabled) {
    return (
      <div className={`w-full rounded-lg bg-gray-100 p-4 flex items-center justify-center ${className}`}>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        <span>Processing...</span>
      </div>
    )
  }

  return <div ref={containerRef} className={className} />
}

// Hook for PayPal return page handling
export function usePayPalReturn() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const executePayPalAgreement = async (token: string): Promise<boolean> => {
    setIsProcessing(true)
    setError(null)

    try {
      // Call backend to execute the agreement
      const response = await fetch('/api/payments/paypal-execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Payment execution failed')
      }

      const result = await response.json()
      return result.success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      return false
    } finally {
      setIsProcessing(false)
    }
  }

  return {
    executePayPalAgreement,
    isProcessing,
    error
  }
}
