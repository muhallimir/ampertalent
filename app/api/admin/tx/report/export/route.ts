import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import type { NormalizedTransaction } from '@/app/admin/tx/report/types'

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

function escapeCsvField(value: string | null | undefined): string {
  if (!value) return ''
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
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

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      )
    }

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

    const transactions: NormalizedTransaction[] = payments.map((p) => {
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
        source: 'database',
      }
    })

    const csvHeader = 'Date,Transaction ID,Gateway,Amount,Status,User Name,User Email,Plan ID\n'
    const csvRows = transactions
      .map((tx) =>
        [
          new Date(tx.date).toLocaleString('en-US'),
          tx.gatewayTransactionId,
          tx.gateway,
          tx.amount.toFixed(2),
          tx.status,
          escapeCsvField(tx.userName),
          tx.userEmail || '',
          tx.planId || '',
        ].join(',')
      )
      .join('\n')

    const csv = csvHeader + csvRows

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="transaction-report-${startDate}-to-${endDate}.csv"`,
      },
    })
  } catch (error) {
    console.error('Transaction report export error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
