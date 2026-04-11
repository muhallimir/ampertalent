import { goHighLevelService } from './gohighlevel'
import { emailTemplates } from './email-templates'
import { externalWebhookService } from './external-webhook-service'
import { sendEmail, getAdminNotificationRecipients } from './resend'

// Feature flag for customer payment emails
const isCustomerPaymentEmailsEnabled = (): boolean => {
  return process.env.ENABLE_CUSTOMER_PAYMENT_EMAILS === 'true'
}

// Notification types
export type NotificationType =
  | 'welcome_seeker'
  | 'welcome_employer'
  | 'job_approved'
  | 'job_rejected'
  | 'new_application'
  | 'application_status_update'
  | 'payment_confirmation'
  | 'subscription_reminder'
  | 'team_invitation'
  | 'interview_scheduled'
  | 'interview_completed'
  | 'interview_stage_changed'

// Notification data interfaces
export interface WelcomeSeekerData {
  firstName: string
  email: string
  loginUrl: string
}

export interface WelcomeEmployerData {
  firstName: string
  companyName: string
  email: string
  loginUrl: string
}

export interface JobApprovedData {
  firstName: string
  jobTitle: string
  jobId: string
  jobUrl: string
  companyName: string
  email: string
}

export interface JobRejectedData {
  firstName: string
  jobTitle: string
  rejectionReason: string
  companyName: string
  editUrl: string
  email: string
}

export interface NewApplicationData {
  firstName: string
  jobTitle: string
  candidateName: string
  applicationUrl: string
  companyName: string
  email: string
  candidateEmail: string
}

export interface ApplicationStatusUpdateData {
  firstName: string
  jobTitle: string
  companyName: string
  status: 'reviewed' | 'interview' | 'rejected' | 'hired'
  message?: string
  jobUrl: string
  email: string
  employerEmail: string
  isReconsideration?: boolean
}

export interface PaymentConfirmationData {
  firstName: string
  email: string
  amount: number
  description: string
  transactionId: string
  invoiceUrl?: string
}

export interface SubscriptionReminderData {
  firstName: string
  plan: string
  renewalDate: string
  amount: number
  manageUrl: string
  email: string
}

export interface TeamInvitationData {
  firstName: string
  email: string
  companyName: string
  inviterName: string
  role: string
  acceptUrl: string
}

export interface InterviewScheduledData {
  firstName: string
  jobTitle: string
  companyName: string
  interviewDate: string
  interviewType: string
  jobUrl: string
  email: string
  employerEmail: string
}

export interface InterviewCompletedData {
  firstName: string
  jobTitle: string
  companyName: string
  feedback?: string
  nextSteps: string
  jobUrl: string
  email: string
  employerEmail: string
}

export interface InterviewStageUpdateData {
  firstName: string
  jobTitle: string
  companyName: string
  stage: string
  notes?: string
  nextAction?: string
  jobUrl: string
  email: string
  employerEmail: string
}

/**
 * Notification Service
 * Handles sending various types of notifications through GoHighLevel and external webhooks
 */
export class NotificationService {
  /**
   * Send welcome email to new job seeker
   */
  static async sendWelcomeSeeker(data: WelcomeSeekerData & { userId: string }): Promise<{ success: boolean; messageId?: string }> {
    try {
      const template = emailTemplates.welcomeSeeker(data)

      // Create/update contact with seeker tags
      await goHighLevelService.createOrUpdateContact({
        email: data.email,
        firstName: data.firstName,
        tags: ['job_seeker', 'new_user'],
        source: 'hire_my_mom_signup',
        locationId: process.env.GOHIGHLEVEL_LOCATION_ID!
      })

      // Send welcome email
      const result = await goHighLevelService.sendEmail({
        to: data.email,
        subject: template.subject,
        html: template.html,
        text: template.text
      })

      // Send external webhook notification
      await externalWebhookService.sendSeekerWelcome({
        userId: data.userId,
        email: data.email,
        firstName: data.firstName,
        loginUrl: data.loginUrl
      })

      // Log notification
      await this.logNotification('welcome_seeker', data.email, result.success)

      return result
    } catch (error) {
      console.error('Error sending welcome seeker email:', error)
      await this.logNotification('welcome_seeker', data.email, false, String(error))
      throw new Error('Failed to send welcome email')
    }
  }

  /**
   * Send welcome email to new employer
   */
  static async sendWelcomeEmployer(data: WelcomeEmployerData & { userId: string; lastName?: string }): Promise<{ success: boolean; messageId?: string }> {
    try {
      const template = emailTemplates.welcomeEmployer(data)

      // Create/update contact with employer tags
      await goHighLevelService.createOrUpdateContact({
        email: data.email,
        firstName: data.firstName,
        tags: ['employer', 'new_user'],
        source: 'hire_my_mom_signup',
        customFields: {
          company_name: data.companyName
        },
        locationId: process.env.GOHIGHLEVEL_LOCATION_ID!
      })

      // Send welcome email
      const result = await goHighLevelService.sendEmail({
        to: data.email,
        subject: template.subject,
        html: template.html,
        text: template.text
      })

      // Send external webhook notification
      await externalWebhookService.sendEmployerWelcome({
        userId: data.userId,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        companyName: data.companyName,
        loginUrl: data.loginUrl
      })

      // Log notification
      await this.logNotification('welcome_employer', data.email, result.success)

      return result
    } catch (error) {
      console.error('Error sending welcome employer email:', error)
      await this.logNotification('welcome_employer', data.email, false, String(error))
      throw new Error('Failed to send welcome email')
    }
  }

  /**
   * Send job approved notification to employer
   */
  static async sendJobApproved(data: JobApprovedData & { userId: string }): Promise<{ success: boolean; messageId?: string }> {
    try {
      const template = emailTemplates.jobApproved(data)

      // Add job approval tag
      await goHighLevelService.addTagsToContact(data.email, ['job_approved'])

      // Send notification
      const result = await goHighLevelService.sendEmail({
        to: data.email,
        subject: template.subject,
        html: template.html,
        text: template.text
      })

      // Send external webhook notification
      await externalWebhookService.sendEmployerJobApproved({
        userId: data.userId,
        email: data.email,
        firstName: data.firstName,
        jobId: data.jobId,
        jobTitle: data.jobTitle,
        jobUrl: data.jobUrl,
        companyName: data.companyName
      })

      // Log notification
      await this.logNotification('job_approved', data.email, result.success)

      return result
    } catch (error) {
      console.error('Error sending job approved email:', error)
      await this.logNotification('job_approved', data.email, false, String(error))
      throw new Error('Failed to send job approved notification')
    }
  }

  /**
   * Send job rejected notification to employer
   */
  static async sendJobRejected(data: JobRejectedData & { userId: string; jobId: string }): Promise<{ success: boolean; messageId?: string }> {
    try {
      const template = emailTemplates.jobRejected(data)

      // Add job rejection tag
      await goHighLevelService.addTagsToContact(data.email, ['job_rejected'])

      // Send notification
      const result = await goHighLevelService.sendEmail({
        to: data.email,
        subject: template.subject,
        html: template.html,
        text: template.text
      })

      // Send external webhook notification
      await externalWebhookService.sendEmployerJobRejected({
        userId: data.userId,
        email: data.email,
        firstName: data.firstName,
        jobId: data.jobId,
        jobTitle: data.jobTitle,
        rejectionReason: data.rejectionReason,
        companyName: data.companyName,
        editUrl: data.editUrl
      })

      // Log notification
      await this.logNotification('job_rejected', data.email, result.success)

      return result
    } catch (error) {
      console.error('Error sending job rejected email:', error)
      await this.logNotification('job_rejected', data.email, false, String(error))
      throw new Error('Failed to send job rejected notification')
    }
  }

  /**
   * Send new application notification to employer
   */
  static async sendNewApplication(data: NewApplicationData & { userId: string; jobId: string; applicationId: string }): Promise<{ success: boolean; messageId?: string }> {
    try {
      const template = emailTemplates.newApplication(data)

      // Add application received tag
      await goHighLevelService.addTagsToContact(data.email, ['application_received'])

      // Send notification
      const result = await goHighLevelService.sendEmail({
        to: data.email,
        subject: template.subject,
        html: template.html,
        text: template.text
      })

      // Send external webhook notification
      await externalWebhookService.sendEmployerNewApplication({
        userId: data.userId,
        email: data.email,
        firstName: data.firstName,
        jobId: data.jobId,
        jobTitle: data.jobTitle,
        candidateName: data.candidateName,
        applicationUrl: data.applicationUrl,
        companyName: data.companyName,
        applicationId: data.applicationId,
        candidateEmail: data.candidateEmail
      })

      // Log notification
      await this.logNotification('new_application', data.email, result.success)

      return result
    } catch (error) {
      console.error('Error sending new application email:', error)
      await this.logNotification('new_application', data.email, false, String(error))
      throw new Error('Failed to send new application notification')
    }
  }

  /**
   * Send application status update to job seeker
   */
  static async sendApplicationStatusUpdate(data: ApplicationStatusUpdateData & { userId: string; applicationId: string }): Promise<{ success: boolean; messageId?: string }> {
    try {
      const template = emailTemplates.applicationStatusUpdate(data)

      // Add status-specific tag
      await goHighLevelService.addTagsToContact(data.email, [`application_${data.status}`])

      // Send notification
      const result = await goHighLevelService.sendEmail({
        to: data.email,
        subject: template.subject,
        html: template.html,
        text: template.text
      })

      // Send external webhook notification
      await externalWebhookService.sendSeekerApplicationStatus({
        userId: data.userId,
        email: data.email,
        firstName: data.firstName,
        jobTitle: data.jobTitle,
        companyName: data.companyName,
        status: data.status,
        message: data.message,
        jobUrl: data.jobUrl,
        applicationId: data.applicationId,
        employerEmail: data.employerEmail
      })

      // Log notification
      await this.logNotification('application_status_update', data.email, result.success)

      return result
    } catch (error) {
      console.error('Error sending application status update:', error)
      await this.logNotification('application_status_update', data.email, false, String(error))
      throw new Error('Failed to send application status update')
    }
  }

  /**
   * Send payment confirmation
   */
  static async sendPaymentConfirmation(data: PaymentConfirmationData & {
    userId: string;
    userType: 'seeker' | 'employer';
    planName?: string;
    packageName?: string;
    creditsPurchased?: number;
  }): Promise<{ success: boolean; messageId?: string }> {
    try {
      const template = emailTemplates.paymentConfirmation(data)

      // Add payment tag
      await goHighLevelService.addTagsToContact(data.email, ['payment_made'])

      // Send notification
      const result = await goHighLevelService.sendEmail({
        to: data.email,
        subject: template.subject,
        html: template.html,
        text: template.text
      })

      // Send external webhook notification based on user type
      if (data.userType === 'seeker') {
        await externalWebhookService.sendSeekerPaymentConfirmation({
          userId: data.userId,
          email: data.email,
          firstName: data.firstName,
          amount: data.amount,
          description: data.description,
          transactionId: data.transactionId,
          invoiceUrl: data.invoiceUrl,
          planName: data.planName
        })
      } else {
        await externalWebhookService.sendEmployerPaymentConfirmation({
          userId: data.userId,
          email: data.email,
          firstName: data.firstName,
          amount: data.amount,
          description: data.description,
          transactionId: data.transactionId,
          invoiceUrl: data.invoiceUrl,
          packageName: data.packageName,
          creditsPurchased: data.creditsPurchased
        })
      }

      // Log notification
      await this.logNotification('payment_confirmation', data.email, result.success)

      return result
    } catch (error) {
      console.error('Error sending payment confirmation:', error)
      await this.logNotification('payment_confirmation', data.email, false, String(error))
      throw new Error('Failed to send payment confirmation')
    }
  }

  /**
   * Send subscription renewal reminder — routes through Resend.
   * @deprecated Use sendCustomerSubscriptionReminderEmail() directly. This wrapper exists
   * only to keep the admin /api/notifications/send endpoint working.
   */
  static async sendSubscriptionReminder(data: SubscriptionReminderData & { userId: string; daysUntilRenewal?: number }): Promise<{ success: boolean; messageId?: string }> {
    const result = await this.sendCustomerSubscriptionReminderEmail({
      email: data.email,
      firstName: data.firstName,
      plan: data.plan,
      renewalDate: data.renewalDate,
      amount: data.amount,
      manageUrl: data.manageUrl,
      daysUntilRenewal: data.daysUntilRenewal ?? 7
    })
    return { success: result.success, messageId: undefined }
  }

  /**
   * Send team invitation email
   */
  static async sendTeamInvitation(data: TeamInvitationData & { userId?: string; employerId: string }): Promise<{ success: boolean; messageId?: string }> {
    try {
      const template = emailTemplates.teamInvitation(data)

      // Add team invitation tag
      await goHighLevelService.addTagsToContact(data.email, ['team_invitation', 'team_member'])

      // Send invitation email
      const result = await goHighLevelService.sendEmail({
        to: data.email,
        subject: template.subject,
        html: template.html,
        text: template.text
      })

      // Log notification
      await this.logNotification('team_invitation', data.email, result.success)

      return result
    } catch (error) {
      console.error('Error sending team invitation email:', error)
      await this.logNotification('team_invitation', data.email, false, String(error))
      throw new Error('Failed to send team invitation')
    }
  }

  /**
   * Send bulk notifications (for admin use)
   */
  static async sendBulkNotification(
    emails: string[],
    subject: string,
    html: string,
    text?: string,
    tags?: string[]
  ): Promise<{
    success: number
    failed: number
    errors: string[]
  }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    }

    for (const email of emails) {
      try {
        // Add tags if provided
        if (tags && tags.length > 0) {
          await goHighLevelService.addTagsToContact(email, tags)
        }

        // Send email
        await goHighLevelService.sendEmail({
          to: email,
          subject,
          html,
          text
        })

        results.success++
      } catch (error) {
        results.failed++
        results.errors.push(`Failed to send to ${email}: ${error}`)
      }
    }

    return results
  }

  /**
   * Test notification system
   */
  static async testNotification(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const result = await goHighLevelService.sendEmail({
        to: email,
        subject: 'Test Email from AmperTalent',
        html: `
          <h1>Test Email</h1>
          <p>This is a test email to verify that the notification system is working correctly.</p>
          <p>Sent at: ${new Date().toISOString()}</p>
        `,
        text: `Test Email - This is a test email sent at ${new Date().toISOString()}`
      })

      return {
        success: result.success,
        message: result.success ? 'Test email sent successfully' : 'Failed to send test email'
      }
    } catch (error) {
      return {
        success: false,
        message: `Test email failed: ${error}`
      }
    }
  }

  /**
   * Get notification statistics
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static async getNotificationStats(_days: number = 30): Promise<{
    totalSent: number
    successRate: number
    byType: Record<NotificationType, number>
    recentFailures: Array<{
      type: NotificationType
      email: string
      error: string
      timestamp: Date
    }>
  }> {
    // This would typically query a database table for notification logs
    // For now, return mock data
    return {
      totalSent: 1250,
      successRate: 98.5,
      byType: {
        welcome_seeker: 450,
        welcome_employer: 120,
        job_approved: 200,
        job_rejected: 45,
        new_application: 300,
        application_status_update: 100,
        payment_confirmation: 25,
        subscription_reminder: 10,
        team_invitation: 15,
        interview_scheduled: 0,
        interview_completed: 0,
        interview_stage_changed: 0
      },
      recentFailures: []
    }
  }

  /**
   * Log notification attempt (would typically save to database)
   */
  private static async logNotification(
    type: NotificationType,
    email: string,
    success: boolean,
    error?: string
  ): Promise<void> {
    // In a real implementation, this would save to a database table
    console.log('Notification Log:', {
      type,
      email,
      success,
      error,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Schedule notification for later sending
   */
  static async scheduleNotification(
    type: NotificationType,
    data: Record<string, unknown>,
    sendAt: Date
  ): Promise<{ success: boolean; scheduledId?: string }> {
    // This would typically use a job queue system
    // For now, just log the scheduled notification
    console.log('Scheduled Notification:', {
      type,
      data,
      sendAt,
      scheduledAt: new Date().toISOString()
    })

    return {
      success: true,
      scheduledId: `scheduled_${Date.now()}`
    }
  }

  /**
   * Send interview scheduled notification to job seeker
   */
  static async sendInterviewScheduled(data: InterviewScheduledData & { userId: string }): Promise<{ success: boolean; messageId?: string }> {
    try {
      const template = emailTemplates.interviewScheduled(data)

      const result = await goHighLevelService.sendEmail({
        to: data.email,
        subject: `Interview Scheduled: ${data.jobTitle} at ${data.companyName}`,
        html: template,
        contactTags: ['interview_scheduled']
      })

      console.log('✅ INTERVIEW SCHEDULED EMAIL: Sent to', data.email)
      return { success: true, messageId: result?.messageId }
    } catch (error) {
      console.error('❌ INTERVIEW SCHEDULED EMAIL FAILED:', error)
      return { success: false }
    }
  }

  /**
   * Send interview completed notification to job seeker
   */
  static async sendInterviewCompleted(data: InterviewCompletedData & { userId: string }): Promise<{ success: boolean; messageId?: string }> {
    try {
      const template = emailTemplates.interviewCompleted(data)

      const result = await goHighLevelService.sendEmail({
        to: data.email,
        subject: `Interview Completed: ${data.jobTitle} at ${data.companyName}`,
        html: template,
        contactTags: ['interview_completed']
      })

      console.log('✅ INTERVIEW COMPLETED EMAIL: Sent to', data.email)
      return { success: true, messageId: result?.messageId }
    } catch (error) {
      console.error('❌ INTERVIEW COMPLETED EMAIL FAILED:', error)
      return { success: false }
    }
  }

  /**
   * Send interview stage update notification to job seeker
   */
  static async sendInterviewStageUpdate(data: InterviewStageUpdateData & { userId: string }): Promise<{ success: boolean; messageId?: string }> {
    try {
      const template = emailTemplates.interviewStageUpdate(data)

      const result = await goHighLevelService.sendEmail({
        to: data.email,
        subject: `Interview Update: ${data.jobTitle} at ${data.companyName}`,
        html: template,
        contactTags: ['interview_stage_update']
      })

      console.log('✅ INTERVIEW STAGE UPDATE EMAIL: Sent to', data.email)
      return { success: true, messageId: result?.messageId }
    } catch (error) {
      console.error('❌ INTERVIEW STAGE UPDATE EMAIL FAILED:', error)
      return { success: false }
    }
  }

  /**
   * Send service purchase confirmation email
   */
  static async sendServicePurchaseConfirmation(data: {
    firstName: string
    serviceName: string
    amount: number
    transactionId: string
    servicesUrl: string
    email: string
    userId: string
  }): Promise<{ success: boolean; messageId?: string }> {
    try {
      const template = emailTemplates.servicePurchaseConfirmation(data)

      const result = await goHighLevelService.sendEmail({
        to: data.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
        contactTags: ['service_purchase']
      })

      console.log('✅ SERVICE PURCHASE EMAIL: Sent to', data.email)
      return { success: true, messageId: result?.messageId }
    } catch (error) {
      console.error('❌ SERVICE PURCHASE EMAIL FAILED:', error)
      return { success: false }
    }
  }

  /**
   * Send service completion notification email
   */
  static async sendServiceCompleted(data: {
    firstName: string
    serviceName: string
    completedDate: string
    notes?: string
    servicesUrl: string
    email: string
    userId: string
  }): Promise<{ success: boolean; messageId?: string }> {
    try {
      const template = emailTemplates.serviceCompleted(data)

      const result = await goHighLevelService.sendEmail({
        to: data.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
        contactTags: ['service_completed']
      })

      console.log('✅ SERVICE COMPLETED EMAIL: Sent to', data.email)
      return { success: true, messageId: result?.messageId }
    } catch (error) {
      console.error('❌ SERVICE COMPLETED EMAIL FAILED:', error)
      return { success: false }
    }
  }

  /**
   * Send service status update notification email
   */
  static async sendServiceStatusUpdate(data: {
    firstName: string
    serviceName: string
    oldStatus: string
    newStatus: string
    notes?: string
    servicesUrl: string
    email: string
    userId: string
  }): Promise<{ success: boolean; messageId?: string }> {
    try {
      const template = emailTemplates.serviceStatusUpdate(data)

      const result = await goHighLevelService.sendEmail({
        to: data.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
        contactTags: ['service_update']
      })

      console.log('✅ SERVICE STATUS UPDATE EMAIL: Sent to', data.email)
      return { success: true, messageId: result?.messageId }
    } catch (error) {
      console.error('❌ SERVICE STATUS UPDATE EMAIL FAILED:', error)
      return { success: false }
    }
  }

  /**
   * Send admin notification for new service purchase
   */
  static async sendAdminServicePurchaseNotification(data: {
    serviceName: string
    userName: string
    userEmail: string
    amount: number
    adminUrl: string
    adminEmails: string[]
  }): Promise<{ success: boolean; messageId?: string }> {
    try {
      const template = emailTemplates.adminServicePurchaseNotification(data)

      // Send to all admin emails
      const results = await Promise.all(
        data.adminEmails.map(async (adminEmail) => {
          return await goHighLevelService.sendEmail({
            to: adminEmail,
            subject: template.subject,
            html: template.html,
            text: template.text,
            contactTags: ['admin_notification']
          })
        })
      )

      const allSuccessful = results.every(r => r?.success)
      console.log('✅ ADMIN SERVICE PURCHASE NOTIFICATION: Sent to', data.adminEmails.length, 'admins')
      return { success: allSuccessful }
    } catch (error) {
      console.error('❌ ADMIN SERVICE PURCHASE NOTIFICATION FAILED:', error)
      return { success: false }
    }
  }

  /**
   * Send admin notification for payment/order completion
   * 
   * This is sent to admin recipients for ALL payment events:
   * - Seeker initial subscriptions (trial or paid)
   * - Seeker subscription renewals
   * - Employer package purchases
   * - Employer recurring payments
   * 
   * Uses Resend for email delivery.
   */
  static async sendAdminPaymentNotification(data: {
    orderNumber: string
    orderDate: string
    customerName: string
    customerType: 'Seeker' | 'Employer'
    customerId: string
    customerEmail: string
    customerPhone?: string
    productDescription: string
    quantity?: number
    price: number
    // Optional line items for add-on breakdown (concierge employers)
    lineItems?: Array<{
      name: string
      quantity: number
      price: number
    }>
    subscriptionStartDate?: string
    subscriptionEndDate?: string
    nextPaymentDate?: string
    recurringTotal?: string
    billingAddress?: {
      name?: string
      address?: string
      city?: string
      state?: string
      zip?: string
      country?: string
    }
    // Card billing info from checkout form
    billingFirstName?: string
    billingLastName?: string
    billingCardAddress?: string
    billingCardCity?: string
    billingCardState?: string
    billingCardZipCode?: string
    paymentType?: 'card' | 'paypal'
    howDidYouHear?: string
    isRenewal?: boolean
    paymentMethod?: string
    transactionId?: string
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const template = emailTemplates.adminPaymentNotification({
        ...data,
        quantity: data.quantity || 1
      })

      const recipients = getAdminNotificationRecipients()

      console.log('📧 ADMIN PAYMENT NOTIFICATION: Sending to', recipients.join(', '))

      const result = await sendEmail({
        to: recipients,
        subject: template.subject,
        html: template.html,
        text: template.text,
        tags: [
          { name: 'type', value: 'admin_payment_notification' },
          { name: 'customer_type', value: data.customerType.toLowerCase() },
          { name: 'is_renewal', value: data.isRenewal ? 'true' : 'false' }
        ]
      })

      if (result.success) {
        console.log('✅ ADMIN PAYMENT NOTIFICATION: Sent successfully', {
          orderNumber: data.orderNumber,
          customerType: data.customerType,
          recipients: recipients.length
        })
      } else {
        console.error('❌ ADMIN PAYMENT NOTIFICATION: Failed to send', result.error)
      }

      return result
    } catch (error) {
      console.error('❌ ADMIN PAYMENT NOTIFICATION FAILED:', error)
      // Don't throw - email failure should not block payment
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Cancel scheduled notification
   */
  static async cancelScheduledNotification(scheduledId: string): Promise<{ success: boolean }> {
    // This would typically remove from job queue
    console.log('Cancelled Scheduled Notification:', scheduledId)

    return { success: true }
  }

  // ============================================================================
  // CUSTOMER EMAIL NOTIFICATIONS (via Resend)
  // These are SEPARATE from GHL webhook-based notifications above
  // Controlled by ENABLE_CUSTOMER_PAYMENT_EMAILS feature flag
  // ============================================================================

  /**
   * Send payment confirmation email to customer via Resend.
   * Respects ENABLE_CUSTOMER_PAYMENT_EMAILS feature flag — no-ops (returns success) when disabled.
   */
  static async sendCustomerPaymentConfirmationEmail(params: {
    email: string
    firstName: string
    lastName?: string
    amount: number
    description: string
    transactionId: string
    invoiceUrl?: string
    lineItems?: Array<{ name: string; amount: number }>
    isTrial?: boolean
    isRecurring?: boolean
    billingFirstName?: string
    billingLastName?: string
    address?: string
    city?: string
    state?: string
    zipCode?: string
    paymentType?: 'card' | 'paypal'
    paymentMethod?: string
  }): Promise<{ success: boolean; error?: string }> {
    if (!isCustomerPaymentEmailsEnabled()) {
      console.log('ℹ️ Customer payment emails disabled via ENABLE_CUSTOMER_PAYMENT_EMAILS flag')
      return { success: true }
    }

    try {
      const template = emailTemplates.paymentConfirmation({
        firstName: params.firstName,
        lastName: params.lastName,
        email: params.email,
        amount: params.amount,
        description: params.description,
        transactionId: params.transactionId,
        invoiceUrl: params.invoiceUrl,
        lineItems: params.lineItems,
        isTrial: params.isTrial,
        isRecurring: params.isRecurring,
        billingFirstName: params.billingFirstName,
        billingLastName: params.billingLastName,
        address: params.address,
        city: params.city,
        state: params.state,
        zipCode: params.zipCode,
        paymentType: params.paymentType,
        paymentMethod: params.paymentMethod
      })

      const result = await sendEmail({
        to: params.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
        tags: [{ name: 'type', value: 'customer_payment_confirmation' }]
      })

      if (result.success) {
        console.log('✅ Customer payment confirmation email sent:', params.email)
      } else {
        console.error('❌ Customer payment confirmation email failed:', result.error)
      }

      return result
    } catch (error) {
      console.error('❌ Failed to send customer payment confirmation email:', error)
      return { success: false, error: String(error) }
    }
  }

  /**
   * Send subscription renewal reminder email to customer via Resend.
   * Respects ENABLE_CUSTOMER_PAYMENT_EMAILS feature flag — no-ops (returns success) when disabled.
   */
  static async sendCustomerSubscriptionReminderEmail(params: {
    email: string
    firstName: string
    plan: string
    renewalDate: string
    amount: number
    manageUrl: string
    daysUntilRenewal: number
    paymentMethod?: string
  }): Promise<{ success: boolean; error?: string }> {
    if (!isCustomerPaymentEmailsEnabled()) {
      console.log('ℹ️ Customer subscription reminder emails disabled via ENABLE_CUSTOMER_PAYMENT_EMAILS flag')
      return { success: true }
    }

    try {
      const template = emailTemplates.subscriptionReminder({
        firstName: params.firstName,
        plan: params.plan,
        renewalDate: params.renewalDate,
        amount: params.amount,
        manageUrl: params.manageUrl,
        daysUntilRenewal: params.daysUntilRenewal,
        paymentMethod: params.paymentMethod
      })

      const result = await sendEmail({
        to: params.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
        tags: [{ name: 'type', value: 'customer_subscription_reminder' }]
      })

      if (result.success) {
        console.log(`✅ Customer subscription reminder email sent (${params.daysUntilRenewal} days):`, params.email)
      } else {
        console.error('❌ Customer subscription reminder email failed:', result.error)
      }

      return result
    } catch (error) {
      console.error('❌ Failed to send customer subscription reminder email:', error)
      return { success: false, error: String(error) }
    }
  }
}

// Export singleton instance
export const notificationService = NotificationService
