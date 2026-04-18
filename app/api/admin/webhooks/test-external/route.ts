import { NextRequest, NextResponse } from 'next/server'
import { ExternalWebhookService } from '@/lib/external-webhook-service'

export async function POST(request: NextRequest) {
  try {
    const { webhookType, testData } = await request.json()

    console.log('🧪 WEBHOOK-TEST: Testing external webhook:', webhookType)

    let result

    switch (webhookType) {
      case 'seeker_pre_signup':
        result = await ExternalWebhookService.sendSeekerPreSignup({
          userId: testData?.userId || 'test_user_123',
          email: testData?.email || 'test@example.com',
          firstName: testData?.firstName || 'Test',
          lastName: testData?.lastName || 'User',
          selectedPlan: testData?.selectedPlan || 'trial',
          planName: testData?.planName || '3 Day Free Trial',
          checkoutUrl: testData?.checkoutUrl || 'https://checkout.ampertalent.com/test',
          expiresAt: testData?.expiresAt || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
        })
        break

      case 'seeker_payment_confirmation':
        result = await ExternalWebhookService.sendSeekerPaymentConfirmation({
          userId: testData?.userId || 'test_user_123',
          email: testData?.email || 'test@example.com',
          firstName: testData?.firstName || 'Test',
          amount: testData?.amount || 9.99,
          description: testData?.description || 'Test subscription payment',
          transactionId: testData?.transactionId || 'test_txn_123',
          planName: testData?.planName || '3 Day Free Trial'
        })
        break

      case 'system_error':
        result = await ExternalWebhookService.sendSystemError({
          userId: testData?.userId || 'test_user_123',
          email: testData?.email || 'test@example.com',
          firstName: testData?.firstName || 'Test',
          userType: testData?.userType || 'seeker',
          errorType: testData?.errorType || 'test_error',
          errorMessage: testData?.errorMessage || 'This is a test error message',
          errorContext: testData?.errorContext || { test: true },
          severity: testData?.severity || 'medium'
        })
        break

      default:
        return NextResponse.json({ error: 'Unknown webhook type' }, { status: 400 })
    }

    console.log('🧪 WEBHOOK-TEST: Result:', result)

    return NextResponse.json({
      success: true,
      webhookType,
      result
    })

  } catch (error) {
    console.error('❌ WEBHOOK-TEST: Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}