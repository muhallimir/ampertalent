import { db } from './db'
import { externalWebhookService } from './external-webhook-service'
import { realTimeNotificationService } from './real-time-notification-service'

export interface CreateNotificationData {
  userId: string
  type: 'job_submitted' | 'job_approved' | 'job_rejected' | 'job_under_review' | 'new_application' | 'application_status_update' | 'job_invitation' | 'low_credits' | 'job_expiring' | 'system_alert' | 'job_archived' | 'job_restored' |
  'seeker_welcome' | 'seeker_payment_confirmation' | 'seeker_subscription_reminder' | 'seeker_pre_signup' |
  'employer_welcome' | 'employer_payment_confirmation' | 'employer_invitation_accepted' | 'employer_job_filled' |
  'system_error' | 'processing_error' | 'bulk_rejection' | 'bulk_interview' | 'interview_stage_changed' |
  'service_purchase_confirmation' | 'service_status_update' | 'service_completed' | 'service_admin_alert' |
  // Exclusive Plan Notification Types
  'exclusive_plan_offered' | 'exclusive_plan_activated' | 'exclusive_plan_dismissed' | 'exclusive_plan_reminder' | 'exclusive_plan_cancelled' | 'exclusive_plan_extended' | 'exclusive_plan_admin_alert' |
  // Extension Request Notification Types
  'exclusive_plan_extension_requested' | 'exclusive_plan_extension_approved' | 'exclusive_plan_extension_rejected'
  title: string
  message: string
  data?: Record<string, any>
  priority?: 'low' | 'medium' | 'high' | 'critical'
  actionUrl?: string
}

/**
 * In-App Notification Service
 * Handles creating and managing in-app notifications (bell dropdown)
 */
export class InAppNotificationService {
  /**
   * Create a new notification
   */
  static async createNotification(data: CreateNotificationData): Promise<{ success: boolean; notificationId?: string }> {
    try {
      const notification = await db.notification.create({
        data: {
          userId: data.userId,
          type: data.type,
          title: data.title,
          message: data.message,
          data: data.data || undefined,
          priority: data.priority || 'medium',
          actionUrl: data.actionUrl || null,
        }
      })

      console.log('📢 IN-APP NOTIFICATION CREATED:', {
        id: notification.id,
        userId: data.userId,
        type: data.type,
        title: data.title
      })

      return {
        success: true,
        notificationId: notification.id
      }
    } catch (error) {
      console.error('Error creating notification:', error)
      return { success: false }
    }
  }

  /**
   * Create notification for job submission (for admins)
   */
  static async notifyJobSubmitted(jobId: string, jobTitle: string, companyName: string): Promise<void> {
    try {
      // Get all admin and super admin users
      const adminUsers = await db.userProfile.findMany({
        where: {
          role: {
            in: ['admin', 'super_admin']
          }
        },
        select: { id: true }
      })

      // Create notification for each admin
      for (const admin of adminUsers) {
        await this.createNotification({
          userId: admin.id,
          type: 'job_submitted',
          title: 'New Job Submission',
          message: `${companyName} submitted "${jobTitle}" for review`,
          data: {
            jobId,
            jobTitle,
            companyName
          },
          priority: 'medium',
          actionUrl: `/admin/jobs`
        })
      }
    } catch (error) {
      console.error('Error creating job submission notifications:', error)
    }
  }

  /**
   * Create notification for job approval (for employer)
   */
  static async notifyJobApproved(employerUserId: string, jobId: string, jobTitle: string): Promise<void> {
    try {
      await this.createNotification({
        userId: employerUserId,
        type: 'job_approved',
        title: 'Job Approved! 🎉',
        message: `Your job posting "${jobTitle}" has been approved and is now live`,
        data: {
          jobId,
          jobTitle
        },
        priority: 'high',
        actionUrl: `/employer/jobs/${jobId}`
      })

      // Send real-time toast notification
      await realTimeNotificationService.sendJobApprovalNotification(employerUserId, jobTitle, jobId)
    } catch (error) {
      console.error('Error creating job approval notification:', error)
    }
  }

  /**
   * Create notification for job declined (for employer)
   */
  static async notifyJobRejected(employerUserId: string, jobId: string, jobTitle: string, rejectionReason?: string): Promise<void> {
    try {
      await this.createNotification({
        userId: employerUserId,
        type: 'job_rejected',
        title: 'Job Posting Declined',
        message: `Your job posting "${jobTitle}" has been declined. Please review the feedback and resubmit with updates.`,
        data: {
          jobId,
          jobTitle,
          rejectionReason
        },
        priority: 'high',
        actionUrl: `/employer/jobs/${jobId}/edit`
      })
    } catch (error) {
      console.error('Error creating job declined notification:', error)
    }
  }

  /**
   * Create notification for job under review (for employer)
   */
  static async notifyJobUnderReview(employerUserId: string, jobId: string, jobTitle: string): Promise<void> {
    try {
      await this.createNotification({
        userId: employerUserId,
        type: 'job_under_review',
        title: 'Job Under Review',
        message: `Your job posting "${jobTitle}" is currently being reviewed by our team`,
        data: {
          jobId,
          jobTitle
        },
        priority: 'medium',
        actionUrl: `/employer/jobs`
      })
    } catch (error) {
      console.error('Error creating job under review notification:', error)
    }
  }

  /**
   * Create notification for new application (for employer)
   */
  static async notifyNewApplication(employerUserId: string, jobId: string, jobTitle: string, applicantName: string, applicationId: string): Promise<void> {
    try {
      await this.createNotification({
        userId: employerUserId,
        type: 'new_application',
        title: 'New Application Received',
        message: `${applicantName} applied for "${jobTitle}"`,
        data: {
          jobId,
          jobTitle,
          applicantName,
          applicationId
        },
        priority: 'high',
        actionUrl: `/employer/jobs/${jobId}/applications`
      })

      // Send real-time toast notification
      await realTimeNotificationService.sendNewApplicationNotification(employerUserId, jobTitle, applicantName, jobId)
    } catch (error) {
      console.error('Error creating new application notification:', error)
    }
  }

  /**
   * Create notification for job invitation (for job seeker)
   */
  static async notifyJobInvitation(
    seekerUserId: string,
    jobId: string,
    jobTitle: string,
    companyName: string,
    employerMessage?: string,
    employerEmail?: string
  ): Promise<void> {
    try {
      const message = employerMessage
        ? `${companyName} invited you to apply for "${jobTitle}": ${employerMessage}`
        : `${companyName} invited you to apply for the position: ${jobTitle}`

      await this.createNotification({
        userId: seekerUserId,
        type: 'job_invitation',
        title: `Job Invitation: ${jobTitle}`,
        message,
        data: {
          jobId,
          jobTitle,
          companyName,
          employerMessage
        },
        priority: 'high',
        actionUrl: `/seeker/jobs/${jobId}`
      })

      // Get user details for external webhook
      const userProfile = await db.userProfile.findUnique({
        where: { id: seekerUserId },
        select: {
          clerkUserId: true,
          firstName: true,
          email: true
        }
      })

      if (userProfile?.email) {
        // Send external webhook notification
        await externalWebhookService.sendSeekerJobInvitation({
          userId: seekerUserId,
          email: userProfile.email,
          firstName: userProfile.firstName || 'User',
          jobId,
          jobTitle,
          companyName,
          employerMessage,
          jobUrl: `${process.env.NEXT_PUBLIC_APP_URL}/seeker/jobs/${jobId}`,
          employerEmail: employerEmail || ''
        })
      }
    } catch (error) {
      console.error('Error creating job invitation notification:', error)
    }
  }

  /**
   * Get notifications for a user
   */
  static async getUserNotifications(userId: string, limit: number = 20, unreadOnly: boolean = false) {
    try {
      const notifications = await db.notification.findMany({
        where: {
          userId,
          ...(unreadOnly && { read: false })
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      })

      const unreadCount = await db.notification.count({
        where: {
          userId,
          read: false
        }
      })

      return {
        success: true,
        notifications,
        unreadCount
      }
    } catch (error) {
      console.error('Error fetching user notifications:', error)
      return {
        success: false,
        notifications: [],
        unreadCount: 0
      }
    }
  }

  /**
   * Get unread notification count for a user
   */
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      return await db.notification.count({
        where: {
          userId,
          read: false
        }
      })
    } catch (error) {
      console.error('Error fetching unread notification count:', error)
      return 0
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, userId: string): Promise<{ success: boolean }> {
    try {
      await db.notification.update({
        where: {
          id: notificationId,
          userId // Ensure user owns the notification
        },
        data: {
          read: true,
          readAt: new Date()
        }
      })

      return { success: true }
    } catch (error) {
      console.error('Error marking notification as read:', error)
      return { success: false }
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string): Promise<{ success: boolean }> {
    try {
      await db.notification.updateMany({
        where: {
          userId,
          read: false
        },
        data: {
          read: true,
          readAt: new Date()
        }
      })

      return { success: true }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      return { success: false }
    }
  }

  /**
   * Delete old notifications (cleanup)
   */
  static async cleanupOldNotifications(daysOld: number = 30): Promise<{ success: boolean; deletedCount?: number }> {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000)

      const result = await db.notification.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate
          },
          read: true // Only delete read notifications
        }
      })

      console.log(`🧹 CLEANED UP ${result.count} old notifications`)

      return {
        success: true,
        deletedCount: result.count
      }
    } catch (error) {
      console.error('Error cleaning up old notifications:', error)
      return { success: false }
    }
  }
  /**
   * Create notification for seeker welcome
   */
  static async notifySeekerWelcome(seekerUserId: string, membershipPlan?: string): Promise<void> {
    try {
      await this.createNotification({
        userId: seekerUserId,
        type: 'seeker_welcome',
        title: 'Welcome to HireMyMom! 🎉',
        message: `Your account is ready! Start exploring job opportunities.${membershipPlan ? ` You're on the ${membershipPlan} plan.` : ''}`,
        data: { membershipPlan },
        priority: 'high',
        actionUrl: '/seeker/jobs'
      })

      // Send real-time toast notification
      await realTimeNotificationService.sendWelcomeNotification(seekerUserId, 'seeker', membershipPlan)
    } catch (error) {
      console.error('Error creating seeker welcome notification:', error)
    }
  }

  /**
   * Create notification for seeker payment confirmation
   */
  static async notifySeekerPaymentConfirmation(
    seekerUserId: string,
    amount: number,
    description: string,
    transactionId: string | null,
    planName?: string
  ): Promise<void> {

    const message = !['CANCEL', 'REACTIVATE'].includes(transactionId)
      ? `Your payment of $${amount} for ${description} has been processed successfully.`
      : `${description} has been processed successfully.`

    try {
      await this.createNotification({
        userId: seekerUserId,
        type: 'seeker_payment_confirmation',
        title: !['CANCEL', 'REACTIVATE'].includes(transactionId) ? 'Payment Confirmed ✅' : (transactionId == 'CANCEL' ? 'Subscription Canceled Successfully' : 'Subscription Reactivated Successfully'),
        message: message,
        data: { amount, description, transactionId, planName },
        priority: 'high',
        actionUrl: '/seeker/subscription'
      })

      // Send real-time toast notification
      await realTimeNotificationService.sendPaymentConfirmation(seekerUserId, amount, description, planName || 'subscription')
    } catch (error) {
      console.error('Error creating seeker payment confirmation notification:', error)
    }
  }

  /**
   * Create notification for seeker subscription cancellation
   */
  static async notifySeekerSubscriptionCancellation(
    seekerUserId: string,
    planName: string,
    cancellationDate: string
  ): Promise<void> {
    try {
      await this.createNotification({
        userId: seekerUserId,
        type: 'seeker_payment_confirmation',
        title: 'Subscription Canceled',
        message: `Your ${planName} subscription will be canceled at the end of the billing period. You'll continue to have access until ${cancellationDate}.`,
        data: { planName, cancellationDate },
        priority: 'medium',
        actionUrl: '/seeker/subscription'
      })

      // Send real-time toast notification
      console.log('Attempting to send real-time subscription cancellation notification');
      const cancellationResult = await realTimeNotificationService.sendSubscriptionCancellation(
        seekerUserId,
        planName,
        cancellationDate
      )
      console.log('Real-time subscription cancellation notification result:', cancellationResult);

      if (!cancellationResult.success) {
        console.warn('Failed to send real-time subscription cancellation notification:', cancellationResult.message);
      }
    } catch (error) {
      console.error('Error creating seeker subscription cancellation notification:', error)
    }
  }

  /**
   * Create notification for seeker subscription reactivation
   */
  static async notifySeekerSubscriptionReactivation(
    seekerUserId: string,
    planName: string
  ): Promise<void> {
    try {
      await this.createNotification({
        userId: seekerUserId,
        type: 'seeker_payment_confirmation',
        title: 'Subscription Reactivated',
        message: `Your ${planName} subscription has been reactivated. Enjoy your benefits!`,
        data: { planName },
        priority: 'high',
        actionUrl: '/seeker/subscription'
      })

      // Send real-time toast notification
      console.log('Attempting to send real-time subscription reactivation notification');
      const reactivationResult = await realTimeNotificationService.sendSubscriptionReactivation(seekerUserId, planName)
      console.log('Real-time subscription reactivation notification result:', reactivationResult);

      if (!reactivationResult.success) {
        console.warn('Failed to send real-time subscription reactivation notification:', reactivationResult.message);
      }
    } catch (error) {
      console.error('Error creating seeker subscription reactivation notification:', error)
    }
  }

  /**
   * Create notification for subscription renewal
   */
  static async notifySeekerSubscriptionRenewal(
    seekerUserId: string,
    planName: string,
    amount: number,
    nextBillingDate: Date
  ): Promise<void> {
    try {
      const nextBillingDateStr = nextBillingDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })

      await this.createNotification({
        userId: seekerUserId,
        type: 'seeker_subscription_reminder',
        title: 'Subscription Renewed ✅',
        message: `Your ${planName} subscription has been renewed for $${amount.toFixed(2)}. Next billing date: ${nextBillingDateStr}`,
        data: {
          planName,
          amount,
          nextBillingDate: nextBillingDate.toISOString()
        },
        priority: 'high',
        actionUrl: '/seeker/subscription'
      })

      // Send real-time toast notification
      console.log('Attempting to send real-time subscription renewal notification');
      const renewalResult = await realTimeNotificationService.sendSubscriptionRenewal(
        seekerUserId,
        planName,
        amount,
        nextBillingDateStr
      )
      console.log('Real-time subscription renewal notification result:', renewalResult);

      if (!renewalResult.success) {
        console.warn('Failed to send real-time subscription renewal notification:', renewalResult.message);
      }
    } catch (error) {
      console.error('Error creating seeker subscription renewal notification:', error)
    }
  }

  /**
   * Create notification for employer welcome
   */
  static async notifyEmployerWelcome(employerUserId: string, companyName: string, packageType?: string): Promise<void> {
    try {
      await this.createNotification({
        userId: employerUserId,
        type: 'employer_welcome',
        title: 'Welcome to HireMyMom! 🎉',
        message: `${companyName} is ready to start hiring! Post your first job to find qualified candidates.${packageType ? ` You're on the ${packageType} package.` : ''}`,
        data: { companyName, packageType },
        priority: 'high',
        actionUrl: '/employer/jobs/create'
      })

      // Send real-time toast notification
      await realTimeNotificationService.sendWelcomeNotification(employerUserId, 'employer', packageType)
    } catch (error) {
      console.error('Error creating employer welcome notification:', error)
    }
  }

  /**
   * Create notification for employer payment confirmation
   */
  static async notifyEmployerPaymentConfirmation(
    employerUserId: string,
    amount: number,
    description: string,
    transactionId: string,
    packageName?: string,
    creditsPurchased?: number
  ): Promise<void> {
    try {
      await this.createNotification({
        userId: employerUserId,
        type: 'employer_payment_confirmation',
        title: 'Payment Confirmed ✅',
        message: `Your payment of $${amount} for ${description} has been processed successfully.${creditsPurchased ? ` ${creditsPurchased} credits added to your account.` : ''}`,
        data: { amount, description, transactionId, packageName, creditsPurchased },
        priority: 'high',
        actionUrl: '/employer/billing'
      })

      // Send real-time toast notification
      await realTimeNotificationService.sendPaymentConfirmation(employerUserId, amount, description, packageName || 'package')
    } catch (error) {
      console.error('Error creating employer payment confirmation notification:', error)
    }
  }

  /**
   * Create notification for job filled
   */
  static async notifyJobFilled(
    employerUserId: string,
    jobId: string,
    jobTitle: string,
    hiredCandidateName: string
  ): Promise<void> {
    try {
      await this.createNotification({
        userId: employerUserId,
        type: 'employer_job_filled',
        title: 'Job Filled! 🎉',
        message: `Congratulations! "${jobTitle}" has been filled by ${hiredCandidateName}.`,
        data: { jobId, jobTitle, hiredCandidateName },
        priority: 'high',
        actionUrl: `/employer/jobs/${jobId}`
      })
    } catch (error) {
      console.error('Error creating job filled notification:', error)
    }
  }

  /**
   * Create notification for invitation accepted
   */
  static async notifyInvitationAccepted(
    employerUserId: string,
    jobId: string,
    jobTitle: string,
    candidateName: string,
    applicationId: string
  ): Promise<void> {
    try {
      await this.createNotification({
        userId: employerUserId,
        type: 'employer_invitation_accepted',
        title: 'Job Invitation Accepted! 🎉',
        message: `${candidateName} accepted your invitation and applied for "${jobTitle}".`,
        data: { jobId, jobTitle, candidateName, applicationId },
        priority: 'high',
        actionUrl: `/employer/jobs/${jobId}/applications`
      })
    } catch (error) {
      console.error('Error creating invitation accepted notification:', error)
    }
  }

  /**
   * Create notification for application status update (for seekers)
   */
  static async notifyApplicationStatusUpdate(
    seekerUserId: string,
    jobId: string,
    jobTitle: string,
    companyName: string,
    status: 'reviewed' | 'interview' | 'rejected' | 'hired',
    applicationId: string,
    isReconsideration?: boolean,
    message?: string
  ): Promise<void> {
    try {
      const statusMessages = {
        reviewed: isReconsideration ? 'Amazing news! Your application has been reconsidered and you\'re back in the running! 🌟' : 'Your application has been reviewed',
        interview: 'You\'ve been invited for an interview! 🎉',
        rejected: 'You were not selected for this position',
        hired: 'Congratulations! You\'ve been hired! 🎉'
      }

      const priorities = {
        reviewed: 'medium' as const,
        interview: 'high' as const,
        rejected: 'medium' as const,
        hired: 'critical' as const
      }

      await this.createNotification({
        userId: seekerUserId,
        type: 'application_status_update',
        title: status === 'rejected' ? 'Application Update' : `Application Update: ${jobTitle}`,
        message: message || (status === 'rejected' ? `${statusMessages[status]} for ${jobTitle}.` : `${statusMessages[status]} for "${jobTitle}" at ${companyName}.`),
        data: { jobId, jobTitle, companyName, status, applicationId },
        priority: priorities[status],
        actionUrl: `/seeker/applications`
      })
    } catch (error) {
      console.error('Error creating application status update notification:', error)
    }
  }

  /**
   * Create system error notification for admins
   */
  static async notifySystemError(
    errorType: string,
    errorMessage: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    errorContext?: Record<string, any>
  ): Promise<void> {
    try {
      // Get all admin and super admin users
      const adminUsers = await db.userProfile.findMany({
        where: {
          role: {
            in: ['admin', 'super_admin']
          }
        },
        select: { id: true }
      })

      // Create notification for each admin
      for (const admin of adminUsers) {
        await this.createNotification({
          userId: admin.id,
          type: 'system_error',
          title: `System Error: ${errorType}`,
          message: errorMessage,
          data: { errorType, errorContext, severity },
          priority: severity,
          actionUrl: '/admin/logs'
        })
      }
    } catch (error) {
      console.error('Error creating system error notifications:', error)
    }
  }

  /**
   * Create notification for user registration (for admins)
   */
  static async notifyUserRegistered(
    userId: string,
    userName: string,
    userRole: 'seeker' | 'employer'
  ): Promise<void> {
    try {
      // Get all admin and super admin users
      const adminUsers = await db.userProfile.findMany({
        where: {
          role: {
            in: ['admin', 'super_admin']
          }
        },
        select: { id: true }
      })

      // Create notification for each admin
      for (const admin of adminUsers) {
        await this.createNotification({
          userId: admin.id,
          type: 'system_alert',
          title: 'New User Registration',
          message: `${userName} joined as a ${userRole}`,
          data: {
            newUserId: userId,
            userName,
            userRole
          },
          priority: 'low',
          actionUrl: '/admin/users'
        })
      }

      // Send real-time notification to admins
      await realTimeNotificationService.sendAdminNotification(
        'New User Registration',
        `${userName} joined as a ${userRole}`,
        'low'
      )
    } catch (error) {
      console.error('Error creating user registration notifications:', error)
    }
  }

  /**
   * Create notification for new application (for admins)
   */
  static async notifyAdminNewApplication(
    jobId: string,
    jobTitle: string,
    applicantName: string,
    companyName: string,
    applicationId: string
  ): Promise<void> {
    try {
      // Get all admin and super admin users
      const adminUsers = await db.userProfile.findMany({
        where: {
          role: {
            in: ['admin', 'super_admin']
          }
        },
        select: { id: true }
      })

      // Create notification for each admin
      for (const admin of adminUsers) {
        await this.createNotification({
          userId: admin.id,
          type: 'new_application',
          title: 'New Job Application',
          message: `${applicantName} applied for "${jobTitle}" at ${companyName}`,
          data: {
            jobId,
            jobTitle,
            applicantName,
            companyName,
            applicationId
          },
          priority: 'medium',
          actionUrl: `/admin/applications`
        })
      }
    } catch (error) {
      console.error('Error creating admin new application notifications:', error)
    }
  }

  /**
   * Create notification for payment received (for admins)
   */
  static async notifyPaymentReceived(
    userId: string,
    userName: string,
    amount: number,
    planName: string,
    userRole: 'seeker' | 'employer'
  ): Promise<void> {
    try {
      // Get all admin and super admin users
      const adminUsers = await db.userProfile.findMany({
        where: {
          role: {
            in: ['admin', 'super_admin']
          }
        },
        select: { id: true }
      })

      // Create notification for each admin
      for (const admin of adminUsers) {
        await this.createNotification({
          userId: admin.id,
          type: 'system_alert',
          title: 'Payment Received',
          message: `${userName} (${userRole}) purchased ${planName} for $${amount}`,
          data: {
            paymentUserId: userId,
            userName,
            amount,
            planName,
            userRole
          },
          priority: 'low',
          actionUrl: '/admin/billing'
        })
      }
    } catch (error) {
      console.error('Error creating payment received notifications:', error)
    }
  }

  /**
   * Notify seeker about interview stage update
   */
  static async notifyInterviewStageUpdate(
    seekerId: string,
    jobId: string,
    jobTitle: string,
    companyName: string,
    stage: string,
    applicationId: string
  ): Promise<{ success: boolean }> {
    try {
      // Determine notification message based on stage type
      let title: string
      let message: string

      const offerStages = ['Offer Extended', 'Offer Accepted', 'Offer Declined', 'Initial Screening']

      if (offerStages.includes(stage)) {
        // Offer stage notifications
        if (stage === 'Offer Extended') {
          title = `Job Offer: ${jobTitle}`
          message = `Congratulations! ${companyName} has extended a job offer for ${jobTitle}. Check your application for details.`
        } else if (stage === 'Offer Accepted') {
          title = `Offer Accepted: ${jobTitle}`
          message = `Great news! Your job offer for ${jobTitle} at ${companyName} has been accepted. Welcome to the team!`
        } else if (stage === 'Offer Declined') {
          title = `Application Update: ${jobTitle}`
          message = `Your application for ${jobTitle} at ${companyName} was not selected this time. Keep applying!`
        } else {
          title = `Application Update: ${jobTitle}`
          message = `Your application status for ${jobTitle} at ${companyName} has been updated to: ${stage}`
        }
      } else {
        // Interview stage notifications
        title = `Interview Update: ${jobTitle}`
        message = `Your interview for ${jobTitle} at ${companyName} has moved to: ${stage}`
      }

      await this.createNotification({
        userId: seekerId,
        type: 'interview_stage_changed',
        title,
        message,
        data: {
          jobId,
          jobTitle,
          companyName,
          stage,
          applicationId
        },
        priority: 'high',
        actionUrl: `/seeker/jobs/${jobId}`
      })

      return { success: true }
    } catch (error) {
      console.error('Error creating interview stage update notification:', error)
      return { success: false }
    }
  }

  /**
   * Notify user about service purchase confirmation
   */
  static async notifyServicePurchaseConfirmation(
    userId: string,
    serviceName: string,
    amount: number,
    purchaseId: string
  ): Promise<void> {
    try {
      await this.createNotification({
        userId,
        type: 'service_purchase_confirmation',
        title: 'Service Purchase Confirmed ✅',
        message: `Your purchase of ${serviceName} for $${amount} has been confirmed. Our team will contact you within 1-2 business days.`,
        data: {
          serviceName,
          amount,
          purchaseId
        },
        priority: 'high',
        actionUrl: '/seeker/services?tab=history'
      })

      // Send real-time toast notification
      await realTimeNotificationService.sendServicePurchaseNotification(userId, serviceName, amount)
    } catch (error) {
      console.error('Error creating service purchase confirmation notification:', error)
    }
  }

  /**
   * Notify user about service status update
   */
  static async notifyServiceStatusUpdate(
    userId: string,
    serviceName: string,
    oldStatus: string,
    newStatus: string,
    purchaseId: string
  ): Promise<void> {
    try {
      const statusLabels: Record<string, string> = {
        pending: 'Pending',
        in_progress: 'In Progress',
        completed: 'Completed',
        cancelled: 'Cancelled'
      }

      await this.createNotification({
        userId,
        type: 'service_status_update',
        title: 'Service Update 🔔',
        message: `Your ${serviceName} status changed from ${statusLabels[oldStatus] || oldStatus} to ${statusLabels[newStatus] || newStatus}.`,
        data: {
          serviceName,
          oldStatus,
          newStatus,
          purchaseId
        },
        priority: 'medium',
        actionUrl: '/seeker/services?tab=history'
      })

      // Send real-time toast notification
      await realTimeNotificationService.sendServiceStatusUpdate(userId, serviceName, newStatus)
    } catch (error) {
      console.error('Error creating service status update notification:', error)
    }
  }

  /**
   * Notify user about service completion
   */
  static async notifyServiceCompleted(
    userId: string,
    serviceName: string,
    purchaseId: string
  ): Promise<void> {
    try {
      await this.createNotification({
        userId,
        type: 'service_completed',
        title: 'Service Completed! 🎉',
        message: `Great news! Your ${serviceName} has been completed by our team. Check the details for more information.`,
        data: {
          serviceName,
          purchaseId
        },
        priority: 'high',
        actionUrl: '/seeker/services?tab=history'
      })

      // Send real-time toast notification
      await realTimeNotificationService.sendServiceCompleted(userId, serviceName)
    } catch (error) {
      console.error('Error creating service completed notification:', error)
    }
  }

  /**
   * Notify admins about new service purchase
   */
  static async notifyAdminServicePurchase(
    serviceName: string,
    userName: string,
    amount: number,
    purchaseId: string
  ): Promise<void> {
    try {
      // Get all admin and super admin users
      const adminUsers = await db.userProfile.findMany({
        where: {
          role: {
            in: ['admin', 'super_admin']
          }
        },
        select: { id: true }
      })

      // Create notification for each admin
      for (const admin of adminUsers) {
        await this.createNotification({
          userId: admin.id,
          type: 'service_admin_alert',
          title: 'New Service Purchase 🛍️',
          message: `${userName} purchased ${serviceName} for $${amount}. Review and contact customer within 1-2 business days.`,
          data: {
            serviceName,
            userName,
            amount,
            purchaseId
          },
          priority: 'high',
          actionUrl: '/admin/services'
        })
      }

      // Send real-time notification to admins
      await realTimeNotificationService.sendAdminNotification(
        'New Service Purchase',
        `${userName} purchased ${serviceName} for $${amount}`,
        'high'
      )
    } catch (error) {
      console.error('Error creating admin service purchase notifications:', error)
    }
  }

  // ============================================
  // EXCLUSIVE PLAN NOTIFICATIONS
  // ============================================

  /**
   * Notify employer that they have an exclusive plan offer available
   * Called when admin offers exclusive plan to existing employer
   */
  static async notifyExclusivePlanOffered(
    employerUserId: string,
    planName: string,
    amountCents: number,
    cycles: number
  ): Promise<void> {
    try {
      const amountFormatted = `$${(amountCents / 100).toFixed(2)}`

      await this.createNotification({
        userId: employerUserId,
        type: 'exclusive_plan_offered',
        title: 'Exclusive Offer Just For You! 🎁',
        message: `You've been offered an exclusive ${planName} plan at ${amountFormatted}/month for ${cycles} months. Click to learn more and activate.`,
        data: {
          planName,
          amountCents,
          cycles,
          amountFormatted,
          totalValue: amountCents * cycles
        },
        priority: 'high',
        actionUrl: '/employer/billing'
      })

      // Send real-time toast notification
      await realTimeNotificationService.sendToUser(employerUserId, {
        id: `exclusive_plan_offered_${Date.now()}`,
        type: 'exclusive_plan_offered',
        title: 'Exclusive Offer Available! 🎁',
        message: `You've been offered an exclusive ${planName} plan. Check your billing page!`,
        priority: 'high',
        actionUrl: '/employer/billing',
        showToast: true,
        toastVariant: 'success'
      })

      console.log(`📢 Exclusive plan offered notification sent to employer ${employerUserId}`)
    } catch (error) {
      console.error('Error creating exclusive plan offered notification:', error)
    }
  }

  /**
   * Notify employer when their exclusive plan is activated (after payment)
   */
  static async notifyExclusivePlanActivated(
    employerUserId: string,
    planName: string,
    amountCents: number
  ): Promise<void> {
    try {
      const amountFormatted = `$${(amountCents / 100).toFixed(2)}`

      await this.createNotification({
        userId: employerUserId,
        type: 'exclusive_plan_activated',
        title: 'Exclusive Plan Activated! 🚀',
        message: `Your ${planName} subscription is now active. You'll be billed ${amountFormatted}/month. Start posting jobs now!`,
        data: {
          planName,
          amountCents,
          amountFormatted
        },
        priority: 'high',
        actionUrl: '/employer/dashboard'
      })

      // Send real-time toast notification
      await realTimeNotificationService.sendToUser(employerUserId, {
        id: `exclusive_plan_activated_${Date.now()}`,
        type: 'exclusive_plan_activated',
        title: 'Plan Activated! 🚀',
        message: `Your ${planName} is now active. Start posting jobs!`,
        priority: 'high',
        actionUrl: '/employer/dashboard',
        showToast: true,
        toastVariant: 'success'
      })

      console.log(`📢 Exclusive plan activated notification sent to employer ${employerUserId}`)
    } catch (error) {
      console.error('Error creating exclusive plan activated notification:', error)
    }
  }

  /**
   * Notify admins when an exclusive plan offer is given to an employer
   */
  static async notifyAdminExclusivePlanOffered(
    employerName: string,
    employerEmail: string,
    employerUserId: string,
    planName: string,
    amountCents: number,
    cycles: number,
    offeredByAdminId: string
  ): Promise<void> {
    try {
      const amountFormatted = `$${(amountCents / 100).toFixed(2)}`
      const totalValue = (amountCents * cycles) / 100

      // Get all admin and super admin users
      const adminUsers = await db.userProfile.findMany({
        where: {
          role: {
            in: ['admin', 'super_admin']
          }
        },
        select: { id: true }
      })

      // Create notification for each admin
      for (const admin of adminUsers) {
        await this.createNotification({
          userId: admin.id,
          type: 'exclusive_plan_admin_alert',
          title: 'Exclusive Plan Offered 📋',
          message: `${employerName} (${employerEmail}) was offered ${planName} at ${amountFormatted}/mo for ${cycles} months (total: $${totalValue.toFixed(2)})`,
          data: {
            employerName,
            employerEmail,
            employerUserId,
            planName,
            amountCents,
            cycles,
            totalValue: totalValue * 100,
            offeredByAdminId
          },
          priority: 'medium',
          actionUrl: '/admin/subscription-management?tab=exclusive-offers'
        })
      }

      console.log(`📢 Admin notification sent for exclusive plan offered to ${employerEmail}`)
    } catch (error) {
      console.error('Error creating admin exclusive plan offered notifications:', error)
    }
  }

  /**
   * Notify admins when an employer activates their exclusive plan
   */
  static async notifyAdminExclusivePlanActivated(
    employerName: string,
    employerEmail: string,
    employerUserId: string,
    planName: string,
    amountCents: number,
    transactionId: string
  ): Promise<void> {
    try {
      const amountFormatted = `$${(amountCents / 100).toFixed(2)}`

      // Get all admin and super admin users
      const adminUsers = await db.userProfile.findMany({
        where: {
          role: {
            in: ['admin', 'super_admin']
          }
        },
        select: { id: true }
      })

      // Create notification for each admin
      for (const admin of adminUsers) {
        await this.createNotification({
          userId: admin.id,
          type: 'exclusive_plan_admin_alert',
          title: 'Exclusive Plan Activated! 💰',
          message: `${employerName} (${employerEmail}) activated ${planName} - First payment of ${amountFormatted} received!`,
          data: {
            employerName,
            employerEmail,
            employerUserId,
            planName,
            amountCents,
            transactionId
          },
          priority: 'high',
          actionUrl: '/admin/subscription-management?tab=exclusive-offers'
        })
      }

      // Send real-time notification to admins
      await realTimeNotificationService.sendAdminNotification(
        'Exclusive Plan Activated! 💰',
        `${employerName} activated ${planName} - ${amountFormatted} payment received`,
        'high'
      )

      console.log(`📢 Admin notification sent for exclusive plan activation by ${employerEmail}`)
    } catch (error) {
      console.error('Error creating admin exclusive plan activated notifications:', error)
    }
  }

  /**
   * Notify admins when an employer dismisses their exclusive plan offer
   * (For abandoned cart tracking)
   */
  static async notifyAdminExclusivePlanDismissed(
    employerName: string,
    employerEmail: string,
    employerUserId: string,
    planName: string,
    amountCents: number
  ): Promise<void> {
    try {
      const amountFormatted = `$${(amountCents / 100).toFixed(2)}`

      // Get all super admin users (only super admins for dismissal tracking)
      const superAdminUsers = await db.userProfile.findMany({
        where: {
          role: 'super_admin'
        },
        select: { id: true }
      })

      // Create notification for each super admin
      for (const admin of superAdminUsers) {
        await this.createNotification({
          userId: admin.id,
          type: 'exclusive_plan_admin_alert',
          title: 'Exclusive Plan Dismissed ⏳',
          message: `${employerName} (${employerEmail}) dismissed ${planName} offer (${amountFormatted}/mo). Consider follow-up.`,
          data: {
            employerName,
            employerEmail,
            employerUserId,
            planName,
            amountCents,
            dismissedAt: new Date().toISOString()
          },
          priority: 'low',
          actionUrl: '/admin/subscription-management?tab=exclusive-offers'
        })
      }

      console.log(`📢 Admin notification sent for exclusive plan dismissal by ${employerEmail}`)
    } catch (error) {
      console.error('Error creating admin exclusive plan dismissed notifications:', error)
    }
  }

  /**
   * Send a reminder notification to employer about their pending exclusive plan offer
   */
  static async notifyExclusivePlanReminder(
    employerUserId: string,
    planName: string,
    amountCents: number,
    daysRemaining?: number
  ): Promise<void> {
    try {
      const amountFormatted = `$${(amountCents / 100).toFixed(2)}`
      const urgencyText = daysRemaining && daysRemaining <= 7
        ? `Only ${daysRemaining} days left!`
        : 'Don\'t miss out!'

      await this.createNotification({
        userId: employerUserId,
        type: 'exclusive_plan_reminder',
        title: 'Exclusive Offer Reminder ⏰',
        message: `Your exclusive ${planName} offer at ${amountFormatted}/month is waiting! ${urgencyText}`,
        data: {
          planName,
          amountCents,
          amountFormatted,
          daysRemaining
        },
        priority: 'medium',
        actionUrl: '/employer/billing'
      })

      console.log(`📢 Exclusive plan reminder sent to employer ${employerUserId}`)
    } catch (error) {
      console.error('Error creating exclusive plan reminder notification:', error)
    }
  }

  /**
   * Notify admins when an employer cancels their exclusive/recurring plan
   */
  static async notifyAdminExclusivePlanCancelled(
    employerName: string,
    employerEmail: string,
    employerUserId: string,
    planName: string,
    amountCents: number,
    cyclesCompleted: number,
    cyclesTotal: number
  ): Promise<void> {
    try {
      const amountFormatted = `$${(amountCents / 100).toFixed(2)}`
      const revenueCollected = (amountCents / 100) * cyclesCompleted

      // Get all admin and super admin users
      const adminUsers = await db.userProfile.findMany({
        where: {
          role: {
            in: ['admin', 'super_admin']
          }
        },
        select: { id: true }
      })

      // Create notification for each admin
      for (const admin of adminUsers) {
        await this.createNotification({
          userId: admin.id,
          type: 'exclusive_plan_admin_alert',
          title: 'Exclusive Plan Cancelled ❌',
          message: `${employerName} (${employerEmail}) cancelled ${planName} after ${cyclesCompleted}/${cyclesTotal} payments. Revenue collected: $${revenueCollected.toFixed(2)}`,
          data: {
            employerName,
            employerEmail,
            employerUserId,
            planName,
            amountCents,
            cyclesCompleted,
            cyclesTotal,
            revenueCollected: revenueCollected * 100,
            cancelledAt: new Date().toISOString()
          },
          priority: 'high',
          actionUrl: '/admin/subscription-management?tab=exclusive-offers'
        })
      }

      console.log(`📢 Admin notification sent for exclusive plan cancellation by ${employerEmail}`)
    } catch (error) {
      console.error('Error creating admin exclusive plan cancelled notifications:', error)
    }
  }

  /**
   * Notify employer when their exclusive/recurring plan is cancelled
   */
  static async notifyExclusivePlanCancelled(
    employerUserId: string,
    planName: string,
    cyclesCompleted: number,
    cyclesTotal: number
  ): Promise<void> {
    try {
      const remainingCycles = cyclesTotal - cyclesCompleted

      await this.createNotification({
        userId: employerUserId,
        type: 'exclusive_plan_cancelled',
        title: 'Subscription Cancelled',
        message: `Your ${planName} subscription has been cancelled. You had ${remainingCycles} payments remaining. Your current benefits will remain active until the end of the billing period.`,
        data: {
          planName,
          cyclesCompleted,
          cyclesTotal,
          remainingCycles,
          cancelledAt: new Date().toISOString()
        },
        priority: 'medium',
        actionUrl: '/employer/billing'
      })

      console.log(`📢 Exclusive plan cancellation confirmation sent to employer ${employerUserId}`)
    } catch (error) {
      console.error('Error creating exclusive plan cancellation notification:', error)
    }
  }

  /**
   * Notify employer when admin extends their exclusive plan
   */
  static async notifyExclusivePlanExtended(
    employerUserId: string,
    additionalMonths: number,
    newTotalMonths: number,
    amountCents: number
  ): Promise<void> {
    try {
      const amountFormatted = `$${(amountCents / 100).toFixed(2)}`

      await this.createNotification({
        userId: employerUserId,
        type: 'exclusive_plan_extended',
        title: 'Your Plan Has Been Extended! 🎉',
        message: `Great news! Your subscription has been extended by ${additionalMonths} months. You now have ${newTotalMonths} total months at ${amountFormatted}/month. Your job posting will continue to stay active.`,
        data: {
          additionalMonths,
          newTotalMonths,
          amountCents,
          extendedAt: new Date().toISOString()
        },
        priority: 'high',
        actionUrl: '/employer/billing'
      })

      console.log(`📢 Exclusive plan extension notification sent to employer ${employerUserId}`)
    } catch (error) {
      console.error('Error creating exclusive plan extension notification:', error)
    }
  }

  /**
   * Notify admins when an exclusive plan is extended
   */
  static async notifyAdminExclusivePlanExtended(
    employerName: string,
    employerEmail: string,
    employerUserId: string,
    additionalMonths: number,
    newTotalMonths: number,
    amountCents: number,
    excludeAdminId?: string
  ): Promise<void> {
    try {
      // Get all admin users (except the one who performed the action)
      const adminUsers = await db.userProfile.findMany({
        where: {
          role: { in: ['admin', 'super_admin'] },
          ...(excludeAdminId ? { id: { not: excludeAdminId } } : {})
        },
        select: { id: true }
      })

      const amountFormatted = `$${(amountCents / 100).toFixed(2)}`

      // Create notification for each admin
      for (const admin of adminUsers) {
        await this.createNotification({
          userId: admin.id,
          type: 'exclusive_plan_admin_alert',
          title: 'Exclusive Plan Extended',
          message: `${employerName}'s (${employerEmail}) exclusive plan has been extended by ${additionalMonths} months. New total: ${newTotalMonths} months at ${amountFormatted}/month.`,
          data: {
            employerUserId,
            employerName,
            employerEmail,
            additionalMonths,
            newTotalMonths,
            amountCents,
            extendedAt: new Date().toISOString()
          },
          priority: 'medium',
          actionUrl: '/admin/subscription-management?tab=exclusive-offers'
        })
      }

      console.log(`📢 Admin notifications sent for exclusive plan extension for ${employerEmail}`)
    } catch (error) {
      console.error('Error creating admin exclusive plan extended notifications:', error)
    }
  }

  /**
   * Notify employer when a recurring billing payment is successful
   * Called by the employer recurring billing cron job
   */
  static async notifyEmployerRecurringPaymentSuccess(
    employerUserId: string,
    planName: string,
    amount: number,
    cycleNumber: number,
    totalCycles: number
  ): Promise<void> {
    try {
      const remainingCycles = totalCycles - cycleNumber

      await this.createNotification({
        userId: employerUserId,
        type: 'employer_payment_confirmation',
        title: 'Payment Processed ✅',
        message: `Your ${planName} payment of $${(amount / 100).toFixed(2)} for month ${cycleNumber} of ${totalCycles} has been processed. ${remainingCycles > 0 ? `${remainingCycles} payments remaining.` : 'This was your final payment.'}`,
        data: {
          planName,
          amount,
          cycleNumber,
          totalCycles,
          remainingCycles,
          processedAt: new Date().toISOString()
        },
        priority: 'medium',
        actionUrl: '/employer/billing'
      })

      console.log(`📢 Recurring payment success notification sent to employer ${employerUserId}`)
    } catch (error) {
      console.error('Error creating recurring payment success notification:', error)
    }
  }

  /**
   * Notify employer when a recurring payment fails
   * Called by the employer recurring billing cron job when payment processing fails
   */
  static async notifyEmployerRecurringPaymentFailed(
    employerUserId: string,
    planName: string,
    amountCents: number,
    errorMessage: string
  ): Promise<void> {
    try {
      await this.createNotification({
        userId: employerUserId,
        type: 'employer_payment_confirmation',
        title: 'Payment Failed ❌',
        message: `We were unable to process your ${planName} payment of $${(amountCents / 100).toFixed(2)}. Please update your payment method to avoid service interruption. Error: ${errorMessage}`,
        data: {
          planName,
          amount: amountCents,
          error: errorMessage,
          failedAt: new Date().toISOString()
        },
        priority: 'high',
        actionUrl: '/employer/billing'
      })

      console.log(`📢 Recurring payment failure notification sent to employer ${employerUserId}`)
    } catch (error) {
      console.error('Error creating recurring payment failure notification:', error)
    }
  }

  /**
   * Notify employer when their exclusive plan has completed all billing cycles
   * Called by the employer recurring billing cron job when final payment is processed
   */
  static async notifyEmployerPackageCompleted(
    employerUserId: string,
    planName: string,
    totalCycles: number
  ): Promise<void> {
    try {
      await this.createNotification({
        userId: employerUserId,
        type: 'exclusive_plan_cancelled', // Using cancelled type since it's plan end
        title: 'Subscription Completed 🎉',
        message: `Congratulations! Your ${planName} subscription has completed all ${totalCycles} payments. Your job posting has been active for the full duration. Thank you for being with us!`,
        data: {
          planName,
          totalCycles,
          completedAt: new Date().toISOString()
        },
        priority: 'high',
        actionUrl: '/employer/billing'
      })

      console.log(`📢 Package completion notification sent to employer ${employerUserId}`)
    } catch (error) {
      console.error('Error creating package completion notification:', error)
    }
  }

  /**
   * Notify all admins when an employer requests a plan extension
   */
  static async notifyAdminExtensionRequested(
    employerName: string,
    employerEmail: string,
    employerUserId: string,
    requestedMonths: number,
    cyclesCompleted: number,
    cyclesTotal: number,
    amountCents: number
  ): Promise<void> {
    try {
      // Get all admin users
      const adminUsers = await db.userProfile.findMany({
        where: {
          role: { in: ['admin', 'super_admin'] }
        },
        select: { id: true }
      })

      const amountFormatted = `$${(amountCents / 100).toFixed(2)}`

      // Create notification for each admin
      for (const admin of adminUsers) {
        await this.createNotification({
          userId: admin.id,
          type: 'exclusive_plan_extension_requested',
          title: 'Extension Request Pending 📩',
          message: `${employerName} (${employerEmail}) has requested a ${requestedMonths}-month extension to their exclusive plan. Current progress: ${cyclesCompleted}/${cyclesTotal} payments at ${amountFormatted}/month. Action required.`,
          data: {
            employerUserId,
            employerName,
            employerEmail,
            requestedMonths,
            cyclesCompleted,
            cyclesTotal,
            amountCents,
            requestedAt: new Date().toISOString()
          },
          priority: 'high',
          actionUrl: `/admin/subscription-management?tab=exclusive-offers&highlight=${employerUserId}`
        })
      }

      console.log(`📢 Admin notifications sent for extension request from ${employerEmail}`)
    } catch (error) {
      console.error('Error creating admin extension request notifications:', error)
    }
  }

  /**
   * Notify employer when their extension request is approved
   */
  static async notifyEmployerExtensionApproved(
    employerUserId: string,
    requestedMonths: number,
    newTotalMonths: number,
    amountCents: number
  ): Promise<void> {
    try {
      const amountFormatted = `$${(amountCents / 100).toFixed(2)}`

      await this.createNotification({
        userId: employerUserId,
        type: 'exclusive_plan_extension_approved',
        title: 'Extension Request Approved! 🎉',
        message: `Great news! Your extension request for ${requestedMonths} additional months has been approved. Your plan now has ${newTotalMonths} total months at ${amountFormatted}/month. Your job posting will continue to stay active.`,
        data: {
          requestedMonths,
          newTotalMonths,
          amountCents,
          approvedAt: new Date().toISOString()
        },
        priority: 'high',
        actionUrl: '/employer/billing'
      })

      console.log(`📢 Extension approved notification sent to employer ${employerUserId}`)
    } catch (error) {
      console.error('Error creating extension approved notification:', error)
    }
  }

  /**
   * Notify employer when their extension request is rejected
   */
  static async notifyEmployerExtensionRejected(
    employerUserId: string,
    requestedMonths: number
  ): Promise<void> {
    try {
      await this.createNotification({
        userId: employerUserId,
        type: 'exclusive_plan_extension_rejected',
        title: 'Extension Request Status',
        message: `Your extension request for ${requestedMonths} additional months was not approved at this time. Your current plan remains unchanged. Please contact support if you have any questions.`,
        data: {
          requestedMonths,
          rejectedAt: new Date().toISOString()
        },
        priority: 'medium',
        actionUrl: '/employer/billing'
      })

      console.log(`📢 Extension rejected notification sent to employer ${employerUserId}`)
    } catch (error) {
      console.error('Error creating extension rejected notification:', error)
    }
  }

  /**
   * Notify all admins when an employer recurring payment is processed successfully
   * Called by the employer recurring billing cron job
   */
  static async notifyAdminsRecurringPaymentSuccess(
    employerName: string,
    companyName: string,
    planName: string,
    amountCents: number,
    cycleNumber: number,
    totalCycles: number,
    transactionId?: string
  ): Promise<void> {
    try {
      // Get all admin and super admin users
      const adminUsers = await db.userProfile.findMany({
        where: {
          role: {
            in: ['admin', 'super_admin']
          }
        },
        select: { id: true }
      })

      const amountFormatted = `$${(amountCents / 100).toFixed(2)}`
      const remainingCycles = totalCycles - cycleNumber

      // Create notification for each admin
      for (const admin of adminUsers) {
        await this.createNotification({
          userId: admin.id,
          type: 'exclusive_plan_admin_alert',
          title: '💰 Recurring Payment Processed',
          message: `${companyName} (${employerName}) - ${planName}: Payment ${cycleNumber}/${totalCycles} of ${amountFormatted} processed successfully.${remainingCycles > 0 ? ` ${remainingCycles} payments remaining.` : ' Final payment!'}`,
          data: {
            employerName,
            companyName,
            planName,
            amountCents,
            cycleNumber,
            totalCycles,
            remainingCycles,
            transactionId,
            processedAt: new Date().toISOString()
          },
          priority: 'low',
          actionUrl: '/admin/super-admin/recurring-billing?tab=employers'
        })
      }

      console.log(`📢 Recurring payment success notification sent to ${adminUsers.length} admins`)
    } catch (error) {
      console.error('Error creating admin recurring payment success notification:', error)
    }
  }

  /**
   * Notify all admins when an employer recurring payment fails
   * Called by the employer recurring billing cron job when payment processing fails
   */
  static async notifyAdminsRecurringPaymentFailed(
    employerName: string,
    companyName: string,
    planName: string,
    amountCents: number,
    cycleNumber: number,
    totalCycles: number,
    errorMessage: string
  ): Promise<void> {
    try {
      // Get all admin and super admin users
      const adminUsers = await db.userProfile.findMany({
        where: {
          role: {
            in: ['admin', 'super_admin']
          }
        },
        select: { id: true }
      })

      const amountFormatted = `$${(amountCents / 100).toFixed(2)}`

      // Create notification for each admin
      for (const admin of adminUsers) {
        await this.createNotification({
          userId: admin.id,
          type: 'exclusive_plan_admin_alert',
          title: '⚠️ Recurring Payment Failed',
          message: `${companyName} (${employerName}) - ${planName}: Payment ${cycleNumber}/${totalCycles} of ${amountFormatted} FAILED. Error: ${errorMessage}`,
          data: {
            employerName,
            companyName,
            planName,
            amountCents,
            cycleNumber,
            totalCycles,
            errorMessage,
            failedAt: new Date().toISOString()
          },
          priority: 'high',
          actionUrl: '/admin/super-admin/recurring-billing?tab=employers'
        })
      }

      console.log(`📢 Recurring payment failure notification sent to ${adminUsers.length} admins`)
    } catch (error) {
      console.error('Error creating admin recurring payment failure notification:', error)
    }
  }

  /**
   * Notify all admins when an employer package completes all billing cycles
   */
  static async notifyAdminsPackageCompleted(
    employerName: string,
    companyName: string,
    planName: string,
    totalCycles: number,
    totalRevenueCents: number
  ): Promise<void> {
    try {
      // Get all admin and super admin users
      const adminUsers = await db.userProfile.findMany({
        where: {
          role: {
            in: ['admin', 'super_admin']
          }
        },
        select: { id: true }
      })

      const totalRevenueFormatted = `$${(totalRevenueCents / 100).toFixed(2)}`

      // Create notification for each admin
      for (const admin of adminUsers) {
        await this.createNotification({
          userId: admin.id,
          type: 'exclusive_plan_admin_alert',
          title: '🎉 Subscription Completed',
          message: `${companyName} (${employerName}) has completed their ${planName} subscription! All ${totalCycles} payments processed. Total revenue: ${totalRevenueFormatted}`,
          data: {
            employerName,
            companyName,
            planName,
            totalCycles,
            totalRevenueCents,
            completedAt: new Date().toISOString()
          },
          priority: 'medium',
          actionUrl: '/admin/super-admin/recurring-billing?tab=employers'
        })
      }

      console.log(`📢 Package completion notification sent to ${adminUsers.length} admins`)
    } catch (error) {
      console.error('Error creating admin package completion notification:', error)
    }
  }
}

// Export singleton instance
export const inAppNotificationService = InAppNotificationService
