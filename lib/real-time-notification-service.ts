import { broadcastToUser, broadcastToAll } from '@/app/api/notifications/stream/route';

export interface RealTimeNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  actionUrl?: string;
  data?: Record<string, any>;
  showToast?: boolean;
  toastVariant?: 'default' | 'success' | 'destructive';
  toastDuration?: number;
}

class RealTimeNotificationService {
  /**
  /**
   * Send real-time notification to specific user
   */
  async sendToUser(userId: string, notification: RealTimeNotification) {
    try {
      console.log(`Sending real-time notification to user ${userId}:`, notification.title);
      console.log('Notification details:', JSON.stringify(notification, null, 2));

      // Broadcast via SSE
      const sent = broadcastToUser(userId, notification);

      console.log(`Broadcast result for user ${userId}:`, sent);
      if (sent) {
        console.log(`✅ Real-time notification sent to user ${userId}`);
        return { success: true, message: 'Notification sent successfully' };
      } else {
        console.log(`⚠️ User ${userId} not connected to real-time notifications`);
        return { success: false, message: 'User not connected' };
      }
    } catch (error) {
      console.error(`❌ Failed to send real-time notification to user ${userId}:`, error);
      return { success: false, message: 'Failed to send notification', error };
    }
  }

  /**
   * Send real-time notification to all connected users
   */
  async sendToAll(notification: RealTimeNotification) {
    try {
      console.log(`Broadcasting real-time notification to all users:`, notification.title);

      const sentCount = broadcastToAll(notification);

      console.log(`✅ Real-time notification broadcasted to ${sentCount} users`);
      return { success: true, message: `Notification sent to ${sentCount} users`, sentCount };
    } catch (error) {
      console.error(`❌ Failed to broadcast real-time notification:`, error);
      return { success: false, message: 'Failed to broadcast notification', error };
    }
  }

  /**
   * Send payment confirmation toast
   */
  async sendPaymentConfirmation(userId: string, amount: number, description: string, planName: string) {
    const notification: RealTimeNotification = {
      id: `payment_${Date.now()}`,
      type: 'payment_confirmation',
      title: 'Payment Confirmed! 💳',
      message: `Your payment of $${amount} for ${planName} has been processed successfully.`,
      priority: 'high',
      actionUrl: '/billing',
      showToast: true,
      toastVariant: 'success',
      toastDuration: 6000,
      data: { amount, description, planName },
    };

    return this.sendToUser(userId, notification);
  }

  /**
   * Send welcome notification toast
   */
  async sendWelcomeNotification(userId: string, userType: 'seeker' | 'employer', planName?: string) {
    const isSeeker = userType === 'seeker';
    const notification: RealTimeNotification = {
      id: `welcome_${Date.now()}`,
      type: 'welcome',
      title: `Welcome to HireMyMom! 🎉`,
      message: isSeeker
        ? `Your ${planName} membership is now active. Start applying to jobs!`
        : `Your account is ready. Start posting jobs and finding great talent!`,
      priority: 'high',
      actionUrl: isSeeker ? '/seeker/dashboard' : '/employer/dashboard',
      showToast: true,
      toastVariant: 'success',
      toastDuration: 8000,
      data: { userType, planName },
    };

    return this.sendToUser(userId, notification);
  }

  /**
   * Send new application notification toast
   */
  async sendNewApplicationNotification(employerId: string, jobTitle: string, applicantName: string, jobId: string) {
    const notification: RealTimeNotification = {
      id: `application_${Date.now()}`,
      type: 'new_application',
      title: 'New Job Application! 📋',
      message: `${applicantName} applied to your job: ${jobTitle}`,
      priority: 'high',
      actionUrl: `/employer/jobs/${jobId}/applications`,
      showToast: true,
      toastVariant: 'default',
      toastDuration: 7000,
      data: { jobTitle, applicantName, jobId },
    };

    return this.sendToUser(employerId, notification);
  }

  /**
   * Send job invitation notification toast
   */
  async sendJobInvitationNotification(seekerId: string, jobTitle: string, companyName: string, jobId: string) {
    const notification: RealTimeNotification = {
      id: `invitation_${Date.now()}`,
      type: 'job_invitation',
      title: 'Job Invitation Received! 💼',
      message: `${companyName} invited you to apply for: ${jobTitle}`,
      priority: 'high',
      actionUrl: `/seeker/jobs/${jobId}`,
      showToast: true,
      toastVariant: 'success',
      toastDuration: 8000,
      data: { jobTitle, companyName, jobId },
    };

    return this.sendToUser(seekerId, notification);
  }

  /**
   * Send application status update notification toast
   */
  async sendApplicationStatusUpdate(seekerId: string, jobTitle: string, status: string, jobId: string) {
    const statusMessages = {
      interview: "You've been selected for an interview! 🎉",
      hired: "Congratulations! You've been hired! 🎊",
      rejected: 'Your application was not selected this time.',
      withdrawn: 'Your application has been withdrawn.',
    };

    const notification: RealTimeNotification = {
      id: `status_${Date.now()}`,
      type: 'application_status',
      title: 'Application Update',
      message: `${jobTitle}: ${statusMessages[status as keyof typeof statusMessages] || `Status updated to ${status}`}`,
      priority: status === 'hired' || status === 'interview' ? 'high' : 'medium',
      actionUrl: `/seeker/applications`,
      showToast: true,
      toastVariant: status === 'hired' || status === 'interview' ? 'success' : 'default',
      toastDuration: status === 'hired' ? 10000 : 6000,
      data: { jobTitle, status, jobId },
    };

    return this.sendToUser(seekerId, notification);
  }

  /**
   * Send interview stage updates to seekers
   */
  async sendInterviewStageUpdate(
    seekerId: string,
    payload: {
      applicationId: string;
      jobId: string;
      jobTitle: string;
      companyName: string;
      stageKey: string;
      stageLabel: string;
      status?: string;
      interviewScheduledAt?: Date | string | null;
      interviewCompletedAt?: Date | string | null;
    },
  ) {
    const normalizeDate = (value?: Date | string | null) => {
      if (!value) return null;
      const dateValue = value instanceof Date ? value : new Date(value);
      return isNaN(dateValue.getTime()) ? null : dateValue.toISOString();
    };

    const notification: RealTimeNotification = {
      id: `interview_stage_${Date.now()}`,
      type: 'interview_stage_update',
      title: `Interview Update: ${payload.jobTitle}`,
      message: `${payload.companyName} moved your application to ${payload.stageLabel}.`,
      priority: 'high',
      actionUrl: `/seeker/applications`,
      showToast: true,
      toastVariant: 'default',
      toastDuration: 7000,
      data: {
        ...payload,
        interviewStageKey: payload.stageKey,
        interviewStage: payload.stageKey,
        interviewStageLabel: payload.stageLabel,
        interviewScheduledAt: normalizeDate(payload.interviewScheduledAt),
        interviewCompletedAt: normalizeDate(payload.interviewCompletedAt),
      },
    };

    return this.sendToUser(seekerId, notification);
  }

  /**
   * Send job approval notification toast
   */
  async sendJobApprovalNotification(employerId: string, jobTitle: string, jobId: string) {
    const notification: RealTimeNotification = {
      id: `approval_${Date.now()}`,
      type: 'job_approved',
      title: 'Job Approved! ✅',
      message: `Your job posting "${jobTitle}" has been approved and is now live!`,
      priority: 'high',
      actionUrl: `/employer/jobs/${jobId}`,
      showToast: true,
      toastVariant: 'success',
      toastDuration: 7000,
      data: { jobTitle, jobId },
    };
    return this.sendToUser(employerId, notification);
  }

  /**
   * Send subscription cancellation notification toast
   */
  async sendSubscriptionCancellation(userId: string, planName: string, cancellationDate: string) {
    const notification: RealTimeNotification = {
      id: `cancellation_${Date.now()}`,
      type: 'subscription_cancellation',
      title: 'Subscription Canceled! ⚠️',
      message: `Your ${planName} subscription has been canceled. You'll continue to have access until ${cancellationDate}.`,
      priority: 'medium',
      actionUrl: '/seeker/subscription',
      showToast: true,
      toastVariant: 'default',
      toastDuration: 8000,
      data: { planName, cancellationDate },
    };

    console.log('Attempting to send subscription cancellation notification to user:', userId);
    const result = await this.sendToUser(userId, notification);
    console.log('Subscription cancellation notification send result:', result);
    return result;
  }

  /**
   * Send subscription reactivation notification toast
   */
  async sendSubscriptionReactivation(userId: string, planName: string) {
    const notification: RealTimeNotification = {
      id: `reactivation_${Date.now()}`,
      type: 'subscription_reactivation',
      title: 'Subscription Reactivated! ✅',
      message: `Your ${planName} subscription has been reactivated. Enjoy your benefits!`,
      priority: 'high',
      actionUrl: '/seeker/subscription',
      showToast: true,
      toastVariant: 'success',
      toastDuration: 7000,
      data: { planName },
    };

    console.log('Attempting to send subscription reactivation notification to user:', userId);
    const result = await this.sendToUser(userId, notification);
    console.log('Subscription reactivation notification send result:', result);
    return result;
  }

  /**
   * Send subscription renewal notification toast
   */
  async sendSubscriptionRenewal(userId: string, planName: string, amount: number, nextBillingDate: string) {
    const notification: RealTimeNotification = {
      id: `renewal_${Date.now()}`,
      type: 'subscription_renewal',
      title: 'Subscription Renewed! ✅',
      message: `Your ${planName} subscription has been renewed for $${amount}. Next billing date: ${nextBillingDate}.`,
      priority: 'high',
      actionUrl: '/seeker/subscription',
      showToast: true,
      toastVariant: 'success',
      toastDuration: 7000,
      data: { planName, amount, nextBillingDate },
    };

    console.log('Attempting to send subscription renewal notification to user:', userId);
    const result = await this.sendToUser(userId, notification);
    console.log('Subscription renewal notification send result:', result);
    return result;
  }

  /**
   * Send service purchase notification toast
   */
  async sendServicePurchaseNotification(userId: string, serviceName: string, amount: number) {
    const notification: RealTimeNotification = {
      id: `service_purchase_${Date.now()}`,
      type: 'service_purchase',
      title: 'Service Purchase Confirmed! ✅',
      message: `Your purchase of ${serviceName} for $${amount} has been confirmed.`,
      priority: 'high',
      actionUrl: '/seeker/services?tab=history',
      showToast: true,
      toastVariant: 'success',
      toastDuration: 7000,
      data: { serviceName, amount },
    };

    return this.sendToUser(userId, notification);
  }

  /**
   * Send service status update notification toast
   */
  async sendServiceStatusUpdate(userId: string, serviceName: string, newStatus: string) {
    const statusLabels: Record<string, string> = {
      pending: 'Pending',
      in_progress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
    };

    const notification: RealTimeNotification = {
      id: `service_status_${Date.now()}`,
      type: 'service_status_update',
      title: 'Service Update 🔔',
      message: `Your ${serviceName} status is now: ${statusLabels[newStatus] || newStatus}`,
      priority: 'medium',
      actionUrl: '/seeker/services?tab=history',
      showToast: true,
      toastVariant: 'default',
      toastDuration: 6000,
      data: { serviceName, newStatus },
    };

    return this.sendToUser(userId, notification);
  }

  /**
   * Send service completed notification toast
   */
  async sendServiceCompleted(userId: string, serviceName: string) {
    const notification: RealTimeNotification = {
      id: `service_completed_${Date.now()}`,
      type: 'service_completed',
      title: 'Service Completed! 🎉',
      message: `Great news! Your ${serviceName} has been completed by our team.`,
      priority: 'high',
      actionUrl: '/seeker/services?tab=history',
      showToast: true,
      toastVariant: 'success',
      toastDuration: 7000,
      data: { serviceName },
    };

    return this.sendToUser(userId, notification);
  }

  /**
   * Send system notification to admins
   */
  async sendAdminNotification(title: string, message: string, type: string, data?: Record<string, any>) {
    const notification: RealTimeNotification = {
      id: `admin_${Date.now()}`,
      type,
      title,
      message,
      priority: 'high',
      actionUrl: '/admin/dashboard',
      showToast: true,
      toastVariant: 'default',
      toastDuration: 6000,
      data,
    };

    // For now, broadcast to all (in production, you'd filter for admin users)
    return this.sendToAll(notification);
  }
}

export const realTimeNotificationService = new RealTimeNotificationService();
