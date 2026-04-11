/**
 * Authorize.net API Integration
 * Handles payment processing, billing history, and transaction data retrieval
 */

interface AuthorizeNetConfig {
  apiLoginId: string
  transactionKey: string
  environment: 'sandbox' | 'production'
  clientKey?: string
}

interface PaymentProfile {
  customerProfileId: string
  customerPaymentProfileId: string
  payment: {
    creditCard?: {
      cardNumber: string
      expirationDate: string
      cardCode?: string
    }
    opaqueData?: {
      dataDescriptor: string
      dataValue: string
    }
  }
  billTo?: {
    firstName: string
    lastName: string
    company?: string
    address?: string
    city?: string
    state?: string
    zip?: string
    country?: string
    phoneNumber?: string
    faxNumber?: string
  }
}

interface CustomerProfile {
  merchantCustomerId: string
  description?: string
  email: string
  customerProfileId?: string
  paymentProfiles?: PaymentProfile[]
}

interface TransactionRequest {
  transactionType: 'authCaptureTransaction' | 'authOnlyTransaction' | 'captureOnlyTransaction'
  amount: string
  payment?: {
    creditCard?: {
      cardNumber: string
      expirationDate: string
      cardCode?: string
    }
    opaqueData?: {
      dataDescriptor: string
      dataValue: string
    }
  }
  profile?: {
    customerProfileId: string
    paymentProfile?: {
      paymentProfileId: string
    }
  }
  order?: {
    invoiceNumber?: string
    description?: string
  }
  lineItems?: Array<{
    itemId: string
    name: string
    description: string
    quantity: string
    unitPrice: string
  }>
  tax?: {
    amount: string
    name: string
    description: string
  }
  duty?: {
    amount: string
    name: string
    description: string
  }
  shipping?: {
    amount: string
    name: string
    description: string
  }
  billTo?: {
    firstName: string
    lastName: string
    company?: string
    address?: string
    city?: string
    state?: string
    zip?: string
    country?: string
    phoneNumber?: string
    faxNumber?: string
  }
  shipTo?: {
    firstName: string
    lastName: string
    company?: string
    address?: string
    city?: string
    state?: string
    zip?: string
    country?: string
    phoneNumber?: string
    faxNumber?: string
  }
  customer?: {
    id?: string
    email?: string
  }
  customerIP?: string
}

interface SubscriptionRequest {
  name: string
  paymentSchedule: {
    interval: {
      length: number
      unit: 'days' | 'months'
    }
    startDate: string
    totalOccurrences?: number
    trialOccurrences?: number
  }
  amount: string
  trialAmount?: string
  payment: {
    creditCard?: {
      cardNumber: string
      expirationDate: string
      cardCode?: string
    }
    opaqueData?: {
      dataDescriptor: string
      dataValue: string
    }
  }
  order?: {
    invoiceNumber?: string
    description?: string
  }
  customer?: {
    id?: string
    email?: string
    phoneNumber?: string
    faxNumber?: string
  }
  billTo?: {
    firstName: string
    lastName: string
    company?: string
    address: string
    city: string
    state: string
    zip: string
    country?: string
  }
  shipTo?: {
    firstName: string
    lastName: string
    company?: string
    address: string
    city: string
    state: string
    zip: string
    country?: string
  }
}

interface PaymentResult {
  success: boolean
  transactionId?: string
  authCode?: string
  responseCode?: string
  responseReasonCode?: string
  responseReasonText?: string
  avsResultCode?: string
  cvvResultCode?: string
  cavvResultCode?: string
  transHashSha2?: string
  accountNumber?: string
  accountType?: string
  messages?: Array<{
    code: string
    description: string
  }>
  errors?: Array<{
    errorCode: string
    errorText: string
  }>
}

interface SubscriptionResult {
  success: boolean
  subscriptionId?: string
  messages?: Array<{
    code: string
    description: string
  }>
  errors?: Array<{
    errorCode: string
    errorText: string
  }>
}

interface AuthorizeNetTransaction {
  transId: string
  submitTimeUTC: string
  transactionType: string
  transactionStatus: string
  responseCode: string
  responseReasonCode: string
  responseReasonDescription: string
  authCode: string
  AVSResponse: string
  cardCodeResponse: string
  batch: {
    batchId: string
    settlementTimeUTC: string
    settlementState: string
  }
  order: {
    invoiceNumber: string
    description: string
  }
  requestedAmount: string
  authAmount: string
  settleAmount: string
  tax?: {
    amount: string
    name: string
    description: string
  }
  shipping?: {
    amount: string
    name: string
    description: string
  }
  duty?: {
    amount: string
    name: string
    description: string
  }
  lineItems?: Array<{
    itemId: string
    name: string
    description: string
    quantity: string
    unitPrice: string
  }>
  prepaidBalanceRemaining?: string
  taxExempt: boolean
  payment: {
    creditCard?: {
      cardNumber: string
      expirationDate: string
      cardType: string
    }
    bankAccount?: {
      accountType: string
      routingNumber: string
      accountNumber: string
      nameOnAccount: string
      echeckType: string
      bankName: string
    }
  }
  customer?: {
    type: string
    id: string
    email: string
  }
  billTo?: {
    phoneNumber: string
    faxNumber: string
    firstName: string
    lastName: string
    company: string
    address: string
    city: string
    state: string
    zip: string
    country: string
  }
  shipTo?: {
    phoneNumber: string
    faxNumber: string
    firstName: string
    lastName: string
    company: string
    address: string
    city: string
    state: string
    zip: string
    country: string
  }
  recurringBilling: boolean
  customerIP: string
  product: string
  marketType: string
}

interface AuthorizeNetBillingHistory {
  transactions: AuthorizeNetTransaction[]
  totalNumInResultSet: number
  messages: {
    resultCode: string
    message: Array<{
      code: string
      text: string
    }>
  }
}

class AuthorizeNetClient {
  private config: AuthorizeNetConfig
  private baseUrl: string

  constructor(config: AuthorizeNetConfig) {
    this.config = config
    this.baseUrl = config.environment === 'production' 
      ? 'https://api.authorize.net/xml/v1/request.api'
      : 'https://apitest.authorize.net/xml/v1/request.api'
  }

  /**
   * Get transaction list for a customer
   */
  async getCustomerTransactionList(
    customerId: string,
    options: {
      batchId?: string
      sorting?: {
        orderBy: 'id' | 'submitTimeUTC'
        orderDescending: boolean
      }
      paging?: {
        limit: number
        offset: number
      }
    } = {}
  ): Promise<AuthorizeNetBillingHistory> {
    const requestBody = {
      getTransactionListForCustomerRequest: {
        merchantAuthentication: {
          name: this.config.apiLoginId,
          transactionKey: this.config.transactionKey
        },
        customerProfileId: customerId,
        ...(options.sorting && {
          sorting: {
            orderBy: options.sorting.orderBy,
            orderDescending: options.sorting.orderDescending
          }
        }),
        ...(options.paging && {
          paging: {
            limit: options.paging.limit,
            offset: options.paging.offset
          }
        })
      }
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error(`Authorize.net API error: ${response.status}`)
      }

      const data = await response.json()
      return this.parseTransactionListResponse(data)
    } catch (error) {
      console.error('Error fetching customer transaction list:', error)
      throw error
    }
  }

  /**
   * Get transaction details by transaction ID
   */
  async getTransactionDetails(transactionId: string): Promise<AuthorizeNetTransaction> {
    const requestBody = {
      getTransactionDetailsRequest: {
        merchantAuthentication: {
          name: this.config.apiLoginId,
          transactionKey: this.config.transactionKey
        },
        transId: transactionId
      }
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error(`Authorize.net API error: ${response.status}`)
      }

      const data = await response.json()
      console.log(`🔍 getTransactionDetails raw response for ${transactionId}:`, JSON.stringify(data).substring(0, 500))
      return this.parseTransactionDetailsResponse(data)
    } catch (error) {
      console.error(`Error fetching transaction details for ${transactionId}:`, error)
      throw error
    }
  }

  /**
   * Get settled batch list
   */
  async getSettledBatchList(
    includeStatistics: boolean = false,
    firstSettlementDate?: string,
    lastSettlementDate?: string
  ): Promise<any> {
    const requestBody = {
      getSettledBatchListRequest: {
        merchantAuthentication: {
          name: this.config.apiLoginId,
          transactionKey: this.config.transactionKey
        },
        includeStatistics,
        ...(firstSettlementDate && { firstSettlementDate }),
        ...(lastSettlementDate && { lastSettlementDate })
      }
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error(`Authorize.net API error: ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error fetching settled batch list:', error)
      throw error
    }
  }

  /**
   * Get unsettled (pending) transactions
   */
  async getUnsettledTransactionList(): Promise<AuthorizeNetBillingHistory> {
    const requestBody = {
      getUnsettledTransactionListRequest: {
        merchantAuthentication: {
          name: this.config.apiLoginId,
          transactionKey: this.config.transactionKey
        },
        sorting: {
          orderBy: 'submitTimeUTC',
          orderDescending: true
        }
      }
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error(`Authorize.net API error: ${response.status}`)
      }

      const data = await response.json()
      return this.parseTransactionListResponse(data)
    } catch (error) {
      console.error('Error fetching unsettled transactions:', error)
      throw error
    }
  }

  /**
   * Search transactions by amount within a date range (searches settled batches + unsettled)
   */
  async findTransactionByAmountAndDate(
    amount: number,
    dateUTC: string // ISO date string — searches batches ±1 day
  ): Promise<{ transId: string; submitTimeUTC: string; transactionStatus: string; settleAmount: string }[]> {
    const target = new Date(dateUTC)
    const from = new Date(target)
    from.setDate(from.getDate() - 1)
    const to = new Date(target)
    to.setDate(to.getDate() + 1)

    const amountStr = amount.toFixed(2)
    const results: { transId: string; submitTimeUTC: string; transactionStatus: string; settleAmount: string }[] = []

    // Check unsettled transactions first
    try {
      const unsettled = await this.getUnsettledTransactionList()
      for (const tx of unsettled.transactions) {
        if (tx.settleAmount === amountStr || tx.requestedAmount === amountStr || tx.authAmount === amountStr) {
          const txDate = new Date(tx.submitTimeUTC)
          if (txDate >= from && txDate <= to) {
            results.push({
              transId: tx.transId,
              submitTimeUTC: tx.submitTimeUTC,
              transactionStatus: tx.transactionStatus,
              settleAmount: tx.settleAmount || tx.authAmount || amountStr,
            })
          }
        }
      }
    } catch { /* ignore */ }

    // Check settled batches
    try {
      const batchListRaw = await this.getSettledBatchList(false, from.toISOString(), to.toISOString())
      const batches: any[] = batchListRaw?.getSettledBatchListResponse?.batchList?.batch
        ?? batchListRaw?.batchList?.batch
        ?? []
      const batchArray = Array.isArray(batches) ? batches : [batches]
      for (const batch of batchArray) {
        try {
          const batchTx = await this.getTransactionListForBatch(batch.batchId)
          for (const tx of batchTx.transactions) {
            if (tx.settleAmount === amountStr || tx.requestedAmount === amountStr || tx.authAmount === amountStr) {
              const txDate = new Date(tx.submitTimeUTC)
              if (txDate >= from && txDate <= to) {
                results.push({
                  transId: tx.transId,
                  submitTimeUTC: tx.submitTimeUTC,
                  transactionStatus: tx.transactionStatus,
                  settleAmount: tx.settleAmount || tx.authAmount || amountStr,
                })
              }
            }
          }
        } catch { /* ignore individual batch errors */ }
      }
    } catch { /* ignore */ }

    return results
  }

  /**
   * Get transaction list for a specific settled batch
   */
  async getTransactionListForBatch(
    batchId: string,
    paging?: { limit: number; offset: number }
  ): Promise<AuthorizeNetBillingHistory> {
    const requestBody = {
      getTransactionListRequest: {
        merchantAuthentication: {
          name: this.config.apiLoginId,
          transactionKey: this.config.transactionKey
        },
        batchId,
        ...(paging && {
          paging: {
            limit: paging.limit,
            offset: paging.offset
          }
        }),
        sorting: {
          orderBy: 'submitTimeUTC',
          orderDescending: true
        }
      }
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error(`Authorize.net API error: ${response.status}`)
      }

      const data = await response.json()
      return this.parseTransactionListResponse(data)
    } catch (error) {
      console.error(`Error fetching transaction list for batch ${batchId}:`, error)
      throw error
    }
  }

  /**
   * Create a customer profile
   */
  async createCustomerProfile(customerProfile: CustomerProfile): Promise<{ success: boolean; customerProfileId?: string; errors?: any[] }> {
    const requestBody = {
      createCustomerProfileRequest: {
        merchantAuthentication: {
          name: this.config.apiLoginId,
          transactionKey: this.config.transactionKey
        },
        profile: {
          merchantCustomerId: customerProfile.merchantCustomerId,
          description: customerProfile.description,
          email: customerProfile.email,
          paymentProfiles: customerProfile.paymentProfiles
        }
      }
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error(`Authorize.net API error: ${response.status}`)
      }

      const data = await response.json()
      console.log('🔍 Raw Authorize.net response:', JSON.stringify(data, null, 2))
      
      // Handle direct error response (when API returns error at top level)
      if (data.messages && data.messages.resultCode === 'Error') {
        console.error('❌ Authorize.net API error:', data.messages.message)
        return {
          success: false,
          errors: data.messages.message || [{ code: 'UNKNOWN', text: 'Unknown error from Authorize.net' }]
        }
      }
      
      // Check if response has the expected structure (direct response format)
      if (data.customerProfileId && data.messages) {
        if (data.messages.resultCode === 'Ok') {
          console.log('✅ Customer profile created successfully:', data.customerProfileId)
          return {
            success: true,
            customerProfileId: data.customerProfileId
          }
        } else {
          return {
            success: false,
            errors: data.messages.message || [{ code: 'UNKNOWN', text: 'Unknown error from Authorize.net' }]
          }
        }
      }
      
      // Fallback: try wrapped response format
      const result = data.createCustomerProfileResponse
      if (result) {
        if (!result.messages) {
          console.error('❌ No messages in wrapped response:', result)
          return {
            success: false,
            errors: [{ code: 'INVALID_RESPONSE', text: 'Missing messages in Authorize.net response' }]
          }
        }

        if (result.messages.resultCode === 'Ok') {
          return {
            success: true,
            customerProfileId: result.customerProfileId
          }
        } else {
          return {
            success: false,
            errors: result.messages.message || [{ code: 'UNKNOWN', text: 'Unknown error from Authorize.net' }]
          }
        }
      }

      // If we get here, the response format is unexpected
      console.error('❌ Unexpected response format from Authorize.net:', data)
      return {
        success: false,
        errors: [{ code: 'INVALID_RESPONSE', text: 'Unexpected response format from Authorize.net' }]
      }
    } catch (error) {
      console.error('Error creating customer profile:', error)
      return {
        success: false,
        errors: [{ code: 'NETWORK_ERROR', text: error instanceof Error ? error.message : 'Network error' }]
      }
    }
  }

  /**
   * Create a customer payment profile
   */
  async createCustomerPaymentProfile(params: {
    customerProfileId: string
    paymentProfile: {
      billTo?: {
        firstName: string
        lastName: string
        company?: string
        address?: string
        city?: string
        state?: string
        zip?: string
        country?: string
        phoneNumber?: string
        faxNumber?: string
      }
      payment: {
        creditCard?: {
          cardNumber: string
          expirationDate: string
          cardCode?: string
        }
        opaqueData?: {
          dataDescriptor: string
          dataValue: string
        }
      }
    }
  }): Promise<{ success: boolean; customerPaymentProfileId?: string; errors?: any[] }> {
    const requestBody = {
      createCustomerPaymentProfileRequest: {
        merchantAuthentication: {
          name: this.config.apiLoginId,
          transactionKey: this.config.transactionKey
        },
        customerProfileId: params.customerProfileId,
        paymentProfile: params.paymentProfile
      }
    }

    try {
      console.log('💳 createCustomerPaymentProfile request:', {
        customerProfileId: params.customerProfileId,
        hasBillTo: !!params.paymentProfile.billTo,
        billTo: params.paymentProfile.billTo ? {
          firstName: params.paymentProfile.billTo.firstName,
          lastName: params.paymentProfile.billTo.lastName,
          company: params.paymentProfile.billTo.company,
        } : 'none',
        paymentType: params.paymentProfile.payment.opaqueData ? 'opaqueData' : 'creditCard',
      })

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error(`Authorize.net API error: ${response.status}`)
      }

      const data = await response.json()
      console.log('🔍 Raw payment profile response:', JSON.stringify(data, null, 2))
      
      // Check if response has the expected structure (direct response format)
      if (data.messages) {
        if (data.messages.resultCode === 'Ok') {
          console.log('✅ Payment profile created successfully:', data.customerPaymentProfileId)
          return {
            success: true,
            customerPaymentProfileId: data.customerPaymentProfileId
          }
        } else {
          // Even on error, the response might contain the customerPaymentProfileId (for duplicates)
          console.error('❌ Authorize.net payment profile API error:', data.messages.message)
          return {
            success: false,
            customerPaymentProfileId: data.customerPaymentProfileId, // Include this even on error
            errors: data.messages.message || [{ code: 'UNKNOWN', text: 'Unknown error from Authorize.net' }]
          }
        }
      }
      
      // Fallback: try wrapped response format
      const result = data.createCustomerPaymentProfileResponse
      if (result) {
        if (!result.messages) {
          console.error('❌ No messages in wrapped payment profile response:', result)
          return {
            success: false,
            errors: [{ code: 'INVALID_RESPONSE', text: 'Missing messages in Authorize.net response' }]
          }
        }

        if (result.messages.resultCode === 'Ok') {
          return {
            success: true,
            customerPaymentProfileId: result.customerPaymentProfileId
          }
        } else {
          return {
            success: false,
            errors: result.messages.message || [{ code: 'UNKNOWN', text: 'Unknown error from Authorize.net' }]
          }
        }
      }

      // If we get here, the response format is unexpected
      console.error('❌ Unexpected payment profile response format from Authorize.net:', data)
      return {
        success: false,
        errors: [{ code: 'INVALID_RESPONSE', text: 'Unexpected response format from Authorize.net' }]
      }
    } catch (error) {
      console.error('Error creating customer payment profile:', error)
      return {
        success: false,
        errors: [{ code: 'NETWORK_ERROR', text: error instanceof Error ? error.message : 'Network error' }]
      }
    }
  }

  /**
   * Get customer profile by merchant customer ID
   */
  async getCustomerProfile(merchantCustomerId: string): Promise<{ success: boolean; profile?: any; errors?: any[] }> {
    const requestBody = {
      getCustomerProfileRequest: {
        merchantAuthentication: {
          name: this.config.apiLoginId,
          transactionKey: this.config.transactionKey
        },
        merchantCustomerId
      }
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error(`Authorize.net API error: ${response.status}`)
      }

      const data = await response.json()
      console.log('🔍 Raw get customer profile response:', JSON.stringify(data, null, 2))
      
      // Check if response has the expected structure (direct response format)
      if (data.messages) {
        if (data.messages.resultCode === 'Ok') {
          console.log('✅ Customer profile found:', data.profile?.customerProfileId)
          return {
            success: true,
            profile: data.profile
          }
        } else {
          console.error('❌ Authorize.net get customer profile error:', data.messages.message)
          return {
            success: false,
            errors: data.messages.message || [{ code: 'UNKNOWN', text: 'Unknown error from Authorize.net' }]
          }
        }
      }
      
      // Fallback: try wrapped response format
      const result = data.getCustomerProfileResponse
      if (result) {
        if (!result.messages) {
          console.error('❌ No messages in wrapped get customer profile response:', result)
          return {
            success: false,
            errors: [{ code: 'INVALID_RESPONSE', text: 'Missing messages in Authorize.net response' }]
          }
        }

        if (result.messages.resultCode === 'Ok') {
          return {
            success: true,
            profile: result.profile
          }
        } else {
          return {
            success: false,
            errors: result.messages.message || [{ code: 'UNKNOWN', text: 'Unknown error from Authorize.net' }]
          }
        }
      }

      // If we get here, the response format is unexpected
      console.error('❌ Unexpected get customer profile response format from Authorize.net:', data)
      return {
        success: false,
        errors: [{ code: 'INVALID_RESPONSE', text: 'Unexpected response format from Authorize.net' }]
      }
    } catch (error) {
      console.error('Error getting customer profile:', error)
      return {
        success: false,
        errors: [{ code: 'NETWORK_ERROR', text: error instanceof Error ? error.message : 'Network error' }]
      }
    }
  }

  /**
   * Get customer payment profile
   */
  async getCustomerPaymentProfile(customerProfileId: string, customerPaymentProfileId: string): Promise<{ success: boolean; paymentProfile?: any; errors?: any[] }> {
    const requestBody = {
      getCustomerPaymentProfileRequest: {
        merchantAuthentication: {
          name: this.config.apiLoginId,
          transactionKey: this.config.transactionKey
        },
        customerProfileId,
        customerPaymentProfileId
      }
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error(`Authorize.net API error: ${response.status}`)
      }

      const data = await response.json()
      console.log('🔍 Raw get payment profile response:', JSON.stringify(data, null, 2))
      
      // Check if response has the expected structure (direct response format)
      if (data.messages) {
        if (data.messages.resultCode === 'Ok') {
          console.log('✅ Payment profile found:', customerPaymentProfileId)
          return {
            success: true,
            paymentProfile: data.paymentProfile
          }
        } else {
          console.error('❌ Authorize.net get payment profile error:', data.messages.message)
          return {
            success: false,
            errors: data.messages.message || [{ code: 'UNKNOWN', text: 'Unknown error from Authorize.net' }]
          }
        }
      }
      
      // Fallback: try wrapped response format
      const result = data.getCustomerPaymentProfileResponse
      if (result) {
        if (!result.messages) {
          console.error('❌ No messages in wrapped get payment profile response:', result)
          return {
            success: false,
            errors: [{ code: 'INVALID_RESPONSE', text: 'Missing messages in Authorize.net response' }]
          }
        }

        if (result.messages.resultCode === 'Ok') {
          return {
            success: true,
            paymentProfile: result.paymentProfile
          }
        } else {
          return {
            success: false,
            errors: result.messages.message || [{ code: 'UNKNOWN', text: 'Unknown error from Authorize.net' }]
          }
        }
      }

      // If we get here, the response format is unexpected
      console.error('❌ Unexpected get payment profile response format from Authorize.net:', data)
      return {
        success: false,
        errors: [{ code: 'INVALID_RESPONSE', text: 'Unexpected response format from Authorize.net' }]
      }
    } catch (error) {
      console.error('Error getting customer payment profile:', error)
      return {
        success: false,
        errors: [{ code: 'NETWORK_ERROR', text: error instanceof Error ? error.message : 'Network error' }]
      }
    }
  }

  /**
   * Delete customer payment profile
   */
  async deleteCustomerPaymentProfile(customerProfileId: string, customerPaymentProfileId: string): Promise<{ success: boolean; errors?: any[] }> {
    const requestBody = {
      deleteCustomerPaymentProfileRequest: {
        merchantAuthentication: {
          name: this.config.apiLoginId,
          transactionKey: this.config.transactionKey
        },
        customerProfileId,
        customerPaymentProfileId
      }
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error(`Authorize.net API error: ${response.status}`)
      }

      const data = await response.json()
      console.log('🔍 Raw delete payment profile response:', JSON.stringify(data, null, 2))
      
      // Check if response has the expected structure (direct response format)
      if (data.messages) {
        if (data.messages.resultCode === 'Ok') {
          console.log('✅ Payment profile deleted:', customerPaymentProfileId)
          return { success: true }
        } else {
          console.error('❌ Authorize.net delete payment profile error:', data.messages.message)
          return {
            success: false,
            errors: data.messages.message || [{ code: 'UNKNOWN', text: 'Unknown error from Authorize.net' }]
          }
        }
      }
      
      // Fallback: try wrapped response format
      const result = data.deleteCustomerPaymentProfileResponse
      if (result) {
        if (!result.messages) {
          console.error('❌ No messages in wrapped delete payment profile response:', result)
          return {
            success: false,
            errors: [{ code: 'INVALID_RESPONSE', text: 'Missing messages in Authorize.net response' }]
          }
        }

        if (result.messages.resultCode === 'Ok') {
          return { success: true }
        } else {
          return {
            success: false,
            errors: result.messages.message || [{ code: 'UNKNOWN', text: 'Unknown error from Authorize.net' }]
          }
        }
      }

      // If we get here, the response format is unexpected
      console.error('❌ Unexpected delete payment profile response format from Authorize.net:', data)
      return {
        success: false,
        errors: [{ code: 'INVALID_RESPONSE', text: 'Unexpected response format from Authorize.net' }]
      }
    } catch (error) {
      console.error('Error deleting customer payment profile:', error)
      return {
        success: false,
        errors: [{ code: 'NETWORK_ERROR', text: error instanceof Error ? error.message : 'Network error' }]
      }
    }
  }

  /**
   * Update billing info (firstName, lastName) on a customer payment profile.
   * This makes the name appear in AuthNet transaction reports for profile-based charges.
   * AuthNet requires payment info when updating a profile, so we first fetch the existing
   * profile to get the masked card number and send it back unchanged.
   */
  async updatePaymentProfileBilling(
    customerProfileId: string,
    paymentProfileId: string,
    billing: { firstName?: string; lastName?: string; email?: string }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Step 1: Fetch current payment profile to get masked card data
      const profileResult = await this.getCustomerPaymentProfile(customerProfileId, paymentProfileId)
      if (!profileResult.success || !profileResult.paymentProfile) {
        console.warn(`⚠️ Could not fetch payment profile ${paymentProfileId} for billing update`)
        return { success: false, error: 'Could not fetch existing payment profile' }
      }

      const existingPayment = profileResult.paymentProfile.payment
      if (!existingPayment?.creditCard) {
        console.warn(`⚠️ Payment profile ${paymentProfileId} has no credit card data to preserve`)
        return { success: false, error: 'No credit card data on profile' }
      }

      // Step 2: Update profile with billTo + existing masked payment data
      const requestBody = {
        updateCustomerPaymentProfileRequest: {
          merchantAuthentication: {
            name: this.config.apiLoginId,
            transactionKey: this.config.transactionKey
          },
          customerProfileId,
          paymentProfile: {
            billTo: {
              firstName: billing.firstName || '',
              lastName: billing.lastName || '',
            },
            payment: {
              creditCard: {
                cardNumber: existingPayment.creditCard.cardNumber,
                expirationDate: existingPayment.creditCard.expirationDate,
              }
            },
            customerPaymentProfileId: paymentProfileId
          },
          validationMode: 'none'
        }
      }

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        console.error(`❌ AuthNet updatePaymentProfile HTTP error: ${response.status}`)
        return { success: false, error: `HTTP ${response.status}` }
      }

      const data = await response.json()
      console.log(`🔍 AuthNet updatePaymentProfile raw response:`, JSON.stringify(data).substring(0, 500))

      // AuthNet may wrap the response differently
      const result = data.updateCustomerPaymentProfileResponse || data
      const messages = result?.messages
      if (messages?.resultCode === 'Ok') {
        console.log(`✅ Updated billing info on payment profile ${paymentProfileId}: ${billing.firstName} ${billing.lastName}`)
        return { success: true }
      }

      const errorMsg = messages?.message?.[0]?.text || JSON.stringify(data).substring(0, 200)
      console.warn(`⚠️ Could not update billing info on profile ${paymentProfileId}: ${errorMsg}`)
      return { success: false, error: errorMsg }
    } catch (error) {
      console.error('Error updating payment profile billing:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Network error' }
    }
  }

  /**
   * Process a payment transaction
   */
  async createTransaction(transactionRequest: TransactionRequest): Promise<PaymentResult> {
    const requestBody = {
      createTransactionRequest: {
        merchantAuthentication: {
          name: this.config.apiLoginId,
          transactionKey: this.config.transactionKey
        },
        transactionRequest
      }
    }

    try {
      console.log('🔍 Sending transaction request to Authorize.net:', {
        url: this.baseUrl,
        transactionType: transactionRequest.transactionType,
        amount: transactionRequest.amount,
        hasProfile: !!transactionRequest.profile,
        hasPayment: !!transactionRequest.payment,
        order: transactionRequest.order
      });

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      console.log('🔍 Authorize.net response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Authorize.net API error (${response.status}):`, errorText);
        throw new Error(`Authorize.net API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('🔍 Authorize.net response data received');
      return this.parseTransactionResponse(data);
    } catch (error) {
      console.error('❌ Error creating transaction:', error);
      return {
        success: false,
        errors: [{ errorCode: 'NETWORK_ERROR', errorText: error instanceof Error ? error.message : 'Network error' }]
      }
    }
  }

  /**
   * Refund or void a transaction.
   * - Settled transactions are refunded (requires last 4 digits of the card).
   * - Unsettled transactions are voided instead.
   * Automatically checks transaction status and picks the right action.
   */
  async refundTransaction(transactionId: string, amount: string, lastFour?: string): Promise<PaymentResult> {
    // First, check the transaction status to decide refund vs void
    let transactionStatus = ''
    let cardLast4 = lastFour
    try {
      const txDetails = await this.getTransactionDetails(transactionId)
      transactionStatus = txDetails.transactionStatus || ''
      const rawCardNumber = txDetails.payment?.creditCard?.cardNumber
      if (!cardLast4) {
        cardLast4 = rawCardNumber?.slice(-4)
      }
      console.log(`🔄 Transaction ${transactionId} status: ${transactionStatus}, cardNumber: ${rawCardNumber}, last4: ${cardLast4}`)
    } catch (error) {
      console.error(`❌ Failed to get transaction details for ${transactionId}:`, error)
      if (!cardLast4) {
        // Transaction details unavailable - try voiding (works for unsettled transactions without card info)
        console.log(`🔄 Attempting void for ${transactionId} since transaction details are unavailable`)
        const voidResult = await this.voidTransaction(transactionId)
        if (voidResult.success) {
          console.log(`✅ Successfully voided transaction ${transactionId}`)
          return voidResult
        }
        console.error(`❌ Void also failed for ${transactionId}:`, voidResult.errors)
        return {
          success: false,
          errors: [{ errorCode: 'TX_LOOKUP_FAILED', errorText: `Could not retrieve transaction details or void transaction ${transactionId}. It may need to be refunded from the AuthNet dashboard.` }]
        }
      }
    }

    if (!cardLast4) {
      return {
        success: false,
        errors: [{ errorCode: 'NO_CARD_INFO', errorText: 'Could not determine card number for refund. Card info not available on this transaction.' }]
      }
    }

    // Unsettled transactions must be voided, not refunded
    const needsVoid = [
      'authorizedPendingCapture',
      'capturedPendingSettlement',
      'FDSPendingReview',
      'FDSAuthorizedPendingReview',
    ].includes(transactionStatus)

    if (needsVoid) {
      return this.voidTransaction(transactionId)
    }

    const requestBody = {
      createTransactionRequest: {
        merchantAuthentication: {
          name: this.config.apiLoginId,
          transactionKey: this.config.transactionKey
        },
        transactionRequest: {
          transactionType: 'refundTransaction',
          amount,
          payment: {
            creditCard: {
              cardNumber: cardLast4,
              expirationDate: 'XXXX'
            }
          },
          refTransId: transactionId
        }
      }
    }

    try {
      console.log('🔄 Sending refund request to Authorize.net:', {
        transactionId,
        amount,
      })

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ Authorize.net refund API error (${response.status}):`, errorText)
        throw new Error(`Authorize.net API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log('🔄 Authorize.net refund response received')
      return this.parseTransactionResponse(data)
    } catch (error) {
      console.error('❌ Error refunding transaction:', error)
      return {
        success: false,
        errors: [{ errorCode: 'REFUND_ERROR', errorText: error instanceof Error ? error.message : 'Refund error' }]
      }
    }
  }

  /**
   * Void an unsettled transaction
   */
  async voidTransaction(transactionId: string): Promise<PaymentResult> {
    const requestBody = {
      createTransactionRequest: {
        merchantAuthentication: {
          name: this.config.apiLoginId,
          transactionKey: this.config.transactionKey
        },
        transactionRequest: {
          transactionType: 'voidTransaction',
          refTransId: transactionId
        }
      }
    }

    try {
      console.log('🔄 Sending void request to Authorize.net:', { transactionId })

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ Authorize.net void API error (${response.status}):`, errorText)
        throw new Error(`Authorize.net API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log('🔄 Authorize.net void response received')
      return this.parseTransactionResponse(data)
    } catch (error) {
      console.error('❌ Error voiding transaction:', error)
      return {
        success: false,
        errors: [{ errorCode: 'VOID_ERROR', errorText: error instanceof Error ? error.message : 'Void error' }]
      }
    }
  }

  /**
   * Create a recurring subscription
   */
  async createSubscription(subscriptionRequest: SubscriptionRequest): Promise<SubscriptionResult> {
    const requestBody = {
      ARBCreateSubscriptionRequest: {
        merchantAuthentication: {
          name: this.config.apiLoginId,
          transactionKey: this.config.transactionKey
        },
        subscription: subscriptionRequest
      }
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error(`Authorize.net API error: ${response.status}`)
      }

      const data = await response.json()
      return this.parseSubscriptionResponse(data)
    } catch (error) {
      console.error('Error creating subscription:', error)
      return {
        success: false,
        errors: [{ errorCode: 'NETWORK_ERROR', errorText: error instanceof Error ? error.message : 'Network error' }]
      }
    }
  }

  /**
   * Cancel a recurring subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<SubscriptionResult> {
    const requestBody = {
      ARBCancelSubscriptionRequest: {
        merchantAuthentication: {
          name: this.config.apiLoginId,
          transactionKey: this.config.transactionKey
        },
        subscriptionId
      }
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error(`Authorize.net API error: ${response.status}`)
      }

      const data = await response.json()
      return this.parseSubscriptionResponse(data)
    } catch (error) {
      console.error('Error canceling subscription:', error)
      return {
        success: false,
        errors: [{ errorCode: 'NETWORK_ERROR', errorText: error instanceof Error ? error.message : 'Network error' }]
      }
    }
  }

  private parseTransactionResponse(data: any): PaymentResult {
    console.log('🔍 Raw transaction response:', JSON.stringify(data, null, 2));
    
    // Check if we have any data at all
    if (!data) {
      console.error('❌ No response data received from Authorize.net');
      throw new Error('No response data received from Authorize.net');
    }
    
    // Check for network or HTTP errors
    if (data.error) {
      console.error('❌ Network/HTTP error from Authorize.net:', data.error);
      throw new Error(`Network error: ${data.error}`);
    }
    
    // Check for direct response format first
    if (data.transactionResponse && data.messages) {
      const transaction = data.transactionResponse;
      const messages = data.messages;
      
      // Log what we received for debugging
      console.log('✅ Found direct response format:', { transaction: !!transaction, messages: !!messages });

      // CRITICAL FIX: Authorize.net can return messages.resultCode='Ok' (API call succeeded)
      // but the actual transaction may be declined. We MUST check transactionResponse.responseCode:
      //   "1" = Approved
      //   "2" = Declined  
      //   "3" = Error
      //   "4" = Held for Review
      const isApiSuccess = messages.resultCode === 'Ok';
      const isTransactionApproved = transaction && String(transaction.responseCode) === '1';

      if (isApiSuccess && isTransactionApproved) {
        return {
          success: true,
          transactionId: transaction.transId,
          authCode: transaction.authCode,
          responseCode: transaction.responseCode,
          responseReasonCode: transaction.messages?.[0]?.code,
          responseReasonText: transaction.messages?.[0]?.description,
          avsResultCode: transaction.avsResultCode,
          cvvResultCode: transaction.cvvResultCode,
          cavvResultCode: transaction.cavvResultCode,
          transHashSha2: transaction.transHashSha2,
          accountNumber: transaction.accountNumber,
          accountType: transaction.accountType,
          messages: messages.message?.map((msg: any) => ({
            code: msg.code,
            description: msg.text
          }))
        }
      } else {
        // Transaction was declined, errored, or held for review
        // Extract error details from transactionResponse.errors if available, 
        // otherwise fall back to messages or transaction messages
        const transactionErrors = transaction?.errors?.map((err: any) => ({
          errorCode: err.errorCode,
          errorText: err.errorText
        }));
        const messageErrors = messages.message?.map((msg: any) => ({
          errorCode: msg.code,
          errorText: msg.text
        }));
        const transactionMessages = transaction?.messages?.map((msg: any) => ({
          errorCode: msg.code,
          errorText: msg.description
        }));
        
        const errors = transactionErrors || transactionMessages || messageErrors || [{ errorCode: 'UNKNOWN', errorText: 'Unknown error occurred' }];
        
        console.error('❌ Transaction declined/failed:', {
          responseCode: transaction?.responseCode,
          errors,
          apiResultCode: messages.resultCode
        });

        return {
          success: false,
          transactionId: transaction?.transId,
          responseCode: transaction?.responseCode,
          errors
        }
      }
    }
    
    // Fallback: try wrapped response format
    const response = data.createTransactionResponse;
    
    // Log what we found
    console.log('🔍 Looking for wrapped response format:', { found: !!response });
    
    if (!response) {
      console.error('❌ No transaction response found in either format. Raw data:', data);
      throw new Error('Invalid transaction response from Authorize.net - response structure not recognized');
    }

    const transaction = response.transactionResponse;
    const messages = response.messages;

    // CRITICAL FIX: Same check for wrapped format - verify actual transaction responseCode
    const isApiSuccess = messages.resultCode === 'Ok';
    const isTransactionApproved = transaction && String(transaction.responseCode) === '1';

    if (isApiSuccess && isTransactionApproved) {
      return {
        success: true,
        transactionId: transaction.transId,
        authCode: transaction.authCode,
        responseCode: transaction.responseCode,
        responseReasonCode: transaction.messages?.[0]?.code,
        responseReasonText: transaction.messages?.[0]?.description,
        avsResultCode: transaction.avsResultCode,
        cvvResultCode: transaction.cvvResultCode,
        cavvResultCode: transaction.cavvResultCode,
        transHashSha2: transaction.transHashSha2,
        accountNumber: transaction.accountNumber,
        accountType: transaction.accountType,
        messages: messages.message?.map((msg: any) => ({
          code: msg.code,
          description: msg.text
        }))
      }
    } else {
      const transactionErrors = transaction?.errors?.map((err: any) => ({
        errorCode: err.errorCode,
        errorText: err.errorText
      }));
      const messageErrors = messages.message?.map((msg: any) => ({
        errorCode: msg.code,
        errorText: msg.text
      }));
      const transactionMessages = transaction?.messages?.map((msg: any) => ({
        errorCode: msg.code,
        errorText: msg.description
      }));

      const errors = transactionErrors || transactionMessages || messageErrors || [{ errorCode: 'UNKNOWN', errorText: 'Unknown error occurred' }];

      console.error('❌ Transaction declined/failed (wrapped):', {
        responseCode: transaction?.responseCode,
        errors,
        apiResultCode: messages.resultCode
      });

      return {
        success: false,
        transactionId: transaction?.transId,
        responseCode: transaction?.responseCode,
        errors
      }
    }
  }

  private parseSubscriptionResponse(data: any): SubscriptionResult {
    console.log('🔍 Raw subscription response:', JSON.stringify(data, null, 2))
    
    // Check for direct response format first (similar to transaction parsing)
    if (data.subscriptionId && data.messages) {
      const messages = data.messages
      
      if (messages.resultCode === 'Ok') {
        console.log('✅ Subscription created successfully (direct format):', data.subscriptionId)
        return {
          success: true,
          subscriptionId: data.subscriptionId,
          messages: messages.message?.map((msg: any) => ({
            code: msg.code,
            description: msg.text
          }))
        }
      } else {
        console.error('❌ Subscription error (direct format):', messages.message)
        return {
          success: false,
          errors: messages.message?.map((msg: any) => ({
            errorCode: msg.code,
            errorText: msg.text
          })) || [{ errorCode: 'UNKNOWN', errorText: 'Unknown error occurred' }]
        }
      }
    }
    
    // Fallback: try wrapped response format
    const response = data.ARBCreateSubscriptionResponse || data.ARBCancelSubscriptionResponse
    
    if (!response) {
      console.error('❌ No subscription response found in either format:', data)
      throw new Error('Invalid subscription response from Authorize.net')
    }

    const messages = response.messages

    if (messages.resultCode === 'Ok') {
      console.log('✅ Subscription created successfully (wrapped format):', response.subscriptionId)
      return {
        success: true,
        subscriptionId: response.subscriptionId,
        messages: messages.message?.map((msg: any) => ({
          code: msg.code,
          description: msg.text
        }))
      }
    } else {
      console.error('❌ Subscription error (wrapped format):', messages.message)
      return {
        success: false,
        errors: messages.message?.map((msg: any) => ({
          errorCode: msg.code,
          errorText: msg.text
        })) || [{ errorCode: 'UNKNOWN', errorText: 'Unknown error occurred' }]
      }
    }
  }

  private parseTransactionListResponse(data: any): AuthorizeNetBillingHistory {
    const response =
      data.getTransactionListForCustomerResponse ||
      data.getTransactionListResponse ||
      data.getUnsettledTransactionListResponse

    if (!response) {
      throw new Error('Invalid response format from Authorize.net')
    }

    // Authnet returns transactions as either a direct array or nested under .transaction
    const txList = response.transactions?.transaction ?? response.transactions ?? []
    const txArray = Array.isArray(txList) ? txList : [txList]

    return {
      transactions: txArray.map((tx: any) => this.parseTransaction(tx)),
      totalNumInResultSet: response.totalNumInResultSet || 0,
      messages: response.messages
    }
  }

  private parseTransactionDetailsResponse(data: any): AuthorizeNetTransaction {
    const response = data.getTransactionDetailsResponse ?? data

    if (!response || !response.transaction) {
      const messages = response?.messages?.message
      const authnetError = Array.isArray(messages) && messages.length > 0
        ? `${messages[0].code}: ${messages[0].text}`
        : response?.messages?.resultCode
      throw new Error(
        authnetError
          ? `Authorize.net error — ${authnetError}`
          : 'Invalid transaction details response from Authorize.net'
      )
    }

    return this.parseTransaction(response.transaction)
  }

  private parseTransaction(transaction: any): AuthorizeNetTransaction {
    return {
      transId: transaction.transId,
      submitTimeUTC: transaction.submitTimeUTC,
      transactionType: transaction.transactionType,
      transactionStatus: transaction.transactionStatus,
      responseCode: transaction.responseCode,
      responseReasonCode: transaction.responseReasonCode,
      responseReasonDescription: transaction.responseReasonDescription,
      authCode: transaction.authCode,
      AVSResponse: transaction.AVSResponse,
      cardCodeResponse: transaction.cardCodeResponse,
      batch: transaction.batch,
      order: transaction.order,
      requestedAmount: transaction.requestedAmount,
      authAmount: transaction.authAmount,
      settleAmount: transaction.settleAmount,
      tax: transaction.tax,
      shipping: transaction.shipping,
      duty: transaction.duty,
      lineItems: transaction.lineItems,
      prepaidBalanceRemaining: transaction.prepaidBalanceRemaining,
      taxExempt: transaction.taxExempt,
      payment: transaction.payment,
      customer: transaction.customer,
      billTo: transaction.billTo,
      shipTo: transaction.shipTo,
      recurringBilling: transaction.recurringBilling,
      customerIP: transaction.customerIP,
      product: transaction.product,
      marketType: transaction.marketType
    }
  }
}

// Create singleton instance
let authorizeNetClient: AuthorizeNetClient | null = null

export function getAuthorizeNetClient(): AuthorizeNetClient {
  if (!authorizeNetClient) {
    const config: AuthorizeNetConfig = {
      apiLoginId: process.env.AUTHORIZE_NET_API_LOGIN_ID!,
      transactionKey: process.env.AUTHORIZE_NET_TRANSACTION_KEY!,
      environment: (process.env.AUTHORIZE_NET_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox'
    }

    if (!config.apiLoginId || !config.transactionKey) {
      throw new Error('Authorize.net credentials not configured')
    }

    authorizeNetClient = new AuthorizeNetClient(config)
  }

  return authorizeNetClient
}

// Utility functions for common operations
export async function getCustomerBillingHistory(
  customerId: string,
  limit: number = 50,
  offset: number = 0
): Promise<AuthorizeNetBillingHistory> {
  const client = getAuthorizeNetClient()
  
  return client.getCustomerTransactionList(customerId, {
    sorting: {
      orderBy: 'submitTimeUTC',
      orderDescending: true
    },
    paging: {
      limit,
      offset
    }
  })
}

export async function getTransactionById(transactionId: string): Promise<AuthorizeNetTransaction> {
  const client = getAuthorizeNetClient()
  return client.getTransactionDetails(transactionId)
}

// Payment processing utility functions
export async function processOneTimePayment(
  amount: string,
  paymentData: {
    opaqueDataDescriptor: string
    opaqueDataValue: string
  },
  orderInfo: {
    invoiceNumber?: string
    description?: string
  },
  customerInfo?: {
    email?: string
    firstName?: string
    lastName?: string
  }
): Promise<PaymentResult> {
  const client = getAuthorizeNetClient()
  
  const transactionRequest: TransactionRequest = {
    transactionType: 'authCaptureTransaction',
    amount,
    payment: {
      opaqueData: {
        dataDescriptor: paymentData.opaqueDataDescriptor,
        dataValue: paymentData.opaqueDataValue
      }
    },
    order: orderInfo,
    ...(customerInfo && {
      customer: {
        email: customerInfo.email
      },
      billTo: {
        firstName: customerInfo.firstName || '',
        lastName: customerInfo.lastName || '',
        address: '',
        city: '',
        state: '',
        zip: ''
      }
    })
  }

  return client.createTransaction(transactionRequest)
}

export async function createRecurringSubscription(
  subscriptionData: {
    name: string
    amount: string
    intervalLength: number
    intervalUnit: 'days' | 'months'
    startDate: string
    totalOccurrences?: number
  },
  paymentData: {
    opaqueDataDescriptor: string
    opaqueDataValue: string
  },
  customerInfo: {
    email: string
    firstName: string
    lastName: string
  }
): Promise<SubscriptionResult> {
  const client = getAuthorizeNetClient()
  
  const subscriptionRequest: SubscriptionRequest = {
    name: subscriptionData.name,
    paymentSchedule: {
      interval: {
        length: subscriptionData.intervalLength,
        unit: subscriptionData.intervalUnit
      },
      startDate: subscriptionData.startDate,
      totalOccurrences: subscriptionData.totalOccurrences
    },
    amount: subscriptionData.amount,
    payment: {
      opaqueData: {
        dataDescriptor: paymentData.opaqueDataDescriptor,
        dataValue: paymentData.opaqueDataValue
      }
    },
    customer: {
      email: customerInfo.email
    },
    billTo: {
      firstName: customerInfo.firstName,
      lastName: customerInfo.lastName,
      address: '',
      city: '',
      state: '',
      zip: '',
      country: 'US'
    }
  }

  return client.createSubscription(subscriptionRequest)
}

export async function cancelSubscription(subscriptionId: string): Promise<SubscriptionResult> {
  const client = getAuthorizeNetClient()
  return client.cancelSubscription(subscriptionId)
}

export async function createCustomerProfile(customerData: {
  merchantCustomerId: string
  email: string
  description?: string
}): Promise<{ success: boolean; customerProfileId?: string; errors?: any[] }> {
  const client = getAuthorizeNetClient()
  
  const customerProfile: CustomerProfile = {
    merchantCustomerId: customerData.merchantCustomerId,
    email: customerData.email,
    description: customerData.description
  }

  return client.createCustomerProfile(customerProfile)
}

export { AuthorizeNetClient }
export type {
  AuthorizeNetTransaction,
  AuthorizeNetBillingHistory,
  PaymentResult,
  SubscriptionResult,
  CustomerProfile,
  PaymentProfile,
  TransactionRequest,
  SubscriptionRequest
}