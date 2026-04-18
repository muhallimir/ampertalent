import { NextResponse, NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, UserRole } from '@/lib/auth'
import { inAppNotificationService } from '@/lib/in-app-notification-service'

interface AdminNotification {
  id: string
  type: 'system_alert' | 'user_registration' | 'job_submission' | 'security_alert' | 'backup_complete' | 'new_application'
  title: string
  message: string
  timestamp: Date
  read: boolean
  priority: 'low' | 'medium' | 'high' | 'critical'
  recipient: string
  status: 'sent' | 'delivered' | 'failed' | 'pending'
  userId?: string
  userName?: string
  userProfilePictureUrl?: string
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)

    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role
    const userProfile = await db.userProfile.findUnique({
      where: { clerkUserId: currentUser.clerkUser.id },
      select: { role: true, id: true }
    })

    if (!userProfile || ((userProfile.role as UserRole) !== 'admin' && (userProfile.role as UserRole) !== 'super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    // Get recent admin action logs to generate notifications
    const recentActions = await db.adminActionLog.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: limit * 2, // Get more to filter and transform
      include: {
        admin: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    // Get recent user registrations
    const recentUsers = await db.userProfile.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    })

    // Get recent applications
    const recentApplications = await db.application.findMany({
      where: {
        appliedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      include: {
        seeker: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                profilePictureUrl: true
              }
            }
          }
        },
        job: {
          select: {
            title: true
          }
        }
      },
      orderBy: {
        appliedAt: 'desc'
      },
      take: 5
    })

    // Get pending jobs
    const pendingJobs = await db.job.findMany({
      where: {
        status: 'pending_vetting'
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5,
      include: {
        employer: {
          select: {
            companyName: true
          }
        }
      }
    })

    // Get real notifications from database for the current admin user only
    const realNotificationsResult = await inAppNotificationService.getUserNotifications(userProfile.id, limit * 2, unreadOnly)

    const allAdminNotifications: AdminNotification[] = []

    if (realNotificationsResult.success) {
      realNotificationsResult.notifications.forEach((notification: any) => {
        allAdminNotifications.push({
          id: notification.id,
          type: notification.type === 'job_submitted' ? 'job_submission' :
            notification.type === 'new_application' ? 'new_application' :
              notification.type === 'system_alert' ? 'system_alert' :
                notification.type === 'user_registered' ? 'user_registration' :
                  notification.type === 'payment_received' ? 'system_alert' :
                    notification.type === 'job_approved' ? 'job_submission' :
                      notification.type === 'job_rejected' ? 'job_submission' :
                        notification.type === 'application_submitted' ? 'new_application' :
                          notification.type === 'system_error' ? 'system_alert' :
                            notification.type === 'admin_role_promoted' ? 'system_alert' :
                              notification.type === 'admin_role_demoted' ? 'system_alert' : 'system_alert',
          title: notification.title,
          message: notification.message,
          timestamp: notification.createdAt,
          read: notification.read,
          priority: notification.priority as 'low' | 'medium' | 'high' | 'critical',
          recipient: 'admin@ampertalent.com',
          status: 'delivered',
          userId: notification.data?.employerId || notification.data?.seekerId || notification.data?.userId,
          userName: notification.data?.companyName || notification.data?.seekerName || notification.data?.userName,
          userProfilePictureUrl: notification.data?.profilePictureUrl
        })
      })
    }

    // Add system alert for high job queue if there are many pending jobs
    if (pendingJobs.length > 10) {
      allAdminNotifications.unshift({
        id: `system_alert_${Date.now()}`,
        type: 'system_alert',
        title: 'High Job Queue Alert',
        message: `${pendingJobs.length} jobs are pending review. Consider prioritizing job vetting.`,
        timestamp: new Date(),
        read: false,
        priority: 'critical',
        recipient: 'admin@ampertalent.com',
        status: 'delivered'
      })
    }

    // Add summary notification for pending jobs if any exist
    if (pendingJobs.length > 0 && pendingJobs.length <= 10) {
      allAdminNotifications.unshift({
        id: `job_pending_summary_${Date.now()}`,
        type: 'job_submission',
        title: 'Jobs Pending Review',
        message: `${pendingJobs.length} job posting${pendingJobs.length > 1 ? 's' : ''} require${pendingJobs.length === 1 ? 's' : ''} admin approval`,
        timestamp: pendingJobs[0].createdAt,
        read: false,
        priority: pendingJobs.length > 5 ? 'high' : 'medium',
        recipient: 'admin@ampertalent.com',
        status: 'delivered'
      })
    }

    // Sort by timestamp (newest first) and limit
    const sortedNotifications = allAdminNotifications
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)

    // Filter unread if requested
    const filteredNotifications = unreadOnly
      ? sortedNotifications.filter(n => !n.read)
      : sortedNotifications

    // Calculate stats
    const unreadCount = allAdminNotifications.filter(n => !n.read).length
    const stats = {
      total: allAdminNotifications.length,
      unread: unreadCount,
      byType: allAdminNotifications.reduce((acc, n) => {
        acc[n.type] = (acc[n.type] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }

    return NextResponse.json({
      notifications: filteredNotifications,
      stats
    })
  } catch (error) {
    console.error('Error fetching admin notifications:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)

    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role
    const userProfile = await db.userProfile.findUnique({
      where: { clerkUserId: currentUser.clerkUser.id },
      select: { role: true, id: true }
    })

    if (!userProfile || ((userProfile.role as UserRole) !== 'admin' && (userProfile.role as UserRole) !== 'super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { action, notificationId } = await request.json()

    if (action === 'markAllRead') {
      // Mark all notifications as read using the service
      const result = await inAppNotificationService.markAllAsRead(userProfile.id)

      if (!result.success) {
        return NextResponse.json({ error: 'Failed to mark all notifications as read' }, { status: 500 })
      }

      // Log the action of marking all notifications as read
      await db.adminActionLog.create({
        data: {
          adminId: userProfile.id,
          actionType: 'notifications_mark_read',
          targetEntity: 'notifications',
          targetId: 'all',
          details: {
            action: 'mark_all_read',
            timestamp: new Date().toISOString()
          }
        }
      })

      return NextResponse.json({ success: true, message: 'All notifications marked as read' })
    }

    if (action === 'markRead' && notificationId) {
      // Check if this is a real database notification (not a generated demo one)
      const isRealNotification = !notificationId.startsWith('job_pending_') &&
        !notificationId.startsWith('user_reg_') &&
        !notificationId.startsWith('app_') &&
        !notificationId.startsWith('action_') &&
        !notificationId.startsWith('system_alert_')

      if (!isRealNotification) {
        // For demo notifications, just return success without doing anything
        return NextResponse.json({ success: true, message: 'Demo notification acknowledged' })
      }

      // Mark specific notification as read using the service
      const result = await inAppNotificationService.markAsRead(notificationId, userProfile.id)

      if (!result.success) {
        return NextResponse.json({ error: 'Failed to mark notification as read' }, { status: 500 })
      }

      // Log the action of marking a specific notification as read
      await db.adminActionLog.create({
        data: {
          adminId: userProfile.id,
          actionType: 'notification_mark_read',
          targetEntity: 'notification',
          targetId: notificationId,
          details: {
            action: 'mark_read',
            notificationId,
            timestamp: new Date().toISOString()
          }
        }
      })

      return NextResponse.json({ success: true, message: 'Notification marked as read' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error updating notifications:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}