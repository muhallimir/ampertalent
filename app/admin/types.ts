export interface SubscriptionData {
    id: string
    seekerId: string
    seekerName: string
    seekerEmail: string
    plan: string
    planName: string
    amount: number
    status: string
    billingInterval: string
    subscriptionStartDate: Date
    nextRenewalDate: Date
    currentPeriodStart: Date | null
    currentPeriodEnd: Date | null
    autoRenew: boolean
    isOnTrial: boolean
    trialExpiryDate: Date | null
    paymentProvider: string
    authnetSubscriptionId: string
    authnetCustomerId: string
    lastPaymentDate: Date | null
    lastPaymentAmount: number | null
    lastPaymentStatus: string | null
}
