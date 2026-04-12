import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/payments
 * List invoices and payment transactions
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await db.userProfile.findUnique({
      where: { clerkUserId: userId },
    })

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined
    const page = parseInt(searchParams.get('page') || '1')
    const limit = 50

    const invoices = await db.invoice.findMany({
      where: status ? { status: status as any } : undefined,
      include: {
        employerPackage: {
          include: {
            employer: { select: { companyName: true, user: { select: { email: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })

    const total = await db.invoice.count({
      where: status ? { status: status as any } : undefined,
    })

    // Calculate totals
    const totalAmount = invoices.reduce((sum, inv) => sum + inv.amountDue, 0)
    const paidAmount = invoices
      .filter((inv) => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.amountDue, 0)

    return NextResponse.json(
      {
        success: true,
        data: invoices.map((inv) => ({
          id: inv.id,
          amount: inv.amountDue / 100,
          status: inv.status,
          description: inv.description,
          packageName: inv.packageName,
          company: inv.employerPackage?.employer.companyName,
          email: inv.employerPackage?.employer.user.email,
          createdAt: inv.createdAt,
          paidAt: inv.paidAt,
        })),
        summary: {
          totalInvoices: total,
          totalAmount: totalAmount / 100,
          paidAmount: paidAmount / 100,
          outstandingAmount: (totalAmount - paidAmount) / 100,
        },
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Admin Payments] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/payments/invoice/[id]/reconcile
 * Mark invoice as paid/reconciled
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await db.userProfile.findUnique({
      where: { clerkUserId: userId },
    })

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { invoiceId, status } = await request.json()
    if (!invoiceId || !status) {
      return NextResponse.json({ error: 'Missing invoiceId or status' }, { status: 400 })
    }

    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    const updated = await db.invoice.update({
      where: { id: invoiceId },
      data: {
        status: status as any,
        paidAt: status === 'paid' && !invoice.paidAt ? new Date() : invoice.paidAt,
      },
    })

    console.log(`[Admin] Invoice ${invoiceId} marked as ${status} by admin ${userId}`)

    return NextResponse.json(
      {
        success: true,
        data: updated,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Admin Invoice Reconcile] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
