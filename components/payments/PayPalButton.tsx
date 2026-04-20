'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { postWithImpersonation } from '@/lib/api-client'

interface PayPalButtonProps {
    planId: string
    onSuccess?: (billingAgreementId: string, subscriptionId?: string) => void
    onError: (message: string) => void
    onCancel?: () => void
    disabled?: boolean
    className?: string
    variant?: 'default' | 'outline' | 'secondary'
    size?: 'sm' | 'default' | 'lg'
    userType?: 'seeker' | 'employer'
    addOnIds?: string[]
    customAmount?: number
    pendingSignupId?: string
    sessionToken?: string
    /** Override the return URL (defaults per userType) */
    returnUrl?: string
    cancelUrl?: string
    // Legacy/compat props — ignored but accepted to prevent TypeScript errors at call sites
    amount?: number
}

/**
 * PayPal Button — redirect-based billing agreement flow.
 * On click, creates a billing agreement token via our API and redirects the user to PayPal.
 * PayPal sends the user back to /seeker/subscription/paypal-return (or employer equiv),
 * which calls execute-billing-agreement to complete the purchase.
 * This replaces the old PayPal SDK Buttons approach that rendered yellow/dark SDK buttons.
 */
export function PayPalButton({
    planId,
    onSuccess,
    onError,
    onCancel,
    disabled = false,
    className = '',
    variant = 'outline',
    size = 'default',
    userType = 'seeker',
    addOnIds = [],
    customAmount,
    pendingSignupId,
    sessionToken,
    returnUrl: returnUrlProp,
    cancelUrl: cancelUrlProp,
}: PayPalButtonProps) {
    const [isLoading, setIsLoading] = useState(false)

    const handlePayPalClick = async () => {
        setIsLoading(true)

        try {
            const origin = window.location.origin
            const basePath = userType === 'employer' ? '/employer/billing' : '/seeker/subscription'
            const returnUrl = returnUrlProp || `${origin}${basePath}/paypal-return`
            const cancelUrl = cancelUrlProp || `${origin}${basePath}/paypal-cancel`

            const response = await postWithImpersonation('/api/payments/create-billing-agreement', {
                planId,
                returnUrl,
                cancelUrl,
                addOnIds: addOnIds.length > 0 ? addOnIds : undefined,
                customAmount,
                pendingSignupId,
            })

            const result = await response.json()

            if (result.success && result.approvalUrl) {
                // Store plan context — localStorage persists through the external PayPal redirect
                sessionStorage.setItem('paypal_pending_plan', planId)
                sessionStorage.setItem('paypal_token', result.token)
                if (addOnIds.length > 0) sessionStorage.setItem('paypal_addOnIds', JSON.stringify(addOnIds))
                if (customAmount !== undefined) sessionStorage.setItem('paypal_customAmount', customAmount.toString())
                if (pendingSignupId) {
                    sessionStorage.setItem('paypal_pendingSignupId', pendingSignupId)
                    localStorage.setItem('paypal_pendingSignupId', pendingSignupId)
                }
                if (sessionToken) sessionStorage.setItem('paypal_sessionToken', sessionToken)

                // Redirect to PayPal for user approval
                window.location.href = result.approvalUrl
            } else {
                throw new Error(result.error || 'Failed to create PayPal billing agreement')
            }
        } catch (error) {
            console.error('PayPal error:', error)
            const errorMessage = error instanceof Error ? error.message : 'PayPal payment failed'
            onError(errorMessage)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Button
            onClick={handlePayPalClick}
            disabled={disabled || isLoading}
            variant={variant}
            size={size}
            className={`flex items-center gap-2 ${className}`}
        >
            {isLoading ? (
                <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Connecting to PayPal...</span>
                </>
            ) : (
                <>
                    <PayPalIcon className="h-4 w-4" />
                    <span>Pay with PayPal</span>
                </>
            )}
        </Button>
    )
}

function PayPalIcon({ className = '' }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.774.774 0 0 1 .763-.648h6.39c2.146 0 3.783.567 4.861 1.684 1.005 1.04 1.48 2.513 1.412 4.384-.017.458-.088.911-.214 1.345a7.29 7.29 0 0 1-.713 1.79c-.333.554-.733 1.048-1.209 1.475a5.557 5.557 0 0 1-1.679 1.075c-.625.258-1.309.43-2.037.515-.39.046-.813.068-1.254.068H9.108a.774.774 0 0 0-.763.648l-.975 5.527a.773.773 0 0 1-.762.648h-.532" />
        </svg>
    )
}

/**
 * Hook for PayPal return page handling.
 * Calls POST /api/payments/paypal/execute-billing-agreement to finalize the purchase.
 */
export function usePayPalReturn() {
    const [isProcessing, setIsProcessing] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const executePayPalAgreement = async (
        token: string,
        planId?: string,
        setupOnly?: boolean
    ): Promise<{
        success: boolean
        billingAgreementId?: string
        subscriptionId?: string
        employerPackageId?: string
        error?: string
    }> => {
        setIsProcessing(true)
        setError(null)

        try {
            // Retrieve stored context from before the PayPal redirect
            let addOnIds: string[] = []
            let customAmount: number | undefined
            let pendingSignupId: string | undefined
            let sessionToken: string | undefined

            const storedAddOns = sessionStorage.getItem('paypal_addOnIds')
            if (storedAddOns) {
                try { addOnIds = JSON.parse(storedAddOns) } catch (_) { /* ignore */ }
            }
            const storedAmount = sessionStorage.getItem('paypal_customAmount')
            if (storedAmount) customAmount = parseFloat(storedAmount)

            pendingSignupId =
                sessionStorage.getItem('paypal_pendingSignupId') ||
                localStorage.getItem('paypal_pendingSignupId') ||
                undefined

            sessionToken = sessionStorage.getItem('paypal_sessionToken') || undefined

            const response = await postWithImpersonation('/api/payments/paypal/execute-billing-agreement', {
                token,
                ...(setupOnly || !planId ? { setupOnly: true } : { planId }),
                savePaymentMethod: true,
                addOnIds: addOnIds.length > 0 ? addOnIds : undefined,
                customAmount,
                pendingSignupId,
                sessionToken,
            })

            const result = await response.json()

            if (result.success) {
                // Clean up stored context
                ;['paypal_pending_plan', 'paypal_token', 'paypal_addOnIds', 'paypal_customAmount',
                    'paypal_pendingSignupId', 'paypal_sessionToken'].forEach(k => sessionStorage.removeItem(k))
                localStorage.removeItem('paypal_pendingSignupId')

                return {
                    success: true,
                    billingAgreementId: result.billingAgreementId,
                    subscriptionId: result.subscriptionId,
                    employerPackageId: result.employerPackageId,
                }
            } else {
                throw new Error(result.error || 'Failed to execute billing agreement')
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'PayPal setup failed'
            setError(errorMessage)
            return { success: false, error: errorMessage }
        } finally {
            setIsProcessing(false)
        }
    }

    return { executePayPalAgreement, isProcessing, error }
}
