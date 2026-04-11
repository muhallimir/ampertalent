/**
 * Client-safe checkout URL generation
 * This file can be imported on the client-side without causing environment variable errors
 */

export interface CheckoutUrlParams {
  planId: string
  pendingSignupId: string
  sessionToken: string
  returnUrl: string
  userInfo?: {
    firstName?: string
    lastName?: string
    email?: string
    name?: string
  }
}

/**
 * Generate checkout URL on client-side by calling server API
 */
export async function generateCheckoutUrl(params: CheckoutUrlParams): Promise<string> {
  try {
    console.log('🔍 CLIENT-CHECKOUT: Generating checkout URL with params:', params)
    
    const response = await fetch('/api/checkout/generate-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('🚨 CLIENT-CHECKOUT: Server error response:', errorText)
      throw new Error(`Failed to generate checkout URL: ${response.statusText}`)
    }

    const { checkoutUrl } = await response.json()
    console.log('✅ CLIENT-CHECKOUT: Generated checkout URL:', checkoutUrl)
    return checkoutUrl
  } catch (error) {
    console.error('❌ CLIENT-CHECKOUT: Error generating checkout URL:', error)
    throw new Error('Failed to generate checkout URL')
  }
}