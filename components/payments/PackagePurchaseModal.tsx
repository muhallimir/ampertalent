'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useToast } from '@/components/ui/toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  CreditCard,
  Package,
  CheckCircle,
  Plus
} from 'lucide-react'
import { getWithImpersonation, postWithImpersonation } from '@/lib/api-client'
import { AddOnsSelectionPanel } from './AddOnsSelectionPanel'
import { PayPalButton } from './PayPalButton'

interface PaymentMethod {
  id: string
  type: 'card'
  last4: string
  brand: string
  expiryMonth: number
  expiryYear: number
  isDefault: boolean
}

interface PackageInfo {
  id: string
  name: string
  price: number
  listings: number
  duration: number
  description: string
}

interface PackagePurchaseModalProps {
  isOpen: boolean
  onClose: () => void
  packageInfo: PackageInfo
  onSuccess: () => void
  onError: (message: string) => void
  onAddPaymentMethod: () => void
}

export function PackagePurchaseModal({
  isOpen,
  onClose,
  packageInfo,
  onSuccess,
  onError,
  onAddPaymentMethod,
}: PackagePurchaseModalProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [paypalMethods, setPaypalMethods] = useState<PaymentMethod[]>([])
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('')
  const [selectedPaypalMethod, setSelectedPaypalMethod] = useState<string>('')
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([])
  const [totalPrice, setTotalPrice] = useState(packageInfo.price)
  const [paymentType, setPaymentType] = useState<'card' | 'paypal'>('card')
  const [useNewPaypal, setUseNewPaypal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(true)
  const { addToast } = useToast()

  useEffect(() => {
    const loadPaymentMethods = async () => {
      try {
        setIsLoadingPaymentMethods(true)
        const response = await getWithImpersonation('/api/employer/billing/payment-methods')
        if (response.ok) {
          const data = await response.json()
          const allMethods = data.paymentMethods || []

          // Separate credit card and PayPal payment methods
          const cardMethods = allMethods.filter(
            (method: PaymentMethod) => method.brand.toLowerCase() !== 'paypal'
          )
          const savedPaypalMethods = allMethods.filter(
            (method: PaymentMethod) => method.brand.toLowerCase() === 'paypal'
          )

          setPaymentMethods(cardMethods)
          setPaypalMethods(savedPaypalMethods)

          // Auto-select default card payment method
          const defaultMethod = cardMethods.find((method: PaymentMethod) => method.isDefault)
          if (defaultMethod) {
            setSelectedPaymentMethod(defaultMethod.id)
          } else if (cardMethods.length > 0) {
            setSelectedPaymentMethod(cardMethods[0].id)
          } else {
            setSelectedPaymentMethod('')
          }

          // Auto-select default PayPal method if available
          const defaultPaypal = savedPaypalMethods.find((method: PaymentMethod) => method.isDefault)
          if (defaultPaypal) {
            setSelectedPaypalMethod(defaultPaypal.id)
          } else if (savedPaypalMethods.length > 0) {
            setSelectedPaypalMethod(savedPaypalMethods[0].id)
          } else {
            setSelectedPaypalMethod('')
          }

          // Reset useNewPaypal when modal opens
          setUseNewPaypal(false)
        }
      } catch (error) {
        console.error('Error loading payment methods:', error)
        onError('Failed to load payment methods')
      } finally {
        setIsLoadingPaymentMethods(false)
      }
    }

    if (isOpen) {
      loadPaymentMethods()
    }
  }, [isOpen, onError])

  const handleAddPaymentMethod = () => {
    onClose()
    // Add a small delay to ensure proper state transition
    setTimeout(onAddPaymentMethod, 50)
  }

  const handlePayPalSuccess = (billingAgreementId: string, subscriptionId?: string) => {
    addToast({
      title: "Purchase Complete!",
      description: `Your ${packageInfo.name} has been activated via PayPal with ${packageInfo.listings} job posting credits.`,
      variant: "success",
      duration: 5000,
    })
    onSuccess()
    onClose()
  }

  const handlePayPalError = (message: string) => {
    onError(message)
  }

  // Handler for purchasing with SAVED PayPal billing agreement (no redirect needed)
  const handleSavedPayPalPurchase = async () => {
    if (!selectedPaypalMethod) {
      onError('Please select a PayPal payment method')
      return
    }

    setIsLoading(true)
    try {
      const response = await postWithImpersonation('/api/payments/paypal/charge-billing-agreement', {
        paymentMethodId: selectedPaypalMethod,
        amount: totalPrice,
        packageId: packageInfo.id,
        addOnIds: selectedAddOns.length > 0 ? selectedAddOns : undefined,
        description: `${packageInfo.name} Package Purchase`
      })

      const result = await response.json()

      if (result.success) {
        addToast({
          title: "Purchase Complete!",
          description: `Your ${packageInfo.name} has been activated via PayPal with ${packageInfo.listings} job posting credits.`,
          variant: "success",
          duration: 5000,
        })
        onSuccess()
        onClose()
      } else {
        // If billing agreement is expired/cancelled, suggest creating new one
        if (result.error?.includes('expired') || result.error?.includes('cancelled')) {
          onError('Your PayPal billing agreement is no longer active. Please click "Add New PayPal" to set up a new one.')
          setUseNewPaypal(true)
        } else {
          onError(result.error || 'Failed to process PayPal payment')
        }
      }
    } catch (error) {
      console.error('Error charging saved PayPal:', error)
      onError('Failed to process PayPal payment. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePurchase = async () => {
    if (!selectedPaymentMethod) {
      onError('Please select a payment method')
      return
    }

    setIsLoading(true)
    try {
      const response = await postWithImpersonation('/api/employer/billing/purchase', {
        packageId: packageInfo.id,
        paymentMethodId: selectedPaymentMethod,
        selectedAddOns: selectedAddOns,
        totalPrice: totalPrice
      })

      const result = await response.json()

      if (result.success) {
        addToast({
          title: "Purchase Complete!",
          description: `Your ${packageInfo.name} has been activated with ${packageInfo.listings} job posting credits.`,
          variant: "success",
          duration: 5000,
        })
        onSuccess()
        onClose()
      } else {
        onError(result.error || 'Failed to purchase package')
      }
    } catch (error) {
      console.error('Error purchasing package:', error)
      onError('Failed to purchase package')
    } finally {
      setIsLoading(false)
    }
  }
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        {/* Header - Fixed */}
        <div className="border-b px-6 py-4 flex-shrink-0">
          <DialogTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-blue-600" />
            <span>Purchase Package</span>
          </DialogTitle>
          <DialogDescription className="mt-1">
            Complete your package purchase using a saved payment method
          </DialogDescription>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 px-6 py-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left Column - Package Summary */}
            <div className="space-y-4">
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-lg">{packageInfo.name}</CardTitle>
                  <CardDescription>{packageInfo.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600">Price</p>
                      <p className="text-2xl font-bold text-blue-600">${packageInfo.price}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Job Posting Credits</p>
                        <p className="text-lg font-semibold">{packageInfo.listings}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Duration</p>
                        <p className="text-lg font-semibold">{packageInfo.duration} days</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Ready to Purchase
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Add-Ons Selection - Only for Concierge packages */}
              {packageInfo.id.startsWith('concierge_') && (
                <AddOnsSelectionPanel
                  packageType={packageInfo.id}
                  selectedAddOns={selectedAddOns}
                  onAddOnsChange={setSelectedAddOns}
                  onTotalPriceChange={setTotalPrice}
                  basePrice={packageInfo.price}
                />
              )}
            </div>

            {/* Right Column - Payment Method Selection & Security */}
            <div className="space-y-4">
              {/* Payment Method Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CreditCard className="h-5 w-5 text-gray-600" />
                    <span>Select Payment Method</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Payment Type Tabs */}
                  <div className="flex gap-2 mb-4">
                    <button
                      type="button"
                      onClick={() => setPaymentType('card')}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors ${paymentType === 'card'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                        }`}
                    >
                      <CreditCard className="h-5 w-5" />
                      <span className="font-medium">Credit Card</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentType('paypal')}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors ${paymentType === 'paypal'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                        }`}
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c1.27.287 2.177.902 2.65 1.865.38.773.514 1.743.346 2.88-.036.244-.09.487-.153.73-.963 4.893-4.394 6.97-8.537 6.97H12.73l-1.205 7.63a.563.563 0 0 1-.556.47H7.716a.351.351 0 0 1-.346-.404l.316-2.002c.083-.518.527-.9 1.05-.9h1.58c.524 0 .967.382 1.049.9l.188 1.19c.082.518.526.9 1.049.9h.85c3.883 0 6.896-1.577 7.78-6.138.386-1.978.083-3.577-1.01-4.55z" />
                      </svg>
                      <span className="font-medium">PayPal</span>
                    </button>
                  </div>

                  {/* Credit Card Payment Methods */}
                  {paymentType === 'card' && (
                    <>
                      {isLoadingPaymentMethods ? (
                        <div className="flex items-center justify-center py-8">
                          <LoadingSpinner size="md" />
                        </div>
                      ) : paymentMethods.length > 0 ? (
                        <div className="space-y-3">
                          {paymentMethods.map((method) => (
                            <div
                              key={method.id}
                              className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${selectedPaymentMethod === method.id
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                                }`}
                              onClick={() => setSelectedPaymentMethod(method.id)}
                            >
                              <div className="flex items-center space-x-3">
                                <div className={`w-4 h-4 rounded-full border-2 ${selectedPaymentMethod === method.id
                                  ? 'border-blue-500 bg-blue-500'
                                  : 'border-gray-300'
                                  }`}>
                                  {selectedPaymentMethod === method.id && (
                                    <div className="w-full h-full rounded-full bg-white scale-50"></div>
                                  )}
                                </div>
                                <CreditCard className="h-5 w-5 text-gray-400" />
                                <div>
                                  <p className="font-medium text-sm">
                                    {method.brand} ****{method.last4}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    Expires {method.expiryMonth.toString().padStart(2, '0')}/{method.expiryYear}
                                    {method.isDefault && (
                                      <span className="ml-2 text-blue-600 font-medium">• Default</span>
                                    )}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}

                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={handleAddPaymentMethod}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add New Payment Method
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <CreditCard className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                          <h3 className="text-base font-semibold text-gray-900 mb-2">No Payment Methods</h3>
                          <p className="text-sm text-gray-600 mb-4">
                            Add a payment method to complete your purchase
                          </p>
                          <Button onClick={handleAddPaymentMethod}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Payment Method
                          </Button>
                        </div>
                      )}
                    </>
                  )}

                  {/* PayPal Payment Option */}
                  {paymentType === 'paypal' && (
                    <div className="py-4">
                      {/* Show saved PayPal methods if available and user hasn't chosen to add new */}
                      {paypalMethods.length > 0 && !useNewPaypal ? (
                        <>
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-3">Saved PayPal Account</h4>
                            <div className="space-y-3">
                              {paypalMethods.map((method) => (
                                <div
                                  key={method.id}
                                  className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${selectedPaypalMethod === method.id
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                  onClick={() => setSelectedPaypalMethod(method.id)}
                                >
                                  <div className="flex items-center space-x-3">
                                    <div className={`w-4 h-4 rounded-full border-2 ${selectedPaypalMethod === method.id
                                      ? 'border-blue-500 bg-blue-500'
                                      : 'border-gray-300'
                                      }`}>
                                      {selectedPaypalMethod === method.id && (
                                        <div className="w-full h-full rounded-full bg-white scale-50"></div>
                                      )}
                                    </div>
                                    <svg className="h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c1.27.287 2.177.902 2.65 1.865.38.773.514 1.743.346 2.88-.036.244-.09.487-.153.73-.963 4.893-4.394 6.97-8.537 6.97H12.73l-1.205 7.63a.563.563 0 0 1-.556.47H7.716a.351.351 0 0 1-.346-.404l.316-2.002c.083-.518.527-.9 1.05-.9h1.58c.524 0 .967.382 1.049.9l.188 1.19c.082.518.526.9 1.049.9h.85c3.883 0 6.896-1.577 7.78-6.138.386-1.978.083-3.577-1.01-4.55z" />
                                    </svg>
                                    <div>
                                      <p className="font-medium text-sm">PayPal Account</p>
                                      <p className="text-xs text-gray-600">
                                        Linked billing agreement
                                        {method.isDefault && (
                                          <span className="ml-2 text-blue-600 font-medium">• Default</span>
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                  <CheckCircle className={`h-5 w-5 ${selectedPaypalMethod === method.id ? 'text-blue-600' : 'text-transparent'}`} />
                                </div>
                              ))}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setUseNewPaypal(true)}
                            className="w-full text-sm text-blue-600 hover:text-blue-700 hover:underline mb-4"
                          >
                            + Add New PayPal Account
                          </button>

                          <p className="text-xs text-gray-500 text-center">
                            Your saved PayPal account will be charged ${totalPrice.toFixed(2)} immediately.
                          </p>
                        </>
                      ) : (
                        /* Show redirect to PayPal flow when no saved PayPal OR user wants new */
                        <>
                          <div className="text-center mb-6">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
                              <svg className="h-8 w-8 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c1.27.287 2.177.902 2.65 1.865.38.773.514 1.743.346 2.88-.036.244-.09.487-.153.73-.963 4.893-4.394 6.97-8.537 6.97H12.73l-1.205 7.63a.563.563 0 0 1-.556.47H7.716a.351.351 0 0 1-.346-.404l.316-2.002c.083-.518.527-.9 1.05-.9h1.58c.524 0 .967.382 1.049.9l.188 1.19c.082.518.526.9 1.049.9h.85c3.883 0 6.896-1.577 7.78-6.138.386-1.978.083-3.577-1.01-4.55z" />
                              </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                              Pay with PayPal
                            </h3>
                            <p className="text-gray-600 text-sm mb-4">
                              You will be redirected to PayPal to complete your one-time payment securely.
                              {paypalMethods.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setUseNewPaypal(false)}
                                  className="block w-full text-sm text-blue-600 hover:text-blue-700 hover:underline mt-2"
                                >
                                  ← Use Saved PayPal Instead
                                </button>
                              )}
                            </p>
                          </div>
                          <PayPalButton
                            planId={`package_${packageInfo.id}`}
                            onSuccess={handlePayPalSuccess}
                            onError={handlePayPalError}
                            disabled={isLoading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                            variant="default"
                            size="lg"
                            userType="employer"
                            addOnIds={selectedAddOns}
                            customAmount={totalPrice}
                          />
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Security Notice - Moved here, right after payment methods */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-green-800">Secure Payment</h4>
                    <p className="text-sm text-green-700 mt-1">
                      {paymentType === 'card'
                        ? 'Your payment is processed securely through Authorize.net with industry-standard encryption.'
                        : 'Your payment is processed securely through PayPal with buyer protection.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Sticky Button */}
        <div className="border-t px-6 py-4 flex-shrink-0 bg-white">
          {paymentType === 'card' ? (
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button
                onClick={handlePurchase}
                disabled={isLoading || !selectedPaymentMethod || paymentMethods.length === 0}
                className="min-w-[140px]"
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Package className="h-4 w-4 mr-2" />
                    Purchase ${totalPrice.toFixed(2)}
                  </>
                )}
              </Button>
            </div>
          ) : paypalMethods.length > 0 && !useNewPaypal ? (
            /* Show purchase button for saved PayPal */
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button
                onClick={handleSavedPayPalPurchase}
                disabled={isLoading || !selectedPaypalMethod}
                className="min-w-[140px] bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c1.27.287 2.177.902 2.65 1.865.38.773.514 1.743.346 2.88-.036.244-.09.487-.153.73-.963 4.893-4.394 6.97-8.537 6.97H12.73l-1.205 7.63a.563.563 0 0 1-.556.47H7.716a.351.351 0 0 1-.346-.404l.316-2.002c.083-.518.527-.9 1.05-.9h1.58c.524 0 .967.382 1.049.9l.188 1.19c.082.518.526.9 1.049.9h.85c3.883 0 6.896-1.577 7.78-6.138.386-1.978.083-3.577-1.01-4.55z" />
                    </svg>
                    Pay ${totalPrice.toFixed(2)}
                  </>
                )}
              </Button>
            </div>
          ) : (
            /* Show cancel only for new PayPal redirect flow */
            <div className="flex justify-center">
              <Button variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
