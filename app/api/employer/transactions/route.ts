import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

interface Transaction {
  id: string
  amount: number
  currency: string
  status: string
  description: string
  date: string
  paymentMethod: {
    type: string
    last4?: string
    brand?: string
  }
  metadata?: Record<string, any>
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Log impersonation context for debugging
    if (currentUser.isImpersonating) {
      console.log('🎭 IMPERSONATION: Employer transactions API called with impersonated user', {
        adminId: currentUser.isImpersonating ? (currentUser as any).adminProfile?.id : undefined,
        impersonatedUserId: currentUser.profile?.id,
        impersonatedRole: currentUser.profile?.role
      })
    }

    // Verify user is an employer or admin impersonating an employer
    if (currentUser.profile.role !== 'employer' && !(currentUser.isImpersonating && currentUser.profile.role === 'employer')) {
      console.log('🚫 EMPLOYER TRANSACTIONS: Access denied', {
        userRole: currentUser.profile.role,
        isImpersonating: currentUser.isImpersonating,
        userId: currentUser.profile.id,
        adminId: currentUser.isImpersonating ? (currentUser as any).adminProfile?.id : undefined
      })
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const userId = currentUser.profile.id

    // Fetch external payments for this employer
    const externalPayments = await db.externalPayment.findMany({
      where: {
        userId: userId
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Fetch invoices for this employer (actual payment transactions)
    const invoices = await db.invoice.findMany({
      where: {
        employerPackage: {
          employerId: userId
        }
      },
      include: {
        employerPackage: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform external payments to transaction format
    // const externalTransactions: Transaction[] = externalPayments.map((payment: any) => {
    //   console.log('🔍 TRANSACTIONS API: Processing external payment:', {
    //     id: payment.id,
    //     amount: payment.amount,
    //     amountType: typeof payment.amount,
    //     amountValue: payment.amount
    //   })

    //   // Ensure amount is a number
    //   const numericAmount = typeof payment.amount === 'string' ? parseFloat(payment.amount) : Number(payment.amount)
    //   if (isNaN(numericAmount)) {
    //     console.error('❌ TRANSACTIONS API: Invalid amount for external payment:', {
    //       id: payment.id,
    //       originalAmount: payment.amount,
    //       amountType: typeof payment.amount
    //     })
    //   }

    //   return {
    //     id: payment.id,
    //     amount: isNaN(numericAmount) ? 0 : numericAmount,
    //     currency: 'USD',
    //     status: payment.status === 'completed' ? 'succeeded' : payment.status,
    //     description: `Package payment for ${payment.planId}`,
    //     date: payment.createdAt.toISOString(),
    //     paymentMethod: {
    //       type: 'card',
    //       last4: undefined,
    //       brand: undefined
    //     },
    //     metadata: {
    //       planId: payment.planId,
    //       ghlTransactionId: payment.ghlTransactionId,
    //       source: 'external_payment'
    //     }
    //   }
    // })

    // Transform invoices to transaction format
    const invoiceTransactions: Transaction[] = invoices.map((invoice: any) => {
      console.log('🔍 TRANSACTIONS API: Processing invoice:', {
        id: invoice.id,
        amountDue: invoice.amountDue,
        amountDueType: typeof invoice.amountDue,
        amountDueValue: invoice.amountDue
      })

      // Ensure amountDue is a number and convert from cents to dollars
      const numericAmountDue = typeof invoice.amountDue === 'string' ? parseFloat(invoice.amountDue) : Number(invoice.amountDue)
      const dollarAmount = isNaN(numericAmountDue) ? 0 : numericAmountDue / 100

      if (isNaN(numericAmountDue)) {
        console.error('❌ TRANSACTIONS API: Invalid amountDue for invoice:', {
          id: invoice.id,
          originalAmountDue: invoice.amountDue,
          amountDueType: typeof invoice.amountDue
        })
      }

      return {
        id: invoice.id,
        amount: dollarAmount,
        currency: 'USD',
        status: invoice.status === 'paid' ? 'succeeded' :
          invoice.status === 'open' ? 'pending' :
            invoice.status === 'void' ? 'failed' : invoice.status,
        description: invoice.description || `Job posting package: ${invoice.packageName || invoice.employerPackage?.packageType || 'Unknown'}`,
        date: invoice.createdAt.toISOString(),
        paymentMethod: {
          type: 'card',
          last4: undefined,
          brand: undefined
        },
        metadata: {
          packageType: invoice.employerPackage?.packageType,
          authnetTransactionId: invoice.authnetTransactionId,
          invoiceId: invoice.id,
          source: 'invoice'
        }
      }
    })

    // Combine and sort all transactions
    const allTransactions = [...invoiceTransactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json({
      success: true,
      transactions: allTransactions,
      pagination: {
        total: allTransactions.length,
        limit: 50,
        offset: 0,
        hasMore: false
      }
    })

  } catch (error) {
    console.error('Error fetching employer transactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transaction history' },
      { status: 500 }
    )
  }
}