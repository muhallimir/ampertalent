'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { Gift, Star, Check, CreditCard, Loader2, CheckCircle, Plus } from 'lucide-react'
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
    showPersistentCard: boolean // Only true for invitation-based offers
    planType?: string
    planName?: string
    amountCents?: number
    amountDollars?: string
    cycles?: number
    isActivated: boolean
    isDismissed: boolean
    activatedAt?: string
    source?: string // 'invitation' or 'admin'
}

export function ExclusivePlanCard() {
    const [isLoading, setIsLoading] = useState(true)
    const [isActivating, setIsActivating] = useState(false)
    const [offer, setOffer] = useState<ExclusivePlanOffer | null>(null)
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string | null>(null)
    const [isAddingPayPal, setIsAddingPayPal] = useState(false)
    const { addToast } = useToast()

    useEffect(() => {
        fetchExclusivePlan()
        fetchPaymentMethods()
    }, [])

    const fetchExclusivePlan = async () => {
        try {
            const response = await fetch('/api/employer/exclusive-plan')
            if (response.ok) {
                const data = await response.json()
                setOffer(data)
            }
        } catch (error) {
            console.error('Error fetching exclusive plan:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const fetchPaymentMethods = async () => {
        try {
            const response = await fetch('/api/employer/billing/payment-methods')
            if (response.ok) {
                const data = await response.json()
                setPaymentMethods(data.paymentMethods || [])
            }
        } catch (error) {
            console.error('Error fetching payment methods:', error)
        }
    }

    const handleActivateClick = () => {
        // If user has payment methods, show selection modal
        // If no payment methods, show add payment method options
        setShowPaymentModal(true)
        // Pre-select default payment method if available
        const defaultMethod = paymentMethods.find(pm => pm.isDefault)
        if (defaultMethod) {
            setSelectedPaymentMethodId(defaultMethod.id)
        } else if (paymentMethods.length > 0) {
            setSelectedPaymentMethodId(paymentMethods[0].id)
        }
    }

    const handleActivateWithPaymentMethod = async (paymentMethodId: string) => {
        setIsActivating(true)
        setShowPaymentModal(false)
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
                // Refresh the page to show updated package
                window.location.reload()
            } else if (data.requiresPaymentMethod) {
                addToast({
                    title: 'Payment method required',
                    description: 'Please add a payment method first.',
                    variant: 'destructive'
                })
                setShowPaymentModal(true)
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

    const handleAddCard = () => {
        // Redirect to billing page with add payment method action
        // Include source=exclusive-plan so billing page knows to trigger activation after adding card
        window.location.href = '/employer/billing?tab=payment-methods&action=add-card&source=exclusive-plan'
    }

    const handleAddPayPal = async () => {
        setIsAddingPayPal(true)
        try {
            const currentUrl = window.location.origin
            // Return to billing page after PayPal setup, which will then show the exclusive plan
            const returnUrl = `${currentUrl}/employer/billing/paypal-setup-return?redirect=billing`
            const cancelUrl = `${currentUrl}/employer/billing?tab=payment-methods`

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

    if (isLoading) {
        return null // Don't show loading state, just render nothing until we know
    }

    // No offer at all
    if (!offer?.hasOffer) {
        return null
    }

    // Always show the card on billing page if there's an offer.
    // The "Maybe Later" button only dismisses the MODAL, not the billing page card.
    // Both invitation and admin-offered plans should always show on billing page
    // until activated. Admin can revoke the offer if needed (which clears the fields).
    // No conditional needed - if hasOffer is true, we show the card.

    const features = [
        '1 Job Posting (Active for 6 Months)',
        '6 Monthly Payments ($97/mo)',
        'Access to All Candidates',
        'Auto-Ends After 6 Months',
    ]

    // Already activated - show confirmation card (for both invitation and admin sources)
    if (offer.isActivated) {
        return (
            <Card className="border-2 border-green-200 bg-green-50">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <CardTitle className="text-green-800">Exclusive Plan Active</CardTitle>
                        </div>
                        <Badge className="bg-green-100 text-green-800 border-green-200">
                            <Star className="w-3 h-3 mr-1 fill-green-600 text-green-600" />
                            Activated
                        </Badge>
                    </div>
                    <CardDescription className="text-green-700">
                        Your {offer.planName} is active. Check &quot;Active Packages&quot; for details.
                    </CardDescription>
                </CardHeader>
            </Card>
        )
    }

    // Not activated - show activation card
    return (
        <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 shadow-lg">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                            <Gift className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-gray-900">{offer.planName}</CardTitle>
                            <CardDescription className="text-amber-700">
                                Exclusive offer for invited employers
                            </CardDescription>
                        </div>
                    </div>
                    <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                        <Star className="w-3 h-3 mr-1 fill-amber-500 text-amber-500" />
                        Exclusive
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                    {/* Price */}
                    <div className="text-center md:text-left">
                        <span className="text-3xl font-bold text-amber-600">${offer.amountDollars}</span>
                        <span className="text-gray-600">/month</span>
                        <p className="text-sm text-gray-500">for {offer.cycles} months</p>
                    </div>

                    {/* Features */}
                    <div className="flex-1">
                        <ul className="grid grid-cols-2 gap-2">
                            {features.map((feature, index) => (
                                <li key={index} className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                                    <span className="text-sm text-gray-700">{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* CTA */}
                    <div>
                        <Button
                            onClick={handleActivateClick}
                            disabled={isActivating}
                            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold px-6 py-3"
                        >
                            {isActivating ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <CreditCard className="w-4 h-4 mr-2" />
                                    Activate Now
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </CardContent>

            {/* Payment Selection Modal */}
            <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {paymentMethods.length > 0 ? 'Select Payment Method' : 'Add Payment Method'}
                        </DialogTitle>
                        <DialogDescription>
                            {paymentMethods.length > 0
                                ? `Choose how to pay for your ${offer.planName}`
                                : 'Add a payment method to activate your exclusive plan'
                            }
                        </DialogDescription>
                    </DialogHeader>

                    {paymentMethods.length > 0 ? (
                        // Show existing payment methods
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
                                className="w-full mt-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                            >
                                {isActivating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>Activate with Selected Method</>
                                )}
                            </Button>
                        </div>
                    ) : (
                        // No payment methods - show add options
                        <div className="space-y-3 py-4">
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
                                    <LoadingSpinner className="h-6 w-6" />
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
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </Card>
    )
}
