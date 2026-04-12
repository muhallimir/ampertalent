import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { notificationService, NotificationType } from '@/lib/notification-service'

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser?.clerkUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can send arbitrary notifications
    if (currentUser.profile?.role !== 'admin' && currentUser.profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { type, data } = body

    if (!type || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: type, data' },
        { status: 400 }
      )
    }

    let result: { success: boolean; messageId?: string }

    // Route to appropriate notification method based on type
    switch (type as NotificationType) {
      case 'welcome_seeker':
        result = await notificationService.sendWelcomeSeeker(data)
        break

      case 'welcome_employer':
        result = await notificationService.sendWelcomeEmployer(data)
        break

      case 'job_approved':
        result = await notificationService.sendJobApproved(data)
        break

      case 'job_rejected':
        result = await notificationService.sendJobRejected(data)
        break

      case 'new_application':
        result = await notificationService.sendNewApplication(data)
        break

      case 'application_status_update':
        result = await notificationService.sendApplicationStatusUpdate(data)
        break

      case 'payment_confirmation':
        result = await notificationService.sendPaymentConfirmation(data)
        break

      case 'subscription_reminder':
        result = await notificationService.sendSubscriptionReminder(data)
        break

      default:
        return NextResponse.json(
          { error: `Unknown notification type: ${type}` },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: result.success,
      messageId: result.messageId,
      type,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error sending notification:', error)
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser?.clerkUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can view notification stats
    if (currentUser.profile?.role !== 'admin' && currentUser.profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const url = new URL(request.url)
    const days = parseInt(url.searchParams.get('days') || '30')

    const stats = await notificationService.getNotificationStats(days)

    return NextResponse.json({
      stats,
      period: `${days} days`,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error getting notification stats:', error)
    return NextResponse.json(
      { error: 'Failed to get notification statistics' },
      { status: 500 }
    )
  }
}