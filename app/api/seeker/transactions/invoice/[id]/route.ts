import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { generateInvoicePDF } from '@/lib/invoice-pdf'
import { SEEKER_SUBSCRIPTION_PLANS } from '@/lib/subscription-plans'

const normalizePlanLabel = (planId: string) =>
  planId
    .split(/[-_]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params for Next.js 16
    const { id: transactionId } = await params

    const currentUser = await getCurrentUser(request)
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user is a seeker
    if (currentUser.profile.role !== 'seeker') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const userId = currentUser.profile.id

    console.log(`🔍 SEEKER PDF INVOICE: Looking for transaction ${transactionId} for user ${userId}`)

    // First try to find it as a subscription
    let subscription = await db.subscription.findFirst({
      where: {
        id: transactionId,
        seekerId: userId
      }
    })

    // If not found as subscription, try to find as external payment and create subscription data
    let externalPayment = null
    if (!subscription) {
      console.log(`🔍 SEEKER PDF INVOICE: Not found as subscription, checking external payments`)

      externalPayment = await db.externalPayment.findFirst({
        where: {
          id: transactionId,
          userId: userId
        }
      })

      if (externalPayment) {
        console.log(`🔍 SEEKER PDF INVOICE: Found as external payment, creating subscription data`)

        // Create a mock subscription structure for PDF generation
        subscription = {
          id: externalPayment.id,
          plan: externalPayment.planId as any,
          status: externalPayment.status === 'completed' ? 'active' : 'pending',
          createdAt: externalPayment.createdAt,
          currentPeriodEnd: null,
          seekerId: userId
        } as any
      }
    }

    if (!subscription) {
      console.log(`❌ SEEKER PDF INVOICE: Transaction ${transactionId} not found for user ${userId}`)
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    console.log(`✅ SEEKER PDF INVOICE: Found transaction data for ${transactionId}`)

    const membershipPlanToIdMap: Record<string, string> = {
      'trial_monthly': 'trial',
      'gold_bimonthly': 'gold',
      'vip_quarterly': 'vip',
      'annual_platinum': 'annual'
    }

    const planId = membershipPlanToIdMap[subscription.plan] || subscription.plan
    const plan = SEEKER_SUBSCRIPTION_PLANS.find(p => p.id === planId)
    const isTrial = planId === 'trial' && plan?.trialDays

    const isCritique = externalPayment && (externalPayment.planId === 'rush_critique' || externalPayment.planId === 'standard_critique')
    const critiqueLabel = isCritique
      ? (externalPayment?.planId === 'rush_critique' ? 'Rush Critique' : 'Standard Critique')
      : null
    const amountDueCents = externalPayment
      ? Math.round(Number(externalPayment.amount || 0) * 100)
      : isTrial
        ? 0
        : (plan?.price || 0) * 100

    const invoicePrefix = isCritique ? 'PAY' : 'SUB'

    const invoiceData = {
      id: externalPayment ? `${invoicePrefix}-${externalPayment.id.slice(-8).toUpperCase()}` : `SUB-${subscription.id.slice(-8).toUpperCase()}`,
      amount_due: amountDueCents,
      status: externalPayment
        ? (externalPayment.status === 'completed' ? 'paid' : externalPayment.status)
        : (isTrial ? 'trial' : (subscription.status === 'active' ? 'paid' : 'pending')),
      created_at: externalPayment ? externalPayment.createdAt : subscription.createdAt,
      description: externalPayment
        ? (isCritique
          ? `Payment for ${critiqueLabel}`
          : `Subscription payment for ${normalizePlanLabel(externalPayment.planId)}`)
        : (isTrial
          ? `${plan?.name || 'Trial Subscription'} - Free Trial`
          : `${plan?.name || 'Subscription'} - ${plan?.billing || 'monthly'}`),
      plan_name: externalPayment
        ? (isCritique ? critiqueLabel : normalizePlanLabel(externalPayment.planId))
        : (plan?.name || 'Unknown Plan'),
      paid_at: externalPayment
        ? (externalPayment.status === 'completed' ? externalPayment.createdAt : null)
        : (isTrial ? null : (subscription.status === 'active' ? subscription.createdAt : null)),
      due_date: subscription.currentPeriodEnd,
      user_name: currentUser.profile.firstName && currentUser.profile.lastName
        ? `${currentUser.profile.firstName} ${currentUser.profile.lastName}`
        : 'Job Seeker',
      user_email: currentUser.profile.email || currentUser.clerkUser.primaryEmailAddress?.emailAddress || 'user@example.com'
    }

    const pdfBuffer = generateInvoicePDF(invoiceData)
    const filenameBase = externalPayment ? externalPayment.id : subscription.id
    const filename = `ampertalent-${invoicePrefix.toLowerCase()}-${filenameBase.slice(-8).toUpperCase()}.pdf`

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    console.error('Error generating seeker invoice PDF:', error)
    return NextResponse.json(
      { error: 'Failed to generate invoice PDF' },
      { status: 500 }
    )
  }
}
