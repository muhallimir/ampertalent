import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'



/**
 * GET /api/admin/transaction-lookup?q=<transactionId or paymentId>
 *
 * Deep-dive lookup that returns:
 *  1. Our database record (ExternalPayment + user + payment methods)
 *  2. Authorize.net transaction details (from their API)
 *  3. Related subscriptions, invoices, admin action logs
 *
 * Super admin only.
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Auth
    const currentUser = await getCurrentUser(request)
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (currentUser.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })
    }

    const q = request.nextUrl.searchParams.get('q')?.trim()
    if (!q) {
      return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 })
    }

    const result: Record<string, any> = {
      query: q,
      paypal: null,
      authnetCandidates: null,
      timestamp: new Date().toISOString(),
      database: null,
      authnet: null,
      relatedSubscriptions: [],
      relatedInvoices: [],
      paymentMethods: [],
      adminActions: [],
      retryEligible: false,
      retryInfo: null,
    }

    // ──────────────────────────────────────────────
    // 2. Database lookup — try multiple fields
    // ──────────────────────────────────────────────
    let dbPayment: any = null

    // Try by ExternalPayment.id
    dbPayment = await db.externalPayment.findUnique({
      where: { id: q },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            firstName: true,
            lastName: true,
            jobSeeker: { select: { userId: true, membershipPlan: true } },
            employer: { select: { userId: true, companyName: true, currentPackageId: true } },
          },
        },
      },
    })

    // Try by authnetTransactionId
    if (!dbPayment) {
      dbPayment = await db.externalPayment.findFirst({
        where: { authnetTransactionId: q },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              firstName: true,
              lastName: true,
              jobSeeker: { select: { userId: true, membershipPlan: true } },
              employer: { select: { userId: true, companyName: true, currentPackageId: true } },
            },
          },
        },
      })
    }

    // Try by ghlTransactionId
    if (!dbPayment) {
      dbPayment = await db.externalPayment.findFirst({
        where: { ghlTransactionId: q },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              firstName: true,
              lastName: true,
              jobSeeker: { select: { userId: true, membershipPlan: true } },
              employer: { select: { userId: true, companyName: true, currentPackageId: true } },
            },
          },
        },
      })
    }

    if (dbPayment) {
      result.database = {
        id: dbPayment.id,
        userId: dbPayment.userId,
        amount: Number(dbPayment.amount),
        planId: dbPayment.planId,
        status: dbPayment.status,
        authnetTransactionId: dbPayment.authnetTransactionId,
        ghlTransactionId: dbPayment.ghlTransactionId,
        authnetCustomerId: dbPayment.authnetCustomerId,
        webhookProcessedAt: dbPayment.webhookProcessedAt,
        createdAt: dbPayment.createdAt,
        updatedAt: dbPayment.updatedAt,
        user: dbPayment.user
          ? {
              id: dbPayment.user.id,
              name: dbPayment.user.name,
              email: dbPayment.user.email,
              role: dbPayment.user.role,
              firstName: dbPayment.user.firstName,
              lastName: dbPayment.user.lastName,
              isSeeker: !!dbPayment.user.jobSeeker,
              isEmployer: !!dbPayment.user.employer,
              seekerInfo: dbPayment.user.jobSeeker,
              employerInfo: dbPayment.user.employer,
            }
          : null,
      }

      // Check retry eligibility
      const canRetry = dbPayment.status === 'failed' || dbPayment.status === 'pending'
      result.retryEligible = canRetry

      // Fetch payment methods for the user
      const userId = dbPayment.userId
      const isEmployer = !!dbPayment.user?.employer

      const paymentMethods = await db.paymentMethod.findMany({
        where: {
          ...(isEmployer ? { employerId: userId } : { seekerId: userId }),
        },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          type: true,
          last4: true,
          brand: true,
          expiryMonth: true,
          expiryYear: true,
          isDefault: true,
          authnetPaymentProfileId: true,
          createdAt: true,
        },
      })

      result.paymentMethods = paymentMethods.map((pm) => ({
        ...pm,
        hasValidProfile:
          !!pm.authnetPaymentProfileId &&
          pm.authnetPaymentProfileId !== 'migrated' &&
          !pm.authnetPaymentProfileId.startsWith('migrated'),
        isPayPal: pm.brand?.toLowerCase() === 'paypal' || pm.authnetPaymentProfileId?.startsWith('PAYPAL|'),
        profileIdMasked: pm.authnetPaymentProfileId
          ? pm.authnetPaymentProfileId.substring(0, 8) + '...'
          : null,
      }))

      if (canRetry && paymentMethods.length > 0) {
        const defaultMethod = paymentMethods.find((pm) => pm.isDefault) || paymentMethods[0]
        result.retryInfo = {
          paymentId: dbPayment.id,
          amount: Number(dbPayment.amount),
          suggestedPaymentMethodId: defaultMethod.id,
          suggestedPaymentMethodLast4: defaultMethod.last4,
          suggestedPaymentMethodBrand: defaultMethod.brand,
        }
      }

      // Related subscriptions
      try {
        const subscriptions = await db.subscription.findMany({
          where: { seekerId: userId },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            plan: true,
            status: true,
            createdAt: true,
            currentPeriodEnd: true,
            authnetSubscriptionId: true,
            externalPaymentId: true,
          },
        })
        result.relatedSubscriptions = subscriptions
      } catch {
        // User might not be a seeker
      }

      // Related invoices (employer)
      if (isEmployer) {
        try {
          const invoices = await db.invoice.findMany({
            where: {
              employerPackage: { employerId: userId },
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
              id: true,
              amountDue: true,
              status: true,
              description: true,
              authnetTransactionId: true,
              paidAt: true,
              createdAt: true,
            },
          })
          result.relatedInvoices = invoices
        } catch {
          // no invoices
        }
      }

      // Admin action logs for this payment
      try {
        const actions = await db.adminActionLog.findMany({
          where: { targetId: dbPayment.id },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            actionType: true,
            adminId: true,
            details: true,
            createdAt: true,
          },
        })
        result.adminActions = actions
      } catch {
        // no logs
      }
    }

    // ──────────────────────────────────────────────
    // 3. PayPal lookup — if the DB record has a PAYPAL_ ghlTransactionId
    // ──────────────────────────────────────────────
    const isKnownPaypalPayment = !!(dbPayment?.ghlTransactionId?.startsWith('PAYPAL_'))
    const paypalSaleId = isKnownPaypalPayment ? dbPayment?.authnetTransactionId : null

    if (paypalSaleId) {
      try {
        const paypalClient = getPayPalClient()
        const saleDetails = await paypalClient.getSale(paypalSaleId)
        result.paypal = saleDetails
      } catch (paypalError) {
        result.paypal = {
          error: paypalError instanceof Error ? paypalError.message : 'Failed to fetch from PayPal',
          queriedId: paypalSaleId,
        }
      }
    }

    // ──────────────────────────────────────────────
    // 4. Authorize.net lookup — skip if we know it's a PayPal payment
    // ──────────────────────────────────────────────
    const looksLikeAuthnetId = /^\d{5,}$/.test(q)
    const authnetIdToLookup = isKnownPaypalPayment
      ? null
      : looksLikeAuthnetId
        ? q
        : dbPayment?.authnetTransactionId || null

    if (authnetIdToLookup) {
      try {
        const authnetClient = getAuthorizeNetClient()
        const txDetails = await authnetClient.getTransactionDetails(authnetIdToLookup)

        result.authnet = {
          transId: txDetails.transId,
          submitTimeUTC: txDetails.submitTimeUTC,
          transactionType: txDetails.transactionType,
          transactionStatus: txDetails.transactionStatus,
          responseCode: txDetails.responseCode,
          responseReasonCode: txDetails.responseReasonCode,
          responseReasonDescription: txDetails.responseReasonDescription,
          authCode: txDetails.authCode,
          AVSResponse: txDetails.AVSResponse,
          cardCodeResponse: txDetails.cardCodeResponse,
          batch: txDetails.batch,
          order: txDetails.order,
          requestedAmount: txDetails.requestedAmount,
          authAmount: txDetails.authAmount,
          settleAmount: txDetails.settleAmount,
          payment: txDetails.payment,
          customer: txDetails.customer,
          billTo: txDetails.billTo,
          recurringBilling: txDetails.recurringBilling,
          product: txDetails.product,
          marketType: txDetails.marketType,
        }
      } catch (authnetError) {
        result.authnet = {
          error: authnetError instanceof Error ? authnetError.message : 'Failed to fetch from Authorize.net',
          queriedId: authnetIdToLookup,
        }
      }
    }

    // ──────────────────────────────────────────────
    // 5. Authnet candidate search by amount+date when no transaction ID
    // ──────────────────────────────────────────────
    if (dbPayment && !dbPayment.authnetTransactionId && !isKnownPaypalPayment) {
      try {
        const authnetClient = getAuthorizeNetClient()
        const candidates = await authnetClient.findTransactionByAmountAndDate(
          Number(dbPayment.amount),
          dbPayment.createdAt.toISOString()
        )
        result.authnetCandidates = candidates // always set, even if empty []
      } catch (candidateErr) {
        result.authnetCandidates = []
        ;(result as any).authnetCandidatesError = candidateErr instanceof Error ? candidateErr.message : String(candidateErr)
      }
    }

    // ──────────────────────────────────────────────
    // 6. If nothing found anywhere
    // ──────────────────────────────────────────────
    if (!result.database && !result.authnet && !result.paypal) {
      return NextResponse.json(
        {
          ...result,
          error: 'No records found for this query in the database or Authorize.net',
        },
        { status: 404 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('❌ [Transaction Lookup] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
