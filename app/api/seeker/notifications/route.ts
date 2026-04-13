import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { inAppNotificationService } from '@/lib/in-app-notification-service'

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)

    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Log impersonation context for debugging
    if (currentUser.isImpersonating) {
      console.log('🎭 IMPERSONATION: Seeker notifications API called with impersonated user', {
        adminId: currentUser.isImpersonating ? (currentUser as any).adminProfile?.id : undefined,
        impersonatedUserId: currentUser.profile?.id,
        impersonatedRole: currentUser.profile?.role
      })
    }

    // Verify user is a job seeker or admin impersonating a seeker
    if (currentUser.profile.role !== 'seeker' && !(currentUser.isImpersonating && currentUser.profile.role === 'seeker')) {
      console.log('🚫 SEEKER NOTIFICATIONS: Access denied', {
        userRole: currentUser.profile.role,
        isImpersonating: currentUser.isImpersonating,
        userId: currentUser.profile.id,
        adminId: currentUser.isImpersonating ? (currentUser as any).adminProfile?.id : undefined
      })
      return NextResponse.json(
        { error: 'Only job seekers can access notifications' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')

    // Get real notifications from the database
    const result = await inAppNotificationService.getUserNotifications(currentUser.profile.id, limit)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to fetch notifications' },
        { status: 500 }
      )
    }

    // Transform notifications to match frontend format
    const notifications = result.notifications.map((notif: any) => ({
      id: notif.id,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      read: notif.read,
      timestamp: notif.createdAt.toISOString(),
      createdAt: notif.createdAt.toISOString(),
      actionUrl: notif.actionUrl,
      priority: notif.priority,
      data: notif.data
    }))

    const unreadCount = result.unreadCount

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount
    })

  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)

    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Log impersonation context for debugging
    if (currentUser.isImpersonating) {
      console.log('🎭 IMPERSONATION: Seeker notifications POST API called with impersonated user', {
        adminId: currentUser.isImpersonating ? (currentUser as any).adminProfile?.id : undefined,
        impersonatedUserId: currentUser.profile?.id,
        impersonatedRole: currentUser.profile?.role
      })
    }

    // Verify user is a job seeker or admin impersonating a seeker
    if (currentUser.profile.role !== 'seeker' && !(currentUser.isImpersonating && currentUser.profile.role === 'seeker')) {
      console.log('🚫 SEEKER NOTIFICATIONS POST: Access denied', {
        userRole: currentUser.profile.role,
        isImpersonating: currentUser.isImpersonating,
        userId: currentUser.profile.id,
        adminId: currentUser.isImpersonating ? (currentUser as any).adminProfile?.id : undefined
      })
      return NextResponse.json(
        { error: 'Only job seekers can access notifications' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { notificationId, markAsRead, markAllAsRead } = body

    const userId = currentUser.profile.id

    if (markAllAsRead) {
      // Mark all notifications as read
      const result = await inAppNotificationService.markAllAsRead(userId)
      if (!result.success) {
        return NextResponse.json(
          { error: 'Failed to mark all notifications as read' },
          { status: 500 }
        )
      }
      const unreadCount = await inAppNotificationService.getUnreadCount(userId)
      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read',
        unreadCount
      })
    } else if (notificationId && markAsRead !== undefined) {
      // Mark specific notification as read/unread
      if (markAsRead) {
        const result = await inAppNotificationService.markAsRead(notificationId, userId)
        if (!result.success) {
          return NextResponse.json(
            { error: 'Failed to mark notification as read' },
            { status: 500 }
          )
        }
      } else {
        // Mark as unread (new functionality)
        try {
          await db.notification.update({
            where: {
              id: notificationId,
              userId
            },
            data: {
              read: false,
              readAt: null
            }
          })
        } catch (error) {
          console.error('Error marking notification as unread:', error)
          return NextResponse.json(
            { error: 'Failed to mark notification as unread' },
            { status: 500 }
          )
        }
      }
      const unreadCount = await inAppNotificationService.getUnreadCount(userId)
      return NextResponse.json({
        success: true,
        message: markAsRead ? 'Notification marked as read' : 'Notification marked as unread',
        unreadCount
      })
    } else if (notificationId) {
      // Default behavior: mark as read if notificationId is provided
      const result = await inAppNotificationService.markAsRead(notificationId, userId)
      if (!result.success) {
        return NextResponse.json(
          { error: 'Failed to mark notification as read' },
          { status: 500 }
        )
      }
      const unreadCount = await inAppNotificationService.getUnreadCount(userId)
      return NextResponse.json({
        success: true,
        message: 'Notification marked as read',
        unreadCount
      })
    }

    return NextResponse.json(
      { error: 'Invalid request parameters' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error updating notification:', error)
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    )
  }
}
