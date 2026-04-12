import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  try {
    // 1. Authentication: super_admin only
    const currentUser = await getCurrentUser(request)
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (currentUser.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })
    }

    const { paymentId } = await request.json()
    if (!paymentId) {
      return NextResponse.json({ error: 'paymentId is required' }, { status: 400 })
    }

    // 2. Fetch the ExternalPayment
    const payment = await db.externalPayment.findUnique({
      where: { id: paymentId },
      include: {
        user: { select: { name: true, email: true } }
      }
    })

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    if (payment.status === 'refunded') {
      return NextResponse.json({ error: 'Payment already refunded' }, { status: 400 })
    }

    if (payment.status !== 'completed') {
      return NextResponse.json({ error: 'Only completed payments can be refunded' }, { status: 400 })
    }

    // 3. Determine payment method and process refund
    const ghlTransactionId = payment.ghlTransactionId || ''
    const isPayPal = ghlTransactionId.startsWith('PAYPAL_')
    const amount = Number(payment.amount)

    let refundResult: { success: boolean; error?: string; refundId?: string }

    if (isPayPal) {
      // PayPal refund: use authnetTransactionId (stores saleId) or extract from ghlTransactionId as fallback
      // authnetTransactionId stores the PayPal sale ID (e.g., "5YR12345AB678901C")
      // ghlTransactionId stores "PAYPAL_B-xxx" (billing agreement ID) - NOT usable for refunds
      const saleId = payment.authnetTransactionId || null
      if (!saleId) {
        return NextResponse.json({
          error: 'PayPal sale ID not found for this payment. The payment was created before sale ID tracking was added.',
          hint: 'This payment needs to be refunded manually via the PayPal dashboard.'
        }, { status: 400 })
      }

      console.log(`🔄 Processing PayPal refund for sale: ${saleId}, amount: ${amount}`)
      const paypalClient = getPayPalClient()
      refundResult = await paypalClient.refundSale(saleId)
    } else {
      // AuthNet refund: use authnetTransactionId, fallback to ghlTransactionId for older payments
      const authnetTransactionId = payment.authnetTransactionId || payment.ghlTransactionId
      if (!authnetTransactionId) {
        return NextResponse.json({ error: 'Authorize.net transaction ID not found for this payment' }, { status: 400 })
      }

      console.log(`🔄 Processing AuthNet refund for transaction: ${authnetTransactionId}, amount: ${amount}`)
      const authnetClient = getAuthorizeNetClient()
      const result = await authnetClient.refundTransaction(authnetTransactionId, amount.toFixed(2))

      refundResult = {
        success: result.success,
        error: result.errors?.map(e => `[${e.errorCode}] ${e.errorText}`).join(', '),
        refundId: result.transactionId,
      }
    }

    if (!refundResult.success) {
      console.error(`❌ Refund failed for payment ${paymentId}:`, refundResult.error)
      return NextResponse.json(
        { error: `Refund failed: ${refundResult.error}` },
        { status: 500 }
      )
    }

    // 4. Update payment status
    await db.externalPayment.update({
      where: { id: paymentId },
      data: { status: 'refunded' }
    })

    // 5. Log admin action
    await db.adminActionLog.create({
      data: {
        adminId: currentUser.profile.id,
        actionType: 'payment_refunded',
        targetEntity: 'external_payment',
        targetId: paymentId,
        details: {
          amount,
          paymentMethod: isPayPal ? 'paypal' : 'card',
          refundId: refundResult.refundId,
          userName: payment.user?.name,
          userEmail: payment.user?.email,
          planId: payment.planId,
        },
      },
    })

    console.log(`✅ Refund processed successfully for payment ${paymentId}`)

    return NextResponse.json({
      success: true,
      refundId: refundResult.refundId,
    })
  } catch (error) {
    console.error('❌ Refund API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
