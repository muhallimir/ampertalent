'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { PayPalButton } from '@/components/payments/PayPalButton'
import { StripeCheckoutButton } from '@/components/payments/StripeCheckoutButton'
import { AlertCircle } from 'lucide-react'

interface StripeCheckoutProps {
    planId: string
    userType: 'seeker' | 'employer'
    amount: number
    planName: string
    onSuccess: (result: { transactionId: string; sessionId?: string }) => void
    onError: (error: string) => void
    returnUrl: string
    pendingSignupId?: string
    sessionToken?: string
    userInfo?: any
    isTrial?: boolean
}

export default function StripeCheckout({
    planId,
    userType,
    amount,
    planName,
    onSuccess,
    onError,
    returnUrl,
    pendingSignupId,
    sessionToken,
    userInfo,
    isTrial
}: StripeCheckoutProps) {
    const handlePayPalSuccess = (details: any) => {
        onSuccess({
            transactionId: details.id,
            sessionId: undefined
        })
    }

    const handleStripeSuccess = (sessionId: string) => {
        onSuccess({
            transactionId: sessionId,
            sessionId: sessionId
        })
    }

    return (
        <div className="max-w-2xl mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Order Summary */}
                <div className="md:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle>Order Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-sm text-gray-600">Plan</p>
                                <p className="font-semibold">{planName}</p>
                            </div>

                            {isTrial && (
                                <Alert className="bg-blue-50 border-blue-200">
                                    <AlertCircle className="h-4 w-4 text-blue-600" />
                                    <AlertDescription className="text-blue-700 text-sm">
                                        3-day free trial. Regular charges begin on day 4.
                                    </AlertDescription>
                                </Alert>
                            )}

                            <div className="border-t pt-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Subtotal</span>
                                    <span className={isTrial ? 'line-through text-gray-400' : 'font-semibold'}>
                                        ${amount.toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center mt-2">
                                    <span className="font-semibold">Total Due</span>
                                    <span className="text-2xl font-bold text-green-600">
                                        ${isTrial ? '0.00' : amount.toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            {isTrial && (
                                <div className="bg-green-50 border border-green-200 rounded p-3">
                                    <p className="text-sm text-green-700">
                                        <strong>You will not be charged today.</strong> Your trial starts immediately.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Payment Methods */}
                <div className="md:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Payment Method</CardTitle>
                            <CardDescription>Choose how you want to pay</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="stripe">
                                <TabsList className="grid w-full grid-cols-2 mb-6">
                                    <TabsTrigger value="stripe">Stripe</TabsTrigger>
                                    <TabsTrigger value="paypal">PayPal</TabsTrigger>
                                </TabsList>

                                <TabsContent value="stripe" className="space-y-4">
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <p className="text-sm text-gray-600 mb-4">
                                            Pay securely with your credit or debit card
                                        </p>
                                        <StripeCheckoutButton
                                            planId={planId}
                                            amount={amount}
                                            pendingSignupId={pendingSignupId}
                                            sessionToken={sessionToken}
                                            onSuccess={handleStripeSuccess}
                                            onError={onError}
                                        />
                                    </div>
                                </TabsContent>

                                <TabsContent value="paypal" className="space-y-4">
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <p className="text-sm text-gray-600 mb-4">
                                            Pay securely with your PayPal account
                                        </p>
                                        <PayPalButton
                                            amount={amount}
                                            onSuccess={handlePayPalSuccess}
                                            onError={onError}
                                            planId={planId}
                                            pendingSignupId={pendingSignupId}
                                            sessionToken={sessionToken}
                                            isTrial={isTrial}
                                        />
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
