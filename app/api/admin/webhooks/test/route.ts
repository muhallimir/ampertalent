import { NextRequest, NextResponse } from 'next/server'
import { externalWebhookService } from '@/lib/external-webhook-service'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    // Validate URL format
    try {
      new URL(url)
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    // Test the webhook endpoint
    const result = await externalWebhookService.testWebhook(url)

    return NextResponse.json({
      success: result.success,
      responseTime: result.responseTime,
      error: result.error
    })

  } catch (error) {
    console.error('Error testing webhook:', error)
    return NextResponse.json(
      { error: 'Failed to test webhook' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    // Get all configured webhook URLs from environment
    const webhookUrls = {
      seeker: {
        welcome: process.env.EXTERNAL_WEBHOOK_SEEKER_WELCOME,
        applicationStatus: process.env.EXTERNAL_WEBHOOK_SEEKER_APPLICATION_STATUS,
        jobInvitation: process.env.EXTERNAL_WEBHOOK_SEEKER_JOB_INVITATION,
        paymentConfirmation: process.env.EXTERNAL_WEBHOOK_SEEKER_PAYMENT_CONFIRMATION,
        subscriptionReminder: process.env.EXTERNAL_WEBHOOK_SEEKER_SUBSCRIPTION_REMINDER
      },
      employer: {
        welcome: process.env.EXTERNAL_WEBHOOK_EMPLOYER_WELCOME,
        jobApproved: process.env.EXTERNAL_WEBHOOK_EMPLOYER_JOB_APPROVED,
        jobRejected: process.env.EXTERNAL_WEBHOOK_EMPLOYER_JOB_REJECTED,
        newApplication: process.env.EXTERNAL_WEBHOOK_EMPLOYER_NEW_APPLICATION,
        paymentConfirmation: process.env.EXTERNAL_WEBHOOK_EMPLOYER_PAYMENT_CONFIRMATION
      }
    }

    // Filter out undefined/placeholder URLs
    const filterUrls = (urls: Record<string, string | undefined>) => {
      return Object.fromEntries(
        Object.entries(urls).filter(([, url]) => 
          url && !url.startsWith('https://your-external-service.com')
        )
      )
    }

    const configuredUrls = {
      seeker: filterUrls(webhookUrls.seeker),
      employer: filterUrls(webhookUrls.employer)
    }

    return NextResponse.json({
      configured: configuredUrls,
      total: Object.keys(configuredUrls.seeker).length + Object.keys(configuredUrls.employer).length
    })

  } catch (error) {
    console.error('Error getting webhook configuration:', error)
    return NextResponse.json(
      { error: 'Failed to get webhook configuration' },
      { status: 500 }
    )
  }
}