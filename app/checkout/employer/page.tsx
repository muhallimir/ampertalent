'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, Loader2, Package } from 'lucide-react'
import { PayPalButton } from '@/components/payments/PayPalButton'

const PACKAGE_NAMES: Record<string, string> = {
    standard: 'Standard Job Post',
    featured: 'Featured Job Post',
    email_blast: 'Email Blast Job Post',
    gold_plus: 'Gold Plus Job Post',
    concierge_lite: 'Concierge Lite Package',
    concierge_level_1: 'Concierge Level 1 Package',
    concierge_level_2: 'Concierge Level 2 Package',
    concierge_level_3: 'Concierge Level 3 Package',
}

export default function EmployerCheckoutPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p>Loading checkout...</p>
                </div>
            </div>
        }>
            <EmployerCheckoutContent />
        </Suspense>
    )
}

function EmployerCheckoutContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const { isLoaded, isSignedIn } = useUser()

    const [isLoading, setIsLoading] = useState(true)
    const [isProcessing, setIsProcessing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paypal'>('stripe')

    const planId = searchParams.get('planId') || 'standard'
    const pendingJobPostId = searchParams.get('pendingJobPostId')
    const sessionToken = searchParams.get('sessionToken')
    const returnUrl = searchParams.get('returnUrl') || '/employer/jobs'
    const totalPriceParam = searchParams.get('totalPrice')
    const addOnIdsParam = searchParams.get('addOnIds')
    const paymentMethodParam = searchParams.get('paymentMethod')

    const totalPrice = totalPriceParam ? parseFloat(totalPriceParam) : 0
    const addOnIds = (() => {
        try { return addOnIdsParam ? JSON.parse(addOnIdsParam) : [] } catch { return [] }
    })()
    const planName = PACKAGE_NAMES[planId] || `Job Post - ${planId}`

    useEffect(() => {
        if (!isLoaded) return
        if (!isSignedIn) {
            router.push(`/sign-in?redirect_url=${encodeURIComponent(window.location.href)}`)
            return
        }
        if (!pendingJobPostId || !totalPriceParam) {
            setError('Missing required checkout parameters. Please start over.')
            setIsLoading(false)
            return
        }
        if (paymentMethodParam === 'paypal') {
            setPaymentMethod('paypal')
        }
        setIsLoading(false)
    }, [isLoaded, isSignedIn, pendingJobPostId, totalPriceParam, paymentMethodParam, router])

    const handleStripeCheckout = async () => {
        setIsProcessing(true)
        setError(null)
        try {
            const response = await fetch('/api/payments/stripe-employer-checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    planId,
                    amount: totalPrice,
                    pendingJobPostId,
                    sessionToken,
                    addOnIds,
                })
            })
            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to create checkout session')
            }
            const { url } = await response.json()
            if (!url) throw new Error('No checkout URL provided')
            window.location.href = url
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Checkout failed. Please try again.')
            setIsProcessing(false)
        }
    }

    const handlePayPalSuccess = (billingAgreementId: string) => {
        setSuccess(true)
        setTimeout(() => {
            router.push(`${returnUrl}?checkout=success`)
        }, 2000)
    }

    const handlePayPalError = (message: string) => {
        setError(message)
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p>Loading checkout...</p>
                </div>
            </div>
        )
    }

    if (error && !isProcessing) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Card className="max-w-md w-full">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-600">
                            <XCircle className="h-5 w-5" />
                            Checkout Error
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                        <div className="mt-4">
                            <button
                                onClick={() => router.back()}
                                className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                            >
                                Go Back
                            </button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Card className="max-w-md w-full">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="h-5 w-5" />
                            Payment Successful!
                        </CardTitle>
                        <CardDescription>Your job posting is being created...</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-lg mx-auto px-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5 text-blue-600" />
                            Complete Your Purchase
                        </CardTitle>
                        <CardDescription>
                            {planName} — ${totalPrice.toFixed(2)}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Order Summary */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="font-medium text-blue-900">{planName}</p>
                                    {addOnIds.length > 0 && (
                                        <p className="text-sm text-blue-700">{addOnIds.length} add-on(s) included</p>
                                    )}
                                </div>
                                <p className="text-xl font-bold text-blue-700">${totalPrice.toFixed(2)}</p>
                            </div>
                        </div>

                        {/* Payment Method Tabs */}
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setPaymentMethod('stripe')}
                                className={`flex-1 py-3 px-4 rounded-lg border-2 font-medium transition-colors text-sm ${paymentMethod === 'stripe'
                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                    }`}
                            >
                                💳 Credit Card (Stripe)
                            </button>
                            <button
                                type="button"
                                onClick={() => setPaymentMethod('paypal')}
                                className={`flex-1 py-3 px-4 rounded-lg border-2 font-medium transition-colors text-sm ${paymentMethod === 'paypal'
                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                    }`}
                            >
                                PayPal
                            </button>
                        </div>

                        {/* Stripe Payment */}
                        {paymentMethod === 'stripe' && (
                            <div className="space-y-4">
                                <button
                                    onClick={handleStripeCheckout}
                                    disabled={isProcessing}
                                    className="w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Redirecting to Stripe...
                                        </>
                                    ) : (
                                        <>
                                            💳 Pay ${totalPrice.toFixed(2)} with Stripe
                                        </>
                                    )}
                                </button>
                                <p className="text-xs text-center text-gray-500">
                                    You will be redirected to Stripe's secure checkout page.
                                </p>
                            </div>
                        )}

                        {/* PayPal Payment */}
                        {paymentMethod === 'paypal' && (
                            <div className="space-y-4">
                                <PayPalButton
                                    amount={totalPrice}
                                    planId={`package_${planId}`}
                                    onSuccess={handlePayPalSuccess}
                                    onError={handlePayPalError}
                                    disabled={isProcessing}
                                    className="w-full"
                                    variant="default"
                                    size="lg"
                                    userType="employer"
                                    addOnIds={addOnIds}
                                    customAmount={totalPrice}
                                />
                                <p className="text-xs text-center text-gray-500">
                                    You will be redirected to PayPal to complete your payment.
                                </p>
                            </div>
                        )}

                        {/* Security Notice */}
                        <div className="flex items-start gap-2 text-xs text-gray-500">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <p>Your payment is processed securely. We do not store your card details.</p>
                        </div>

                        <button
                            onClick={() => router.back()}
                            disabled={isProcessing}
                            className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
                        >
                            ← Cancel and go back
                        </button>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
