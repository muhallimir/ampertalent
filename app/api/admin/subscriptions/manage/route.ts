import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { ExternalWebhookService } from '@/lib/external-webhook-service'

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)

    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role
    if (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id, action, status, cancelAt } = await request.json()

    if (!id || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: id, action' },
        { status: 400 }
      )
    }

    // Find the subscription
    const subscription = await db.subscription.findUnique({
      where: { id },
      include: {
        seeker: {
          include: {
            user: true
          }
        }
      }
    })

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      )
    }

    let updatedSubscription

    switch (action) {
      case 'cancel':
        updatedSubscription = await db.subscription.update({
          where: { id },
          data: {
            status: 'canceled',
            cancelAtPeriodEnd: true,
            updatedAt: new Date()
          }
        })
        break

      case 'schedule_cancel': {
        const newPeriodEnd = cancelAt ? new Date(cancelAt) : subscription.currentPeriodEnd
        updatedSubscription = await db.subscription.update({
          where: { id },
          data: {
            cancelAtPeriodEnd: true,
            ...(cancelAt ? { currentPeriodEnd: newPeriodEnd } : {}),
            updatedAt: new Date()
          }
        })
        // Sync membershipExpiresAt so the cron picks up the cancellation at the right time
        if (newPeriodEnd && subscription.seekerId) {
          await db.jobSeeker.update({
            where: { userId: subscription.seekerId },
            data: { membershipExpiresAt: newPeriodEnd, updatedAt: new Date() }
          })
        }
        break
      }

      case 'reactivate':
        updatedSubscription = await db.subscription.update({
          where: { id },
          data: {
            status: 'active',
            cancelAtPeriodEnd: false,
            updatedAt: new Date()
          }
        })
        break

      case 'update':
        if (!status) {
          return NextResponse.json(
            { error: 'Status is required for update action' },
            { status: 400 }
          )
        }
        updatedSubscription = await db.subscription.update({
          where: { id },
          data: {
            status: status as any,
            updatedAt: new Date()
          }
        })
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    // Log cancellation specifically
    if (action === 'schedule_cancel') {
      try {
        await db.subscriptionCancellationLog.create({
          data: {
            subscriptionId: id,
            adminId: currentUser.profile.id,
            seekerId: subscription.seekerId,
            previousPeriodEnd: subscription.currentPeriodEnd ?? null,
            newPeriodEnd: cancelAt ? new Date(cancelAt) : (subscription.currentPeriodEnd ?? null),
          }
        })
      } catch (logError) {
        console.error('Failed to save cancellation log:', logError)
      }
    }

    // Log the admin action
    await db.adminActionLog.create({
      data: {
        adminId: currentUser.profile.id,
        actionType: 'subscription_management',
        targetEntity: 'subscription',
        targetId: id,
        details: {
          action,
          previousStatus: subscription.status,
          newStatus: updatedSubscription.status,
          userId: subscription.seekerId,
          timestamp: new Date().toISOString()
        }
      }
    })

    // Create notification for the user
    await db.notification.create({
      data: {
        userId: subscription.seeker.user.id,
        type: 'system_alert',
        title: 'Subscription Updated',
        message: `Your subscription has been ${action === 'cancel' ? 'canceled' : action === 'schedule_cancel' ? 'scheduled for cancellation at period end' : action === 'reactivate' ? 'reactivated' : 'updated'} by an administrator.`,
        priority: 'medium',
        data: {
          subscriptionId: id,
          action,
          newStatus: updatedSubscription.status
        }
      }
    })

    // Send external webhook notification
    try {
      await ExternalWebhookService.sendSeekerSubscriptionChanged({
        userId: subscription.seeker.user.id,
        email: subscription.seeker.user.email || '',
        firstName: subscription.seeker.user.name.split(' ')[0] || 'User',
        action: action as 'cancel' | 'reactivate',
        oldPlan: subscription.plan,
        newPlan: subscription.plan,
        effectiveDate: new Date().toISOString(),
        manageUrl: `${process.env.NEXT_PUBLIC_APP_URL}/seeker/subscription`,
        reason: `Subscription ${action} by administrator`
      })
    } catch (webhookError) {
      console.error('Failed to send subscription change webhook:', webhookError)
      // Don't fail the main operation if webhook fails
    }

    return NextResponse.json({
      success: true,
      message: `Subscription ${action}ed successfully`,
      subscription: {
        ...updatedSubscription,
        legacyId: updatedSubscription.legacyId?.toString() ?? null,
      }
    })
  } catch (error) {
    console.error('Error managing subscription:', error)
    return NextResponse.json(
      { error: 'Failed to manage subscription' },
      { status: 500 }
    )
  }
}