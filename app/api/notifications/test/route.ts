import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { goHighLevelService } from '@/lib/gohighlevel'
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

    // Test GoHighLevel connection
    const connectionTest = await goHighLevelService.testConnection()

    if (!connectionTest.success) {
      return NextResponse.json({
        success: false,
        error: 'GoHighLevel connection failed',
        details: connectionTest.message
      }, { status: 500 })
    }

    // Send test notification
    const testResult = await notificationService.testNotification(email)

    return NextResponse.json({
      success: testResult.success,
      message: testResult.message,
      connectionStatus: connectionTest.message,
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

    // Test GoHighLevel connection
    const connectionTest = await goHighLevelService.testConnection()

    // Get location info if connection is successful
    let locationInfo = null
    if (connectionTest.success) {
      try {
        locationInfo = await goHighLevelService.getLocationInfo()
      } catch (error) {
        console.error('Error getting location info:', error)
      }
    }

    return NextResponse.json({
      goHighLevel: {
        connected: connectionTest.success,
        message: connectionTest.message,
        locationId: process.env.GOHIGHLEVEL_LOCATION_ID,
        locationInfo
      },
      environment: {
        hasApiKey: false, // GoHighLevel integration removed
        hasLocationId: false, // GoHighLevel integration removed
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