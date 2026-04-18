import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

const normalizePlanLabel = (planId: string) =>
  planId
    .split(/[-_]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

const EMPLOYER_PLAN_DISPLAY: Record<string, string> = {
  standard: 'Standard Job Post',
  featured: 'Featured Job Post',
  email_blast: 'Solo Email Blast',
  standard_job_post: 'Standard Job Post',
  featured_job_post: 'Featured Job Post',
  solo_email_blast: 'Solo Email Blast',
  gold_plus_6_month: 'Gold Plus 6-Month Package',
  concierge_lite: 'Small Business Concierge LITE (Legacy)',
  concierge_level_1: 'Small Business Concierge Level I',
  concierge_level_2: 'Small Business Concierge Level II',
  concierge_level_3: 'Small Business Concierge Level III',
  rush_service: 'Rush Service Add-on',
  onboarding_service: 'Onboarding Service',
}

interface TransactionCSVRow {
  id: string
  date: string
  description: string
  amount: string
  currency: string
  status: string
  payment_method: string
  transaction_id: string
  package_type: string
  invoice_number: string
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is an employer
    if (currentUser.profile.role !== 'employer') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const userId = currentUser.profile.id

    // Fetch invoices for this employer (primary payment records)
    const invoices = await db.invoice.findMany({
      where: {
        employerPackage: {
          employerId: userId
        }
      },
      include: {
        employerPackage: {
          include: {
            employer: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`📊 EMPLOYER CSV EXPORT: Found ${invoices.length} invoices for user ${userId}`)

    // Also fetch external payments as backup data source
    const externalPayments = await db.externalPayment.findMany({
      where: {
        userId: userId
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`📊 EMPLOYER CSV EXPORT: Found ${externalPayments.length} external payments for user ${userId}`)

    // Transform invoices to CSV format
    const invoiceRows: TransactionCSVRow[] = invoices.map((invoice: any) => {
      const numericAmountDue = typeof invoice.amountDue === 'string' ? parseFloat(invoice.amountDue) : Number(invoice.amountDue)
      const dollarAmount = isNaN(numericAmountDue) ? 0 : numericAmountDue / 100

      return {
        id: invoice.id,
        date: invoice.createdAt.toISOString().split('T')[0], // YYYY-MM-DD format
        description: invoice.description || `${invoice.packageName || invoice.employerPackage?.packageType || 'Job Posting Package'}`,
        amount: dollarAmount.toFixed(2),
        currency: 'USD',
        status: invoice.status === 'paid' ? 'Paid' :
          invoice.status === 'open' ? 'Pending' :
            invoice.status === 'void' ? 'Cancelled' :
              invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1),
        payment_method: 'Credit Card',
        transaction_id: invoice.authnetTransactionId || invoice.id,
        package_type: invoice.employerPackage?.packageType || 'Unknown',
        invoice_number: `INV-${invoice.id.slice(-8).toUpperCase()}`
      }
    })

    const invoiceTransactionIds = new Set(
      invoices
        .map((invoice: any) => invoice.authnetTransactionId)
        .filter((id: string | null | undefined): id is string => Boolean(id))
    )

    // Transform external payments to CSV format as additional data
    const externalRows: TransactionCSVRow[] = externalPayments
      .map((payment: any) => {
        const hasMatchingInvoice =
          (payment.authnetTransactionId && invoiceTransactionIds.has(payment.authnetTransactionId)) ||
          (payment.ghlTransactionId && invoiceTransactionIds.has(payment.ghlTransactionId))
        if (hasMatchingInvoice) {
          return null
        }

        const numericAmount = typeof payment.amount === 'string' ? parseFloat(payment.amount) : Number(payment.amount)
        const friendlyPlan = EMPLOYER_PLAN_DISPLAY[payment.planId] || normalizePlanLabel(payment.planId || 'Unknown Package')

        return {
          id: payment.id,
          date: payment.createdAt.toISOString().split('T')[0],
          description: `Payment for ${friendlyPlan}`,
          amount: (isNaN(numericAmount) ? 0 : numericAmount).toFixed(2),
          currency: 'USD',
          status: payment.status === 'completed' ? 'Paid' : payment.status,
          payment_method: payment.ghlTransactionId ? 'Legacy (GHL)' : 'Credit Card',
          transaction_id: payment.ghlTransactionId || payment.id,
          package_type: payment.planId || 'Unknown',
          invoice_number: `EXT-${payment.id.slice(-8).toUpperCase()}`
        }
      })
      .filter((row): row is TransactionCSVRow => row !== null)

    // Combine all transaction rows
    const transactionRows = [...invoiceRows, ...externalRows]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    console.log(`📊 EMPLOYER CSV EXPORT: Total ${transactionRows.length} transactions to export`)

    // Generate CSV content
    const headers = [
      'Invoice Number',
      'Date',
      'Description',
      'Amount',
      'Currency',
      'Status',
      'Payment Method',
      'Transaction ID',
      'Package Type',
      'Internal ID'
    ]

    let csvRows: string[]

    if (transactionRows.length === 0) {
      // If no data, add a sample row indicating no transactions
      csvRows = [
        headers.join(','),
        '"No transactions found","","No payment history available","0.00","USD","","","","",""'
      ]
      console.log(`📊 EMPLOYER CSV EXPORT: No transactions found, exporting empty CSV with headers`)
    } else {
      csvRows = [
        headers.join(','),
        ...transactionRows.map(row => [
          `"${row.invoice_number}"`,
          `"${row.date}"`,
          `"${row.description.replace(/"/g, '""')}"`, // Escape quotes in description
          `"${row.amount}"`,
          `"${row.currency}"`,
          `"${row.status}"`,
          `"${row.payment_method}"`,
          `"${row.transaction_id}"`,
          `"${row.package_type}"`,
          `"${row.id}"`
        ].join(','))
      ]
    }

    const csvContent = csvRows.join('\n')

    // Generate filename with current date
    const currentDate = new Date().toISOString().split('T')[0]
    const filename = `ampertalent-employer-transactions-${currentDate}.csv`

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    console.error('Error exporting employer transactions:', error)
    return NextResponse.json(
      { error: 'Failed to export transaction history' },
      { status: 500 }
    )
  }
}
