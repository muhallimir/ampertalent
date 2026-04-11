// Payment integration service for Authorize.net
// This file contains the payment processing logic and API integration

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

// Authorize.net configuration
const AUTHORIZE_NET_CONFIG = {
  apiLoginId: process.env.AUTHNET_API_LOGIN_ID,
  transactionKey: process.env.AUTHNET_TRANSACTION_KEY,
  environment: process.env.AUTHNET_ENVIRONMENT || 'sandbox',
  acceptJsUrl: process.env.AUTHNET_ENVIRONMENT === 'production'
    ? 'https://js.authorize.net/v1/Accept.js'
    : 'https://jstest.authorize.net/v1/Accept.js'
}

/**
 * Initialize Authorize.net Accept.js for secure payment processing
 * This should be called on the client side to load the Accept.js library
 */
export const initializeAuthorizeNet = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Accept.js can only be initialized in the browser'))
      return
    }

    // Check if Accept.js is already loaded
    if ((window as unknown as { Accept?: unknown }).Accept) {
      resolve()
      return
    }

    // Load Accept.js script
    const script = document.createElement('script')
    script.src = AUTHORIZE_NET_CONFIG.acceptJsUrl!
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Accept.js'))
    document.head.appendChild(script)
  })
}

/**
 * Tokenize payment data using Authorize.net Accept.js
 * This creates a secure payment nonce that can be sent to the server
 */
export const tokenizePaymentData = (paymentData: PaymentData): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !(window as unknown as { Accept?: unknown }).Accept) {
      reject(new Error('Accept.js not available'))
      return
    }

    const authData = {
      clientKey: process.env.NEXT_PUBLIC_AUTHNET_CLIENT_KEY,
      apiLoginID: AUTHORIZE_NET_CONFIG.apiLoginId
    }

    const cardData = {
      cardNumber: paymentData.cardNumber.replace(/\s/g, ''),
      month: paymentData.expiryMonth,
      year: paymentData.expiryYear,
      cardCode: paymentData.cvv
    }

    const secureData = {
      authData,
      cardData
    }

    ;(window as unknown as { Accept: { dispatchData: (data: unknown, callback: (response: {
      messages: { resultCode: string; message: Array<{ text: string }> };
      opaqueData: { dataValue: string };
    }) => void) => void } }).Accept.dispatchData(secureData, (response: {
      messages: { resultCode: string; message: Array<{ text: string }> };
      opaqueData: { dataValue: string };
    }) => {
      if (response.messages.resultCode === 'Error') {
        reject(new Error(response.messages.message[0].text))
      } else {
        resolve(response.opaqueData.dataValue)
      }
    })
  })
}

/**
 * Process a one-time payment for job posting packages
 */
export const processPackagePayment = async (
  packageData: PackageData,
  paymentData: PaymentData,
  amount: number
): Promise<PaymentResult> => {
  try {
    // In a real implementation, this would:
    // 1. Tokenize the payment data using Accept.js
    // 2. Send the token to your backend API
    // 3. Process the payment using Authorize.net API
    // 4. Return the result

    console.log('Processing package payment:', {
      packageId: packageData.packageId,
      companyId: packageData.companyId,
      amount
    })

    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Mock successful payment
    return {
      success: true,
      transactionId: 'txn_' + Math.random().toString(36).substr(2, 9),
      authCode: 'AUTH' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      amount,
      last4: paymentData.cardNumber.slice(-4),
      cardType: getCardType(paymentData.cardNumber)
    }
  } catch (error) {
    console.error('Package payment processing error:', error)
    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Payment processing failed'
    }
  }
}

/**
 * Process a subscription payment for job seekers
 */
export const processSubscriptionPayment = async (
  subscriptionData: SubscriptionData,
  paymentData: PaymentData,
  amount: number
): Promise<PaymentResult> => {
  try {
    console.log('Processing subscription payment:', {
      planId: subscriptionData.planId,
      userId: subscriptionData.userId,
      amount
    })

    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Mock successful payment
    return {
      success: true,
      transactionId: 'sub_' + Math.random().toString(36).substr(2, 9),
      authCode: 'AUTH' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      amount,
      last4: paymentData.cardNumber.slice(-4),
      cardType: getCardType(paymentData.cardNumber)
    }
  } catch (error) {
    console.error('Subscription payment processing error:', error)
    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Payment processing failed'
    }
  }
}

/**
 * Create a recurring subscription using Authorize.net ARB (Automatic Recurring Billing)
 */
export const createRecurringSubscription = async (
  subscriptionData: SubscriptionData,
  paymentData: PaymentData,
  planDetails: {
    amount: number
    interval: 'monthly' | 'yearly'
    name: string
  }
): Promise<{ success: boolean; subscriptionId?: string; errorMessage?: string }> => {
  try {
    console.log('Creating recurring subscription:', {
      planId: subscriptionData.planId,
      userId: subscriptionData.userId,
      planDetails
    })

    // In a real implementation, this would:
    // 1. Create a customer profile in Authorize.net CIM
    // 2. Create a payment profile for the customer
    // 3. Create a recurring subscription using ARB
    // 4. Return the subscription ID

    // Simulate subscription creation
    await new Promise(resolve => setTimeout(resolve, 2000))

    return {
      success: true,
      subscriptionId: 'sub_recurring_' + Math.random().toString(36).substr(2, 9)
    }
  } catch (error) {
    console.error('Recurring subscription creation error:', error)
    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Subscription creation failed'
    }
  }
}

/**
 * Cancel a recurring subscription
 */
export const cancelRecurringSubscription = async (
  subscriptionId: string
): Promise<{ success: boolean; errorMessage?: string }> => {
  try {
    console.log('Canceling recurring subscription:', subscriptionId)

    // In a real implementation, this would call Authorize.net ARB API
    // to cancel the subscription

    // Simulate cancellation
    await new Promise(resolve => setTimeout(resolve, 1000))

    return { success: true }
  } catch (error) {
    console.error('Subscription cancellation error:', error)
    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Subscription cancellation failed'
    }
  }
}

/**
 * Validate payment data before processing
 */
export const validatePaymentData = (paymentData: PaymentData): { isValid: boolean; errors: string[] } => {
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

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Get card type from card number
 */
export const getCardType = (cardNumber: string): string => {
  const number = cardNumber.replace(/\s/g, '')
  
  if (number.startsWith('4')) return 'Visa'
  if (number.startsWith('5') || (number.startsWith('2') && parseInt(number.substring(0, 4)) >= 2221 && parseInt(number.substring(0, 4)) <= 2720)) return 'Mastercard'
  if (number.startsWith('34') || number.startsWith('37')) return 'American Express'
  if (number.startsWith('6011') || number.startsWith('65') || (number.startsWith('644') || number.startsWith('645') || number.startsWith('646') || number.startsWith('647') || number.startsWith('648') || number.startsWith('649'))) return 'Discover'
  
  return 'Unknown'
}

/**
 * Format currency amount for display
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

/**
 * Calculate tax amount (if applicable)
 */
export const calculateTax = (amount: number, taxRate: number = 0): number => {
  return Math.round(amount * taxRate * 100) / 100
}

/**
 * Get payment method display name
 */
export const getPaymentMethodDisplay = (last4: string, cardType: string): string => {
  return `${cardType} •••• ${last4}`
}

// Webhook handler for Authorize.net notifications
export const handleAuthorizeNetWebhook = async (webhookData: Record<string, unknown>) => {
  try {
    console.log('Processing Authorize.net webhook:', webhookData)

    // In a real implementation, this would:
    // 1. Verify the webhook signature
    // 2. Process the webhook event (payment success, failure, subscription updates, etc.)
    // 3. Update the database accordingly
    // 4. Send notifications to users if needed

    // Example webhook events:
    // - net.authorize.payment.authcapture.created
    // - net.authorize.payment.capture.created
    // - net.authorize.payment.fraud.approved
    // - net.authorize.payment.fraud.declined
    // - net.authorize.payment.void.created
    // - net.authorize.customer.subscription.created
    // - net.authorize.customer.subscription.cancelled

    return { success: true }
  } catch (error) {
    console.error('Webhook processing error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Webhook processing failed' }
  }
}