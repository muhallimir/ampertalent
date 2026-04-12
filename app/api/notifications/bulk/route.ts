import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { notificationService } from '@/lib/notification-service'

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser?.clerkUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can send bulk notifications
    if (currentUser.profile?.role !== 'admin' && currentUser.profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { emails, subject, html, text, tags } = body

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: 'Emails array is required and must not be empty' },
        { status: 400 }
      )
    }

    if (!subject || !html) {
      return NextResponse.json(
        { error: 'Subject and HTML content are required' },
        { status: 400 }
      )
    }

    // Validate email addresses
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const invalidEmails = emails.filter(email => !emailRegex.test(email))

    if (invalidEmails.length > 0) {
      return NextResponse.json(
        {
          error: 'Invalid email addresses found',
          invalidEmails
        },
        { status: 400 }
      )
    }

    // Limit bulk size to prevent abuse
    if (emails.length > 1000) {
      return NextResponse.json(
        { error: 'Maximum 1000 emails allowed per bulk send' },
        { status: 400 }
      )
    }

    // Send bulk notification
    const result = await notificationService.sendBulkNotification(
      emails,
      subject,
      html,
      text,
      tags
    )

    return NextResponse.json({
      success: result.success,
      failed: result.failed,
      errors: result.errors,
      totalEmails: emails.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error sending bulk notification:', error)
    return NextResponse.json(
      { error: 'Failed to send bulk notification' },
      { status: 500 }
    )
  }
}