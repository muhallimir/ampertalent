'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Gift, Star, Check, CreditCard, Loader2, X, CheckCircle } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { postWithImpersonation } from '@/lib/api-client'

interface PaymentMethod {
    id: string
    type: 'card'
    last4: string
    brand: string
    expiryMonth: number
    expiryYear: number
    isDefault: boolean
    cardType?: string
}

interface ExclusivePlanOffer {
    hasOffer: boolean
    showModal: boolean
    planType?: string
    planName?: string
    amountCents?: number
    amountDollars?: string
    cycles?: number
    isActivated: boolean
    isDismissed: boolean
}

interface ExclusivePlanModalProps {
    onActivated?: () => void
}

export function ExclusivePlanModal({ onActivated }: ExclusivePlanModalProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [isActivating, setIsActivating] = useState(false)
    const [isDismissing, setIsDismissing] = useState(false)
    const [isAddingPayPal, setIsAddingPayPal] = useState(false)
    const [offer, setOffer] = useState<ExclusivePlanOffer | null>(null)
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
    const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string | null>(null)
    const [showPaymentStep, setShowPaymentStep] = useState(false)
    const { addToast } = useToast()

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            // Fetch both exclusive plan and payment methods in parallel
            const [planResponse, billingResponse] = await Promise.all([
                fetch('/api/employer/exclusive-plan'),
                fetch('/api/employer/billing/payment-methods')
            ])

            if (planResponse.ok) {
                const data = await planResponse.json()
                setOffer(data)
                if (data.showModal) {
                    setIsOpen(true)
                }
            }

            if (billingResponse.ok) {
                const billingData = await billingResponse.json()
                setPaymentMethods(billingData.paymentMethods || [])
                // Pre-select default payment method
                const defaultMethod = (billingData.paymentMethods || []).find((pm: PaymentMethod) => pm.isDefault)
                if (defaultMethod) {
                    setSelectedPaymentMethodId(defaultMethod.id)
                } else if (billingData.paymentMethods?.length > 0) {
                    setSelectedPaymentMethodId(billingData.paymentMethods[0].id)
                }
            }
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setIsLoading(false)
        }
    }

    // When user clicks "Activate Now" - go to payment step
    const handleActivateClick = () => {
        setShowPaymentStep(true)
    }

    // Activate with a selected payment method
    const handleActivateWithPaymentMethod = async (paymentMethodId: string) => {
        setIsActivating(true)
        try {
            const response = await fetch('/api/employer/exclusive-plan/activate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paymentMethodId })
            })

            const data = await response.json()

            if (response.ok && data.success) {
                addToast({
                    title: '🎉 Exclusive plan activated!',
                    description: `Your ${data.package?.name || 'plan'} is now active.`,
                    variant: 'success'
                })
                setIsOpen(false)
                onActivated?.()
                // Refresh the page to show updated package
                window.location.reload()
            } else {
                addToast({
                    title: 'Activation failed',
                    description: data.error || 'Please try again later.',
                    variant: 'destructive'
                })
            }
        } catch (error) {
            console.error('Error activating plan:', error)
            addToast({
                title: 'Something went wrong',
                description: 'Please try again later.',
                variant: 'destructive'
            })
        } finally {
            setIsActivating(false)
        }
    }

    // Redirect to billing page to add a card
    const handleAddCard = () => {
        // Store state indicating we want to return to activate after adding card
        sessionStorage.setItem('exclusive_plan_pending_activation', 'true')
        window.location.href = '/employer/billing?tab=payment-methods&action=add-card&source=exclusive-plan'
    }

    // Initiate PayPal billing agreement setup
    const handleAddPayPal = async () => {
        setIsAddingPayPal(true)
        try {
            // Store state indicating we want to auto-activate after PayPal setup completes
            sessionStorage.setItem('exclusive_plan_pending_activation', 'true')

            const currentUrl = window.location.origin
            // After PayPal setup, return to dashboard where modal will show again with payment method
            const returnUrl = `${currentUrl}/employer/billing/paypal-setup-return?redirect=dashboard`
            const cancelUrl = `${currentUrl}/employer/dashboard`

            const response = await postWithImpersonation(
                '/api/employer/billing/paypal/create-setup',
                { returnUrl, cancelUrl }
            )

            const result = await response.json()

            if (response.ok && result.success && result.approvalUrl) {
                // Redirect to PayPal
                window.location.href = result.approvalUrl
            } else {
                throw new Error(result.error || 'Failed to initiate PayPal setup')
            }
        } catch (error) {
            console.error('PayPal setup error:', error)
            addToast({
                title: 'PayPal Setup Failed',
                description: error instanceof Error ? error.message : 'Failed to add PayPal',
                variant: 'destructive',
            })
            setIsAddingPayPal(false)
        }
    }

    const getPaymentMethodDisplay = (pm: PaymentMethod) => {
        if (pm.cardType === 'PayPal' || pm.brand?.toLowerCase() === 'paypal') {
            return {
                icon: (
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M7.076 21.337H2.47a.641.641 0 01-.633-.74L4.944 3.72a.766.766 0 01.757-.643h6.437c2.12 0 3.754.533 4.858 1.585 1.134 1.08 1.47 2.558 1.001 4.39-.628 2.45-2.087 4.165-4.213 4.96-1.013.38-2.126.57-3.306.57h-1.22a.766.766 0 00-.757.643l-.925 5.37a.641.641 0 01-.633.54l-.867.002z" fill="#003087" />
                        <path d="M19.514 7.612c-.628 2.45-2.087 4.165-4.213 4.96-1.013.38-2.126.57-3.306.57h-1.22a.766.766 0 00-.757.643l-1.355 7.87a.533.533 0 00.526.615h3.377a.638.638 0 00.63-.535l.674-3.923a.766.766 0 01.756-.643h1.22c1.18 0 2.293-.19 3.306-.57 2.126-.795 3.585-2.51 4.213-4.96.422-1.646.152-2.977-.759-3.962a4.85 4.85 0 00-1.092-.865 5.842 5.842 0 01-2 .8z" fill="#0070E0" />
                    </svg>
                ),
                label: 'PayPal Account',
                sublabel: pm.last4 ? `...${pm.last4}` : ''
            }
        }
        return {
            icon: <CreditCard className="h-5 w-5 text-blue-600" />,
            label: `${pm.brand || 'Card'} •••• ${pm.last4}`,
            sublabel: `Expires ${pm.expiryMonth}/${pm.expiryYear}`
        }
    }

    const handleDismiss = async () => {
        setIsDismissing(true)
        try {
            const response = await fetch('/api/employer/exclusive-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'dismiss' })
            })

            if (response.ok) {
                addToast({
                    title: 'Offer saved',
                    description: 'You can activate this exclusive offer anytime from the Billing page.',
                    variant: 'default'
                })
                setIsOpen(false)
            }
        } catch (error) {
            console.error('Error dismissing offer:', error)
        } finally {
            setIsDismissing(false)
        }
    }

    if (isLoading || !offer?.showModal) {
        return null
    }

    const features = [
        '1 Job Posting (Active for 6 Months)',
        '6 Monthly Payments ($97/mo)',
        'Access to All Candidates',
        'Auto-Ends After 6 Months',
        'No Long-Term Commitment',
    ]

    // If user clicked Activate Now and we're showing payment step
    if (showPaymentStep) {
        return (
            <Dialog open={isOpen} onOpenChange={() => { }}>
                <DialogContent
                    className="sm:max-w-lg"
                    hideCloseButton={true}
                    onPointerDownOutside={(e) => e.preventDefault()}
                    onEscapeKeyDown={(e) => e.preventDefault()}
                >
                    <DialogHeader className="text-center pb-2">
                        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mb-4">
                            <CreditCard className="w-8 h-8 text-white" />
                        </div>
                        <DialogTitle className="text-2xl font-bold text-center">
                            {paymentMethods.length > 0 ? 'Select Payment Method' : 'Add Payment Method'}
                        </DialogTitle>
                        <DialogDescription className="text-center text-base">
                            {paymentMethods.length > 0
                                ? `Choose how to pay for your ${offer.planName} (${offer.amountDollars}/month)`
                                : 'Add a payment method to activate your exclusive plan'
                            }
                        </DialogDescription>
                    </DialogHeader>

                    {paymentMethods.length > 0 ? (
                        // Show existing payment methods for selection
                        <div className="space-y-3 py-4">
                            {paymentMethods.map((pm) => {
                                const display = getPaymentMethodDisplay(pm)
                                return (
                                    <button
                                        key={pm.id}
                                        onClick={() => setSelectedPaymentMethodId(pm.id)}
                                        className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${selectedPaymentMethodId === pm.id
                                            ? 'border-amber-500 bg-amber-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        {display.icon}
                                        <div className="text-left flex-1">
                                            <p className="font-medium text-gray-900">{display.label}</p>
                                            {display.sublabel && (
                                                <p className="text-sm text-gray-500">{display.sublabel}</p>
                                            )}
                                        </div>
                                        {pm.isDefault && (
                                            <Badge variant="secondary" className="text-xs">Default</Badge>
                                        )}
                                        {selectedPaymentMethodId === pm.id && (
                                            <CheckCircle className="h-5 w-5 text-amber-500" />
                                        )}
                                    </button>
                                )
                            })}

                            <Button
                                onClick={() => selectedPaymentMethodId && handleActivateWithPaymentMethod(selectedPaymentMethodId)}
                                disabled={!selectedPaymentMethodId || isActivating}
                                className="w-full mt-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 py-6"
                            >
                                {isActivating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Processing Payment...
                                    </>
                                ) : (
                                    <>Activate Now - ${offer.amountDollars}/month</>
                                )}
                            </Button>

                            <Button
                                variant="ghost"
                                onClick={() => setShowPaymentStep(false)}
                                disabled={isActivating}
                                className="w-full text-gray-500"
                            >
                                ← Back
                            </Button>
                        </div>
                    ) : (
                        // No payment methods - show add options
                        <div className="space-y-3 py-4">
                            <p className="text-sm text-gray-600 text-center mb-4">
                                To activate your exclusive plan, please add a payment method first.
                            </p>
                            <Button
                                variant="outline"
                                className="w-full h-16 flex items-center justify-start gap-4 px-6"
                                onClick={handleAddCard}
                            >
                                <CreditCard className="h-6 w-6 text-blue-600" />
                                <div className="text-left">
                                    <p className="font-medium">Credit or Debit Card</p>
                                    <p className="text-sm text-gray-500">Visa, Mastercard, Amex, Discover</p>
                                </div>
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full h-16 flex items-center justify-start gap-4 px-6"
                                onClick={handleAddPayPal}
                                disabled={isAddingPayPal}
                            >
                                {isAddingPayPal ? (
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                ) : (
                                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M7.076 21.337H2.47a.641.641 0 01-.633-.74L4.944 3.72a.766.766 0 01.757-.643h6.437c2.12 0 3.754.533 4.858 1.585 1.134 1.08 1.47 2.558 1.001 4.39-.628 2.45-2.087 4.165-4.213 4.96-1.013.38-2.126.57-3.306.57h-1.22a.766.766 0 00-.757.643l-.925 5.37a.641.641 0 01-.633.54l-.867.002z" fill="#003087" />
                                        <path d="M19.514 7.612c-.628 2.45-2.087 4.165-4.213 4.96-1.013.38-2.126.57-3.306.57h-1.22a.766.766 0 00-.757.643l-1.355 7.87a.533.533 0 00.526.615h3.377a.638.638 0 00.63-.535l.674-3.923a.766.766 0 01.756-.643h1.22c1.18 0 2.293-.19 3.306-.57 2.126-.795 3.585-2.51 4.213-4.96.422-1.646.152-2.977-.759-3.962a4.85 4.85 0 00-1.092-.865 5.842 5.842 0 01-2 .8z" fill="#0070E0" />
                                    </svg>
                                )}
                                <div className="text-left">
                                    <p className="font-medium">PayPal</p>
                                    <p className="text-sm text-gray-500">Link your PayPal account</p>
                                </div>
                            </Button>

                            <Button
                                variant="ghost"
                                onClick={() => setShowPaymentStep(false)}
                                className="w-full text-gray-500 mt-2"
                            >
                                ← Back
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        )
    }

    // Main modal - show plan details
    return (
        <Dialog open={isOpen} onOpenChange={() => { }}>
            <DialogContent
                className="sm:max-w-lg"
                hideCloseButton={true}
                onPointerDownOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <DialogHeader className="text-center pb-2">
                    <div className="mx-auto w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mb-4">
                        <Gift className="w-8 h-8 text-white" />
                    </div>
                    <Badge variant="secondary" className="mx-auto mb-2 bg-amber-100 text-amber-800 border-amber-200">
                        <Star className="w-3 h-3 mr-1 fill-amber-500 text-amber-500" />
                        Exclusive Offer
                    </Badge>
                    <DialogTitle className="text-2xl font-bold text-center">
                        Welcome! You&apos;ve Been Invited 🎉
                    </DialogTitle>
                    <DialogDescription className="text-center text-base">
                        As an invited employer, you have access to an exclusive plan just for you.
                    </DialogDescription>
                </DialogHeader>

                <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
                    <CardContent className="pt-6">
                        <div className="text-center mb-4">
                            <h3 className="text-xl font-bold text-gray-900">{offer.planName}</h3>
                            <div className="mt-2">
                                <span className="text-4xl font-bold text-amber-600">${offer.amountDollars}</span>
                                <span className="text-gray-600">/month</span>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                                for {offer.cycles} months
                            </p>
                        </div>

                        <ul className="space-y-2 mt-4">
                            {features.map((feature, index) => (
                                <li key={index} className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                                    <span className="text-sm text-gray-700">{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>

                <div className="flex flex-col gap-3 mt-4">
                    <Button
                        onClick={handleActivateClick}
                        disabled={isActivating || isDismissing}
                        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-6"
                    >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Activate Now - ${offer.amountDollars}/month
                    </Button>

                    <Button
                        variant="ghost"
                        onClick={handleDismiss}
                        disabled={isActivating || isDismissing}
                        className="w-full text-gray-500 hover:text-gray-700"
                    >
                        {isDismissing ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <X className="w-4 h-4 mr-2" />
                        )}
                        Maybe Later
                    </Button>

                    <p className="text-xs text-center text-gray-400">
                        You can activate this offer anytime from the Billing page.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    )
}
