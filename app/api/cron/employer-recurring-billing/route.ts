import { NextRequest, NextResponse } from 'next/server'
import { EmployerRecurringBillingStripeService } from '@/lib/jobs/employer-recurring-billing-stripe'

export const dynamic = 'force-dynamic'

/**
 * POST /api/cron/employer-recurring-billing
 * Cron endpoint to process employer recurring billing
 * Protected by CRON_SECRET header
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const cronSecret = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
      console.warn('[Employer Recurring Billing] Invalid or missing CRON_SECRET')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('[Employer Recurring Billing] Cron job started')

    // Send renewal reminders first
    const reminderResults = await EmployerRecurringBillingStripeService.sendRenewalReminders()
    console.log('[Employer Recurring Billing] Reminders:', {
      sent: reminderResults.sent,
      errors: reminderResults.errors,
    })

    // Process recurring billing
    const billingResults = await EmployerRecurringBillingStripeService.processEmployerRecurringBilling()
    console.log('[Employer Recurring Billing] Billing:', {
      processed: billingResults.processed,
      successful: billingResults.successful,
      failed: billingResults.failed,
      errors: billingResults.errors,
    })

    return NextResponse.json(
      {
        success: true,
        reminders: reminderResults,
        billing: billingResults,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Employer Recurring Billing] Fatal error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint for health check
 */
export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      status: 'ok',
      endpoint: 'employer-recurring-billing',
      description: 'Cron endpoint for employer recurring billing',
    },
    { status: 200 }
  )
}
