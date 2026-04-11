import { db } from '@/lib/db'
import { processOneTimePayment, getAuthorizeNetClient } from '@/lib/authorize-net'

// Enhanced helper function to save payment method from transaction with retry logic and better error handling
export async function savePaymentMethodFromTransaction({
  userId,
  userType,
  paymentResult,
  billingInfo,
  opaqueDataDescriptor,
  opaqueDataValue,
  isTrial = false,
  expiryMonth,
  expiryYear
}: {
  userId: string
  userType: string
  paymentResult: any
  billingInfo?: any
  opaqueDataDescriptor: string
  opaqueDataValue: string
  isTrial?: boolean
  expiryMonth?: number
  expiryYear?: number
}): Promise<{ id: string } | null> {
  const maxRetries = 3
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔍 SAVE-PAYMENT-METHOD: Starting payment method save process (attempt ${attempt}/${maxRetries})`, {
        isTrial,
        userType,
        userId: userId.substring(0, 8) + '...'
      })

      // Get user profile with enhanced retry logic for trials
      const maxProfileRetries = isTrial ? 5 : 2 // More retries for trials
      const userProfile = await retryOperation(async () => {
        console.log(`🔍 SAVE-PAYMENT-METHOD: Looking up user profile (attempt)`)
        const profile = await db.userProfile.findUnique({
          where: { clerkUserId: userId },
          include: {
            jobSeeker: true,
            employer: true
          }
        })

        if (!profile) {
          console.log(`⚠️ SAVE-PAYMENT-METHOD: User profile not found, will retry...`)
          throw new Error('User profile not found - may still be creating')
        }

        console.log(`✅ SAVE-PAYMENT-METHOD: User profile found:`, {
          profileId: profile.id,
          hasJobSeeker: !!profile.jobSeeker,
          hasEmployer: !!profile.employer,
          createdAt: profile.createdAt
        })

        return profile
      }, maxProfileRetries, 2000) // 2 second base delay, longer for database operations

      if (!userProfile) {
        throw new Error('User profile not found after payment processing')
      }

      // Extract payment method details from Authorize.net response
      let accountNumber, last4, cardType, validationTransactionId = null

      if (isTrial) {
        // For trial payments, we'll get card details from the payment profile after creation
        console.log('🔍 SAVE-PAYMENT-METHOD: Processing trial payment method - will get real card details from profile')

        // We'll get the real card details after creating the payment profile
        accountNumber = 'XXXX' // Temporary - will be updated below
        last4 = '0000' // Temporary - will be updated below
        cardType = 'Card' // Temporary - will be updated below
      } else {
        // For regular payments, extract from the actual payment result
        accountNumber = paymentResult.accountNumber || 'XXXX'
        last4 = accountNumber.slice(-4)
        cardType = paymentResult.accountType || 'Unknown'
        console.log('🔍 SAVE-PAYMENT-METHOD: Extracted payment details from transaction:', {
          last4,
          cardType,
          hasAccountNumber: !!paymentResult.accountNumber
        })
      }

      // Create Authorize.net customer profile with retry logic
      const client = getAuthorizeNetClient()
      const merchantCustomerId = `${userType}-${userProfile.id}`.substring(0, 20) // Limit to 20 chars

      console.log('🔍 SAVE-PAYMENT-METHOD: Creating/getting customer profile:', merchantCustomerId)

      let customerProfileId: string

      // Try to get existing customer profile first
      const customerProfileResult = await retryOperation(async () => {
        return await client.getCustomerProfile(merchantCustomerId)
      }, 2)

      if (customerProfileResult.success && customerProfileResult.profile) {
        customerProfileId = customerProfileResult.profile.customerProfileId
        console.log('✅ SAVE-PAYMENT-METHOD: Found existing customer profile:', customerProfileId)
      } else {
        // Create new customer profile with retry logic
        console.log('🔍 SAVE-PAYMENT-METHOD: Creating new customer profile')
        const createProfileResult = await retryOperation(async () => {
          return await client.createCustomerProfile({
            merchantCustomerId,
            email: userProfile.email || '',
            description: `${userType} - ${userProfile.name}`
          })
        }, 2)

        if (!createProfileResult.success) {
          throw new Error('Failed to create customer profile: ' + (createProfileResult.errors?.join(', ') || 'Unknown error'))
        }

        customerProfileId = createProfileResult.customerProfileId!
        console.log('✅ SAVE-PAYMENT-METHOD: Created new customer profile:', customerProfileId)
      }

      // Handle OTS token limitation - tokens can only be used once
      console.log('🔍 SAVE-PAYMENT-METHOD: Handling OTS token limitation')
      console.log('⚠️ SAVE-PAYMENT-METHOD: OTS token was consumed during payment, cannot create payment profile for future use')
      console.log('💡 SAVE-PAYMENT-METHOD: This is a known limitation of Accept.js OTS tokens')
      console.log('🔧 SAVE-PAYMENT-METHOD: To save payment methods, consider implementing Accept Hosted or creating payment profiles before processing payments')

      // Payment was successful, but we cannot save the payment method due to OTS token limitation
      // This is expected behavior and not an error
      return null

      // If we get here, no payment profile was created - this is expected for OTS tokens
      console.log('🔍 SAVE-PAYMENT-METHOD: No payment profile available, returning null')
      return null


    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error')
      console.error(`❌ SAVE-PAYMENT-METHOD: Attempt ${attempt}/${maxRetries} failed:`, {
        error: lastError.message,
      })

      if (attempt === maxRetries) {
        console.error('❌ SAVE-PAYMENT-METHOD: All retry attempts exhausted')
        throw lastError
      }

      // Wait before retrying (exponential backoff)
      const delay = Math.pow(2, attempt) * 1000 // 2s, 4s, 8s
      console.log(`⏳ SAVE-PAYMENT-METHOD: Waiting ${delay}ms before retry...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError || new Error('Payment method saving failed after all retries')
}

// Helper function to retry operations with exponential backoff
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error')

      if (attempt === maxRetries) {
        throw lastError
      }

      const delay = baseDelay * Math.pow(2, attempt - 1)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError || new Error('Operation failed after all retries')
}