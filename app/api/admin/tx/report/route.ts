import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'


import type { NormalizedTransaction, TransactionReportResponse } from '@/app/admin/tx/report/types'

function detectGateway(payment: {
  ghlTransactionId?: string | null
  authnetTransactionId?: string | null
}): 'authorize_net' | 'paypal' | 'unknown' {
  const ghl = payment.ghlTransactionId || ''
  if (ghl.startsWith('PAYPAL_')) return 'paypal'
  if (payment.authnetTransactionId) return 'authorize_net'
  if (ghl) return 'authorize_net'
  return 'unknown'
}

function buildSummary(transactions: NormalizedTransaction[]) {
  const summary = {
    totalCount: transactions.length,
    totalAmount: 0,
    byGateway: {
      authorize_net: { count: 0, amount: 0 },
      paypal: { count: 0, amount: 0 },
    },
    byStatus: {} as Record<string, { count: number; amount: number }>,
  }

  for (const tx of transactions) {
    summary.totalAmount += tx.amount

    if (tx.gateway === 'authorize_net' || tx.gateway === 'paypal') {
      summary.byGateway[tx.gateway].count++
      summary.byGateway[tx.gateway].amount += tx.amount
    }

    if (!summary.byStatus[tx.status]) {
      summary.byStatus[tx.status] = { count: 0, amount: 0 }
    }
    summary.byStatus[tx.status].count++
    summary.byStatus[tx.status].amount += tx.amount
  }

  return summary
}

async function fetchFromDatabase(
  startDate: string,
  endDate: string
): Promise<NormalizedTransaction[]> {
  const payments = await db.externalPayment.findMany({
    where: {
      createdAt: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return payments.map((p) => {
    const userName = p.user
      ? p.user.name || `${p.user.firstName || ''} ${p.user.lastName || ''}`.trim() || null
      : null

    return {
      id: p.id,
      gatewayTransactionId: p.authnetTransactionId || p.ghlTransactionId || p.id,
      gateway: detectGateway(p),
      amount: Number(p.amount),
      status: p.status,
      date: p.createdAt.toISOString(),
      userName,
      userEmail: p.user?.email || null,
      userId: p.userId,
      planId: p.planId,
      description: null,
      source: 'database' as const,
    }
  })
}

async function fetchFromAPIs(
  startDate: string,
  endDate: string
): Promise<NormalizedTransaction[]> {
  const transactions: NormalizedTransaction[] = []

  // --- Authorize.net: get settled batches then transactions per batch ---
  try {
    const authnetClient = getAuthorizeNetClient()
    const batchResult = await authnetClient.getSettledBatchList(
      false,
      new Date(startDate).toISOString(),
      new Date(endDate).toISOString()
    )

    const response = batchResult?.getSettledBatchListResponse || batchResult
    const batches = response?.batchList?.batch
      ? Array.isArray(response.batchList.batch)
        ? response.batchList.batch
        : [response.batchList.batch]
      : []

    for (const batch of batches) {
      try {
        const batchTxns = await authnetClient.getTransactionListForBatch(batch.batchId)
        for (const tx of batchTxns.transactions) {
          transactions.push({
            id: tx.transId,
            gatewayTransactionId: tx.transId,
            gateway: 'authorize_net',
            amount: Number(tx.settleAmount || tx.authAmount || 0),
            status: tx.transactionStatus,
            date: tx.submitTimeUTC,
            userName: tx.billTo
              ? `${tx.billTo.firstName || ''} ${tx.billTo.lastName || ''}`.trim() || null
              : null,
            userEmail: tx.customer?.email || null,
            userId: null,
            planId: tx.order?.description || null,
            description: tx.order?.invoiceNumber || null,
            source: 'api',
            rawGatewayStatus: tx.transactionStatus,
          })
        }
      } catch (err) {
        console.error(`Error fetching AuthNet batch ${batch.batchId}:`, err)
      }
    }
  } catch (err) {
    console.error('Error fetching AuthNet settled batches:', err)
  }

  // --- PayPal: search transactions (chunked into 31-day windows) ---
  try {
    const paypalClient = getPayPalClient()
    const start = new Date(startDate)
    const end = new Date(endDate)
    const maxDaysPerChunk = 31

    let chunkStart = new Date(start)
    while (chunkStart < end) {
      const chunkEnd = new Date(chunkStart)
      chunkEnd.setDate(chunkEnd.getDate() + maxDaysPerChunk)
      if (chunkEnd > end) chunkEnd.setTime(end.getTime())

      try {
        let page = 1
        let totalPages = 1

        while (page <= totalPages) {
          const result = await paypalClient.searchTransactions(
            chunkStart.toISOString(),
            chunkEnd.toISOString(),
            page,
            100
          )

          totalPages = result.total_pages || 1

          for (const detail of result.transaction_details || []) {
            const info = detail.transaction_info
            const payer = detail.payer_info
            const amount = Number(info.transaction_amount?.value || 0)

            transactions.push({
              id: info.transaction_id,
              gatewayTransactionId: info.transaction_id,
              gateway: 'paypal',
              amount: Math.abs(amount),
              status: info.transaction_status || 'unknown',
              date: info.transaction_initiation_date || info.transaction_updated_date,
              userName: payer?.payer_name
                ? `${payer.payer_name.given_name || ''} ${payer.payer_name.surname || ''}`.trim() || null
                : null,
              userEmail: payer?.email_address || null,
              userId: null,
              planId: null,
              description: info.invoice_id || null,
              source: 'api',
              rawGatewayStatus: info.transaction_status,
            })
          }

          page++
        }
      } catch (err) {
        console.error(`Error fetching PayPal transactions for chunk:`, err)
      }

      chunkStart = new Date(chunkEnd)
    }
  } catch (err) {
    console.error('Error fetching PayPal transactions:', err)
  }

  transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  return transactions
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const role = currentUser.profile.role
    if (role !== 'admin' && role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const startDate = request.nextUrl.searchParams.get('startDate')
    const endDate = request.nextUrl.searchParams.get('endDate')
    const source = request.nextUrl.searchParams.get('source') || 'database'

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      )
    }

    let transactions: NormalizedTransaction[]

    if (source === 'api') {
      transactions = await fetchFromAPIs(startDate, endDate)
    } else {
      transactions = await fetchFromDatabase(startDate, endDate)
    }

    const response: TransactionReportResponse = {
      transactions,
      summary: buildSummary(transactions),
      source: source as 'database' | 'api',
      dateRange: { start: startDate, end: endDate },
      fetchedAt: new Date().toISOString(),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Transaction report error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
