export interface NormalizedTransaction {
  id: string
  gatewayTransactionId: string
  gateway: 'authorize_net' | 'paypal' | 'unknown'
  amount: number
  status: string
  date: string
  userName: string | null
  userEmail: string | null
  userId: string | null
  planId: string | null
  description: string | null
  source: 'database' | 'api'
  rawGatewayStatus?: string
}

export interface TransactionReportResponse {
  transactions: NormalizedTransaction[]
  summary: {
    totalCount: number
    totalAmount: number
    byGateway: {
      authorize_net: { count: number; amount: number }
      paypal: { count: number; amount: number }
    }
    byStatus: Record<string, { count: number; amount: number }>
  }
  source: 'database' | 'api'
  dateRange: { start: string; end: string }
  fetchedAt: string
}
