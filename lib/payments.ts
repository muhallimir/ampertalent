// Mock payment service for Phase 3
// This will be replaced with Stripe integration in Phase 6
// See docs/01-TECH-STACK-AND-FREE-ALTERNATIVES.md for Stripe implementation details

export interface PaymentMethod {
  id: string
  type: 'mock'
  last4: string
  brand: string
}

export interface PaymentIntent {
  id: string
  amount: number
  currency: 'usd'
  status: 'succeeded' | 'pending' | 'failed'
  clientSecret: string
}

export interface Subscription {
  id: string
  status: 'active' | 'canceled' | 'past_due'
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
}

// Legacy interfaces for compatibility (will be removed in Phase 6)
export interface PaymentData {
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
}

export interface PaymentResult {
  success: boolean
  transactionId?: string
  authCode?: string
  amount?: number
  last4?: string
  cardType?: string
  errorMessage?: string
  errorCode?: string
}

export interface SubscriptionData {
  planId: string
  userId: string
  paymentMethodId?: string
}

export interface PackageData {
  packageId: string
  companyId: string
  paymentMethodId?: string
}

// Mock payment functions - replace with Stripe in Phase 6
export async function createPaymentIntent(amount: number, currency = 'usd'): Promise<PaymentIntent> {
  // Mock implementation - always succeeds in development
  console.log(`Mock Payment: Creating payment intent for $${amount}`)
  return {
    id: `pi_mock_${Date.now()}`,
    amount,
    currency: currency as 'usd',
    status: 'succeeded',
    clientSecret: `pi_mock_secret_${Date.now()}`
  }
}

export async function createSubscription(planId: string, paymentMethodId: string): Promise<Subscription> {
  // Mock implementation - always succeeds in development
  console.log(`Mock Payment: Creating subscription for plan ${planId}`)
  const now = new Date()
  const endDate = new Date(now)
  endDate.setMonth(endDate.getMonth() + 1)

  return {
    id: `sub_mock_${Date.now()}`,
    status: 'active',
    currentPeriodStart: now,
    currentPeriodEnd: endDate,
    cancelAtPeriodEnd: false
  }
}

export async function cancelSubscription(subscriptionId: string): Promise<void> {
  // Mock implementation - always succeeds
  console.log(`Mock Payment: Canceled subscription ${subscriptionId}`)
}

// Mock checkout URL generation
export function generateMockCheckoutUrl(planId: string, userId: string): string {
  // Return a mock URL that redirects back to success page
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${baseUrl}/checkout/success?session_id=mock_${Date.now()}&plan_id=${planId}&user_id=${userId}`
}

// Legacy Authorize.net functions (deprecated - remove in Phase 6)
export async function processPayment(data: PaymentData): Promise<PaymentResult> {
  // Mock implementation
  console.warn('⚠️ Using deprecated mock payment function - will be replaced with Stripe in Phase 6')
  return {
    success: true,
    transactionId: `txn_mock_${Date.now()}`,
    amount: 0,
    last4: '4242',
    cardType: 'Visa'
  }
}

export async function createCustomerProfile(): Promise<string> {
  console.warn('⚠️ Using deprecated mock payment function - will be replaced with Stripe in Phase 6')
  return `profile_mock_${Date.now()}`
}

export async function createPaymentProfile(): Promise<string> {
  console.warn('⚠️ Using deprecated mock payment function - will be replaced with Stripe in Phase 6')
  return `payment_mock_${Date.now()}`
}

// Utility functions for card validation (keep for Phase 6 Stripe integration)
export function getCardType(cardNumber: string): string {
  const number = cardNumber.replace(/\s/g, '')
  if (/^4/.test(number)) return 'Visa'
  if (/^5[1-5]/.test(number)) return 'MasterCard'
  if (/^3[47]/.test(number)) return 'American Express'
  if (/^6(?:011|5)/.test(number)) return 'Discover'
  return 'Unknown'
}

export function validatePaymentData(paymentData: PaymentData): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  // Card number validation
  const cardNumber = paymentData.cardNumber.replace(/\s/g, '')
  if (!cardNumber || cardNumber.length < 13 || cardNumber.length > 19) {
    errors.push('Invalid card number')
  }

  // Expiry validation
  const currentDate = new Date()
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth() + 1

  const expiryYear = parseInt(paymentData.expiryYear)
  const expiryMonth = parseInt(paymentData.expiryMonth)

  if (expiryYear < currentYear || (expiryYear === currentYear && expiryMonth < currentMonth)) {
    errors.push('Card has expired')
  }

  // CVV validation
  if (!paymentData.cvv || paymentData.cvv.length < 3 || paymentData.cvv.length > 4) {
    errors.push('Invalid CVV')
  }

  // Cardholder name validation
  if (!paymentData.cardholderName.trim()) {
    errors.push('Cardholder name is required')
  }

  // Billing address validation
  if (!paymentData.billingAddress.street.trim()) {
    errors.push('Street address is required')
  }
  if (!paymentData.billingAddress.city.trim()) {
    errors.push('City is required')
  }
  if (!paymentData.billingAddress.state.trim()) {
    errors.push('State is required')
  }
  if (!paymentData.billingAddress.zipCode.trim()) {
    errors.push('ZIP code is required')
  }
  if (!paymentData.billingAddress.country.trim()) {
    errors.push('Country is required')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}
