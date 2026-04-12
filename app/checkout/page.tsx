'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import StripeCheckout from '@/components/payments/StripeCheckout'
import PayPalCheckoutComponent from '@/components/payments/PayPalCheckout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

export default function CheckoutPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div>Loading checkout...</div></div>}>
            <CheckoutContent />
        </Suspense>
    )
}

function CheckoutContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const { isLoaded, isSignedIn, user } = useUser()

    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [planDetails, setPlanDetails] = useState<any>(null)
    const [userInfo, setUserInfo] = useState<any>(null)
    const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paypal'>('stripe')

    // Get URL parameters
    const planId = searchParams.get('planId')
    const userType = searchParams.get('userType')
    const pendingSignupId = searchParams.get('pendingSignupId')
    const sessionToken = searchParams.get('sessionToken')
    const returnUrl = searchParams.get('returnUrl')
    const totalPrice = searchParams.get('totalPrice')
    const userInfoParam = searchParams.get('userInfo')
    const isTrialParam = searchParams.get('isTrial')
    const paymentMethodParam = searchParams.get('paymentMethod')

    // Parse userInfo from URL
    const [urlUserInfo] = useState(() => {
        try {
            return userInfoParam ? JSON.parse(userInfoParam) : null
        } catch {
            return null
        }
    })

    useEffect(() => {
        const initializeCheckout = async () => {
            if (!isLoaded) return

            if (!isSignedIn) {
                const currentUrl = window.location.href
                router.push(`/sign-in?redirect_url=${encodeURIComponent(currentUrl)}`)
                return
            }

            // Validate required parameters
            if (!planId || !totalPrice || !returnUrl) {
                setError('Missing required checkout parameters')
                setIsLoading(false)
                return
            }

            // Set payment method from URL or default to stripe
            if (paymentMethodParam === 'paypal') {
                setPaymentMethod('paypal')
            }

            // Plan details
            const plans: Record<string, { name: string; price: number }> = {
                trial: { name: 'Flex Trial', price: 34.99 },
                gold: { name: 'Flex Gold', price: 49.99 },
                'vip-platinum': { name: 'Flex VIP', price: 79.99 },
                'annual-platinum': { name: 'Flex Annual', price: 299.0 }
            }

            const plan = plans[planId as keyof typeof plans]
            if (!plan) {
                setError('Invalid plan selected')
                setIsLoading(false)
                return
            }

            setPlanDetails({
                ...plan,
                price: parseFloat(totalPrice)
            })

            // Set user info
            setUserInfo(urlUserInfo)
            setIsLoading(false)
        }

        initializeCheckout()
    }, [isLoaded, isSignedIn, router, planId, totalPrice, returnUrl, urlUserInfo, paymentMethodParam])

    const handlePaymentSuccess = (result: { transactionId: string; sessionId?: string }) => {
        console.log('Payment successful:', result)
        setSuccess(true)

        setTimeout(() => {
            const successUrl = new URL(returnUrl || '/seeker/dashboard', window.location.origin)
            successUrl.searchParams.set('payment_status', 'success')
            successUrl.searchParams.set('transaction_id', result.transactionId)
            if (result.sessionId) {
                successUrl.searchParams.set('session_id', result.sessionId)
            }
            if (pendingSignupId) {
                successUrl.searchParams.set('pending_signup_id', pendingSignupId)
            }
            if (sessionToken) {
                successUrl.searchParams.set('session_token', sessionToken)
            }

            window.location.href = successUrl.toString()
        }, 2000)
    }

    const handlePaymentError = (error: string) => {
        console.error('Payment failed:', error)
        setError(error)
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

    if (error) {
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
                        <CardDescription>Your payment has been processed successfully.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center">
                            <p className="text-gray-600 mb-4">You will be redirected shortly...</p>
                            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (!planDetails) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Card className="max-w-md w-full">
                    <CardHeader>
                        <CardTitle className="text-red-600">Invalid Plan</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>The selected plan is not available.</p>
                        <button
                            onClick={() => router.back()}
                            className="mt-4 w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                        >
                            Go Back
                        </button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            {paymentMethod === 'stripe' ? (
                <StripeCheckout
                    planId={planId}
                    userType={userType as 'seeker' | 'employer'}
                    amount={planDetails.price}
                    planName={planDetails.name}
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                    returnUrl={returnUrl!}
                    pendingSignupId={pendingSignupId || undefined}
                    sessionToken={sessionToken || undefined}
                    userInfo={userInfo}
                    isTrial={isTrialParam === 'true'}
                />
            ) : (
                <PayPalCheckoutComponent
                    planId={planId}
                    userType={userType as 'seeker' | 'employer'}
                    amount={planDetails.price}
                    planName={planDetails.name}
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                    returnUrl={returnUrl!}
                    pendingSignupId={pendingSignupId || undefined}
                    sessionToken={sessionToken || undefined}
                    userInfo={userInfo}
                    isTrial={isTrialParam === 'true'}
                />
            )}
        </div>
    )
}
