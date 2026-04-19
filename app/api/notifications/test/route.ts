import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { notificationService } from '@/lib/notification-service'

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser?.clerkUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can test the notification system
    if (currentUser.profile?.role !== 'admin' && currentUser.profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      )
    }

    // Send test notification
    const testResult = await notificationService.testNotification(email)

    return NextResponse.json({
      success: testResult.success,
      message: testResult.message,
      timestamp: new Date().toISOString(),
      testEmail: email
    })

  } catch (error) {
    console.error('Error testing notification system:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to test notification system',
      details: String(error)
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser?.clerkUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can check system status
    if (currentUser.profile?.role !== 'admin' && currentUser.profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({
      crm: {
        connected: false,
        message: 'CRM integration not configured'
      },
      environment: {
        nodeEnv: process.env.NODE_ENV
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error checking notification system status:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to check system status',
      details: String(error)
    }, { status: 500 })
  }
}