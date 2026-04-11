'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { CreditCard, Lock, Shield } from 'lucide-react'

interface PaymentFormProps {
  amount: number
  description: string
  onSuccess: (paymentResult: { transactionId: string; amount: number; status: string; authCode: string; last4: string; cardType: string; timestamp: string }) => void
  onCancel: () => void
  isLoading?: boolean
}

interface PaymentData {
  cardNumber: string
  expiryMonth: string
  expiryYear: string
  cvv: string
  cardholderName: string
  billingAddress: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  saveCard: boolean
}

export function PaymentForm({ amount, description, onSuccess, onCancel, isLoading = false }: PaymentFormProps) {
  const [paymentData, setPaymentData] = useState<PaymentData>({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    cardholderName: '',
    billingAddress: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'US'
    },
    saveCard: false
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isProcessing, setIsProcessing] = useState(false)

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Card number validation (basic)
    if (!paymentData.cardNumber || paymentData.cardNumber.replace(/\s/g, '').length < 13) {
      newErrors.cardNumber = 'Please enter a valid card number'
    }

    // Expiry validation
    if (!paymentData.expiryMonth) {
      newErrors.expiryMonth = 'Please select expiry month'
    }
    if (!paymentData.expiryYear) {
      newErrors.expiryYear = 'Please select expiry year'
    }

    // CVV validation
    if (!paymentData.cvv || paymentData.cvv.length < 3) {
      newErrors.cvv = 'Please enter a valid CVV'
    }

    // Cardholder name validation
    if (!paymentData.cardholderName.trim()) {
      newErrors.cardholderName = 'Please enter cardholder name'
    }

    // Billing address validation
    if (!paymentData.billingAddress.street.trim()) {
      newErrors.street = 'Please enter street address'
    }
    if (!paymentData.billingAddress.city.trim()) {
      newErrors.city = 'Please enter city'
    }
    if (!paymentData.billingAddress.state.trim()) {
      newErrors.state = 'Please enter state'
    }
    if (!paymentData.billingAddress.zipCode.trim()) {
      newErrors.zipCode = 'Please enter ZIP code'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const formatCardNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '')
    
    // Add spaces every 4 digits
    const formatted = digits.replace(/(\d{4})(?=\d)/g, '$1 ')
    
    return formatted.substring(0, 19) // Max 16 digits + 3 spaces
  }

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value)
    setPaymentData(prev => ({ ...prev, cardNumber: formatted }))
  }

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').substring(0, 4)
    setPaymentData(prev => ({ ...prev, cvv: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsProcessing(true)

    try {
      // TODO: Integrate with Authorize.net Accept.js
      // This is where you would use Authorize.net's Accept.js to securely tokenize the card
      // and then send the token to your backend for processing
      
      console.log('Processing payment with Authorize.net...')
      console.log('Payment data:', {
        amount,
        description,
        // Don't log sensitive card data in production
        cardLast4: paymentData.cardNumber.slice(-4),
        billingAddress: paymentData.billingAddress
      })

      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 3000))

      // Mock successful payment response
      const paymentResult = {
        transactionId: 'txn_' + Math.random().toString(36).substr(2, 9),
        amount,
        status: 'approved',
        authCode: 'AUTH' + Math.random().toString(36).substr(2, 6).toUpperCase(),
        last4: paymentData.cardNumber.slice(-4),
        cardType: getCardType(paymentData.cardNumber),
        timestamp: new Date().toISOString()
      }

      onSuccess(paymentResult)
    } catch (error) {
      console.error('Payment processing error:', error)
      setErrors({ general: 'Payment processing failed. Please try again.' })
    } finally {
      setIsProcessing(false)
    }
  }

  const getCardType = (cardNumber: string): string => {
    const number = cardNumber.replace(/\s/g, '')
    if (number.startsWith('4')) return 'Visa'
    if (number.startsWith('5') || number.startsWith('2')) return 'Mastercard'
    if (number.startsWith('3')) return 'American Express'
    if (number.startsWith('6')) return 'Discover'
    return 'Unknown'
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 20 }, (_, i) => currentYear + i)
  const months = [
    { value: '01', label: '01 - January' },
    { value: '02', label: '02 - February' },
    { value: '03', label: '03 - March' },
    { value: '04', label: '04 - April' },
    { value: '05', label: '05 - May' },
    { value: '06', label: '06 - June' },
    { value: '07', label: '07 - July' },
    { value: '08', label: '08 - August' },
    { value: '09', label: '09 - September' },
    { value: '10', label: '10 - October' },
    { value: '11', label: '11 - November' },
    { value: '12', label: '12 - December' }
  ]

  const states = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ]

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>Payment Information</span>
          </CardTitle>
          <CardDescription>
            Complete your purchase securely with Authorize.net
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Order Summary */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h3 className="font-semibold mb-2">Order Summary</h3>
            <div className="flex justify-between items-center">
              <span>{description}</span>
              <span className="font-bold text-lg">${amount}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {errors.general && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {errors.general}
              </div>
            )}

            {/* Card Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Card Information</h3>
              
              <div>
                <Label htmlFor="cardNumber">Card Number</Label>
                <Input
                  id="cardNumber"
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  value={paymentData.cardNumber}
                  onChange={handleCardNumberChange}
                  className={errors.cardNumber ? 'border-red-500' : ''}
                />
                {errors.cardNumber && (
                  <p className="text-red-500 text-sm mt-1">{errors.cardNumber}</p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="expiryMonth">Month</Label>
                  <Select
                    value={paymentData.expiryMonth}
                    onValueChange={(value) => setPaymentData(prev => ({ ...prev, expiryMonth: value }))}
                  >
                    <SelectTrigger className={errors.expiryMonth ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map(month => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.expiryMonth && (
                    <p className="text-red-500 text-sm mt-1">{errors.expiryMonth}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="expiryYear">Year</Label>
                  <Select
                    value={paymentData.expiryYear}
                    onValueChange={(value) => setPaymentData(prev => ({ ...prev, expiryYear: value }))}
                  >
                    <SelectTrigger className={errors.expiryYear ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map(year => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.expiryYear && (
                    <p className="text-red-500 text-sm mt-1">{errors.expiryYear}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="cvv">CVV</Label>
                  <Input
                    id="cvv"
                    type="text"
                    placeholder="123"
                    value={paymentData.cvv}
                    onChange={handleCvvChange}
                    className={errors.cvv ? 'border-red-500' : ''}
                  />
                  {errors.cvv && (
                    <p className="text-red-500 text-sm mt-1">{errors.cvv}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="cardholderName">Cardholder Name</Label>
                <Input
                  id="cardholderName"
                  type="text"
                  placeholder="John Doe"
                  value={paymentData.cardholderName}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, cardholderName: e.target.value }))}
                  className={errors.cardholderName ? 'border-red-500' : ''}
                />
                {errors.cardholderName && (
                  <p className="text-red-500 text-sm mt-1">{errors.cardholderName}</p>
                )}
              </div>
            </div>

            {/* Billing Address */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Billing Address</h3>
              
              <div>
                <Label htmlFor="street">Street Address</Label>
                <Input
                  id="street"
                  type="text"
                  placeholder="123 Main St"
                  value={paymentData.billingAddress.street}
                  onChange={(e) => setPaymentData(prev => ({ 
                    ...prev, 
                    billingAddress: { ...prev.billingAddress, street: e.target.value }
                  }))}
                  className={errors.street ? 'border-red-500' : ''}
                />
                {errors.street && (
                  <p className="text-red-500 text-sm mt-1">{errors.street}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    type="text"
                    placeholder="New York"
                    value={paymentData.billingAddress.city}
                    onChange={(e) => setPaymentData(prev => ({ 
                      ...prev, 
                      billingAddress: { ...prev.billingAddress, city: e.target.value }
                    }))}
                    className={errors.city ? 'border-red-500' : ''}
                  />
                  {errors.city && (
                    <p className="text-red-500 text-sm mt-1">{errors.city}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="state">State</Label>
                  <Select
                    value={paymentData.billingAddress.state}
                    onValueChange={(value) => setPaymentData(prev => ({ 
                      ...prev, 
                      billingAddress: { ...prev.billingAddress, state: value }
                    }))}
                  >
                    <SelectTrigger className={errors.state ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {states.map(state => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.state && (
                    <p className="text-red-500 text-sm mt-1">{errors.state}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="zipCode">ZIP Code</Label>
                  <Input
                    id="zipCode"
                    type="text"
                    placeholder="10001"
                    value={paymentData.billingAddress.zipCode}
                    onChange={(e) => setPaymentData(prev => ({ 
                      ...prev, 
                      billingAddress: { ...prev.billingAddress, zipCode: e.target.value }
                    }))}
                    className={errors.zipCode ? 'border-red-500' : ''}
                  />
                  {errors.zipCode && (
                    <p className="text-red-500 text-sm mt-1">{errors.zipCode}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="country">Country</Label>
                  <Select
                    value={paymentData.billingAddress.country}
                    onValueChange={(value) => setPaymentData(prev => ({ 
                      ...prev, 
                      billingAddress: { ...prev.billingAddress, country: value }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="CA">Canada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Save Card Option */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="saveCard"
                checked={paymentData.saveCard}
                onCheckedChange={(checked) => setPaymentData(prev => ({ ...prev, saveCard: !!checked }))}
              />
              <Label htmlFor="saveCard" className="text-sm">
                Save this card for future purchases
              </Label>
            </div>

            {/* Security Notice */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 text-blue-800">
                <Shield className="h-4 w-4" />
                <span className="text-sm font-medium">Secure Payment</span>
              </div>
              <p className="text-blue-700 text-sm mt-1">
                Your payment information is encrypted and processed securely through Authorize.net.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isProcessing || isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isProcessing || isLoading}
                className="flex-1"
              >
                {isProcessing ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Pay ${amount}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}