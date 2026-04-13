import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { inAppNotificationService } from '@/lib/in-app-notification-service'

export async function GET(request: NextRequest) {
  try {
    console.log('📢 EMPLOYER NOTIFICATIONS: GET request started')

    const currentUser = await getCurrentUser(request)
    if (!currentUser?.clerkUser || !currentUser?.profile) {
      console.error('❌ EMPLOYER NOTIFICATIONS: No authenticated user or profile')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ EMPLOYER NOTIFICATIONS: User authenticated', {
      userId: currentUser.profile?.id,
      role: currentUser.profile?.role
    })

    // Log impersonation context for debugging
    if (currentUser.isImpersonating) {
      console.log('🎭 IMPERSONATION: Employer notifications GET API called with impersonated user', {
        adminId: currentUser.isImpersonating ? (currentUser as any).adminProfile?.id : undefined,
        impersonatedUserId: currentUser.profile?.id,
        impersonatedRole: currentUser.profile?.role
      })
    }

    // Verify user is an employer or admin impersonating an employer
    if (currentUser.profile.role !== 'employer' && !(currentUser.isImpersonating && currentUser.profile.role === 'employer')) {
      console.log('🚫 EMPLOYER NOTIFICATIONS GET: Access denied', {
        userRole: currentUser.profile.role,
        isImpersonating: currentUser.isImpersonating,
        userId: currentUser.profile.id,
        adminId: currentUser.isImpersonating ? (currentUser as any).adminProfile?.id : undefined
      })
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Ensure employer profile exists
    if (!currentUser.profile.employer) {
      console.error('❌ EMPLOYER NOTIFICATIONS: No employer profile found', {
        userId: currentUser.profile.id
      })
      return NextResponse.json({ error: 'Employer profile not found' }, { status: 403 })
    }

    console.log('✅ EMPLOYER NOTIFICATIONS: Employer profile found', {
      userId: currentUser.profile.id,
      employerId: currentUser.profile.employer.userId
    })

    // Check if this is a count-only request
    const url = new URL(request.url)
    const countOnly = url.searchParams.get('count_only') === 'true'

    console.log('📊 EMPLOYER NOTIFICATIONS: Request type', {
      countOnly,
      fullUrl: request.url
    })

    // Get real notifications from database
    console.log('📥 EMPLOYER NOTIFICATIONS: Fetching from database for userId:', currentUser.profile.id)
    const result = await inAppNotificationService.getUserNotifications(currentUser.profile.id, countOnly ? 0 : 20, false)

    if (!result.success) {
      console.error('❌ EMPLOYER NOTIFICATIONS: Failed to fetch from service', {
        userId: currentUser.profile.id,
        result
      })
      return NextResponse.json(
        { error: 'Failed to fetch notifications' },
        { status: 500 }
      )
    }

    console.log('✅ EMPLOYER NOTIFICATIONS: Fetched from database', {
      notificationCount: result.notifications.length,
      unreadCount: result.unreadCount,
      countOnly
    })

    // If count-only request, return minimal response
    if (countOnly) {
      const response = {
        success: true,
        unreadCount: result.unreadCount
      }

      console.log('📤 EMPLOYER NOTIFICATIONS: Returning count-only response', {
        unreadCount: response.unreadCount
      })

      return NextResponse.json(response)
    }

    // Transform database notifications to frontend format
    const transformedNotifications = result.notifications.map((notification: any, index: number) => {
      try {
        const transformed = {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          timestamp: notification.createdAt.toISOString(),
          timeAgo: getTimeAgo(notification.createdAt),
          isRead: notification.read,
          actionUrl: (() => {
            if (notification.actionUrl) return notification.actionUrl
            // Fallback: derive URL from notification data for follow_up_request
            if (notification.type === 'follow_up_request') {
              const data = notification.data as any
              const applicationId = data?.applicationId
              return applicationId
                ? `/employer/applications?applicationId=${applicationId}`
                : '/employer/applications'
            }
            return '/employer/dashboard'
          })(),
          priority: notification.priority === 'high' ? 'high' : notification.priority === 'critical' ? 'high' : 'normal',
          data: notification.data || {}
        }

        console.log(`📦 EMPLOYER NOTIFICATIONS: Transformed notification ${index + 1}/${result.notifications.length}`, {
          id: transformed.id,
          type: transformed.type,
          title: transformed.title,
          hasData: !!transformed.data,
          dataKeys: Object.keys(transformed.data || {})
        })

        return transformed
      } catch (transformError) {
        console.error(`❌ EMPLOYER NOTIFICATIONS: Error transforming notification ${index + 1}`, {
          notificationId: notification.id,
          error: transformError instanceof Error ? transformError.message : String(transformError),
          notification: JSON.stringify(notification, null, 2)
        })
        throw transformError
      }
    })

    console.log('✅ EMPLOYER NOTIFICATIONS: All notifications transformed successfully', {
      count: transformedNotifications.length
    })

    const response = {
      success: true,
      notifications: transformedNotifications,
      unreadCount: result.unreadCount
    }

    console.log('📤 EMPLOYER NOTIFICATIONS: Returning response', {
      notificationCount: response.notifications.length,
      unreadCount: response.unreadCount
    })

    return NextResponse.json(response)

  } catch (error) {
    console.error('💥 EMPLOYER NOTIFICATIONS: Unexpected error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json(
      {
        error: 'Failed to fetch notifications',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser?.clerkUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Log impersonation context for debugging
    if (currentUser.isImpersonating) {
      console.log('🎭 IMPERSONATION: Employer notifications PUT API called with impersonated user', {
        adminId: currentUser.isImpersonating ? (currentUser as any).adminProfile?.id : undefined,
        impersonatedUserId: currentUser.profile?.id,
        impersonatedRole: currentUser.profile?.role
      })
    }

    // Verify user is an employer or admin impersonating an employer
    if (currentUser.profile.role !== 'employer' && !(currentUser.isImpersonating && currentUser.profile.role === 'employer')) {
      console.log('🚫 EMPLOYER NOTIFICATIONS PUT: Access denied', {
        userRole: currentUser.profile.role,
        isImpersonating: currentUser.isImpersonating,
        userId: currentUser.profile.id,
        adminId: currentUser.isImpersonating ? (currentUser as any).adminProfile?.id : undefined
      })
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { notificationId, markAsRead, markAllAsRead } = body

    if (markAllAsRead) {
      // Mark all notifications as read
      const result = await inAppNotificationService.markAllAsRead(currentUser.profile.id)

      if (!result.success) {
        return NextResponse.json(
          { error: 'Failed to mark all notifications as read' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read'
      })
    } else if (notificationId && markAsRead) {
      // Mark specific notification as read
      const result = await inAppNotificationService.markAsRead(notificationId, currentUser.profile.id)

      if (!result.success) {
        return NextResponse.json(
          { error: 'Failed to mark notification as read' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Notification marked as read'
      })
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  } catch (error) {
    console.error('Error updating notification:', error)
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    )
  }
}

function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'just now'
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes}m ago`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours}h ago`
  } else {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days}d ago`
  }
}