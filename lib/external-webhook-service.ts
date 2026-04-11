import crypto from 'crypto'

// External webhook payload interfaces
export interface ExternalWebhookPayload {
  event_type: string
  event_id: string
  timestamp: string
  user_type: 'seeker' | 'employer'
  user_data: {
    id: string
    email: string
    name: string
    first_name?: string
    last_name?: string
  }
  notification_data: Record<string, any>
  metadata?: Record<string, any>
}

// Seeker-specific webhook payloads
export interface SeekerWelcomeWebhook extends ExternalWebhookPayload {
  event_type: 'seeker.welcome'
  user_type: 'seeker'
  notification_data: {
    login_url: string
    membership_plan?: string
  }
}

export interface SeekerApplicationStatusWebhook extends ExternalWebhookPayload {
  event_type: 'seeker.application_status_update'
  user_type: 'seeker'
  notification_data: {
    job_title: string
    company_name: string
    status: 'reviewed' | 'interview' | 'rejected' | 'hired'
    message?: string
    job_url: string
    application_id: string
    employer_email: string
  }
}

export interface SeekerJobInvitationWebhook extends ExternalWebhookPayload {
  event_type: 'seeker.job_invitation'
  user_type: 'seeker'
  notification_data: {
    job_id: string
    job_title: string
    company_name: string
    employer_message?: string
    job_url: string
    employer_email: string
  }
}

export interface SeekerPaymentConfirmationWebhook extends ExternalWebhookPayload {
  event_type: 'seeker.payment_confirmation'
  user_type: 'seeker'
  notification_data: {
    amount: number
    description: string
    transaction_id: string
    invoice_url?: string
    plan_name?: string
  }
}

export interface SeekerPreSignupWebhook extends ExternalWebhookPayload {
  event_type: 'seeker.pre_signup'
  user_type: 'seeker'
  notification_data: {
    selected_plan: string
    plan_name: string
    checkout_url: string
    expires_at: string
  }
}

export interface SeekerSubscriptionReminderWebhook extends ExternalWebhookPayload {
  event_type: 'seeker.subscription_reminder'
  user_type: 'seeker'
  notification_data: {
    plan: string
    renewal_date: string
    amount: number
    manage_url: string
  }
}

export interface SeekerSubscriptionChangedWebhook extends ExternalWebhookPayload {
  event_type: 'seeker.subscription_changed'
  user_type: 'seeker'
  notification_data: {
    action: 'upgrade' | 'downgrade' | 'cancel' | 'reactivate'
    old_plan?: string
    new_plan?: string
    effective_date: string
    manage_url: string
    reason?: string
  }
}

export interface SeekerResumeCritiqueWebhook extends ExternalWebhookPayload {
  event_type: 'seeker.resume_critique_created'
  user_type: 'seeker'
  notification_data: {
    critique_request_id: string
    resume_url: string
    target_role?: string
    target_industry?: string
    priority: 'standard' | 'rush'
    cost: number
  }
}

// Employer-specific webhook payloads
export interface EmployerWelcomeWebhook extends ExternalWebhookPayload {
  event_type: 'employer.welcome'
  user_type: 'employer'
  notification_data: {
    company_name: string
    login_url: string
    package_type?: string
  }
}

export interface EmployerJobApprovedWebhook extends ExternalWebhookPayload {
  event_type: 'employer.job_approved'
  user_type: 'employer'
  notification_data: {
    job_id: string
    job_title: string
    job_url: string
    company_name: string
  }
}

export interface EmployerJobRejectedWebhook extends ExternalWebhookPayload {
  event_type: 'employer.job_rejected'
  user_type: 'employer'
  notification_data: {
    job_id: string
    job_title: string
    rejection_reason: string
    company_name: string
    edit_url: string
  }
}

export interface EmployerJobUnderReviewWebhook extends ExternalWebhookPayload {
  event_type: 'employer.job_under_review'
  user_type: 'employer'
  notification_data: {
    job_id: string
    job_title: string
    company_name: string
    admin_notes?: string
    review_started_at: string
  }
}

export interface EmployerNewApplicationWebhook extends ExternalWebhookPayload {
  event_type: 'employer.new_application'
  user_type: 'employer'
  notification_data: {
    job_id: string
    job_title: string
    candidate_name: string
    application_url: string
    company_name: string
    application_id: string
    candidate_email: string
  }
}

export interface EmployerApplicationStatusWebhook extends ExternalWebhookPayload {
  event_type: 'employer.application_status_update'
  user_type: 'employer'
  notification_data: {
    job_id: string
    job_title: string
    candidate_name: string
    application_id: string
    status: 'reviewed' | 'interview' | 'rejected' | 'hired'
    company_name: string
    application_url: string
    candidate_email: string
  }
}

export interface EmployerInvitationAcceptedWebhook extends ExternalWebhookPayload {
  event_type: 'employer.invitation_accepted'
  user_type: 'employer'
  notification_data: {
    job_id: string
    job_title: string
    candidate_name: string
    candidate_email: string
    application_id: string
    company_name: string
    application_url: string
    invited_at: string
    accepted_at: string
  }
}

export interface EmployerJobFilledWebhook extends ExternalWebhookPayload {
  event_type: 'employer.job_filled'
  user_type: 'employer'
  notification_data: {
    job_id: string
    job_title: string
    company_name: string
    hired_candidate_name: string
    application_id: string
    filled_at: string
    job_url: string
    hired_candidate_email: string
  }
}

export interface EmployerPaymentConfirmationWebhook extends ExternalWebhookPayload {
  event_type: 'employer.payment_confirmation'
  user_type: 'employer'
  notification_data: {
    amount: number
    description: string
    transaction_id: string
    invoice_url?: string
    package_name?: string
    credits_purchased?: number
  }
}

export interface EmployerInterviewUpdateWebhook extends ExternalWebhookPayload {
  event_type: 'employer.interview_update'
  user_type: 'employer'
  notification_data: {
    job_id: string
    job_title: string
    candidate_name: string
    application_id: string
    stage: string
    notes?: string
    next_action?: string
    company_name: string
    application_url: string
    candidate_email: string
  }
}

// System error webhook payloads
export interface SystemErrorWebhook extends ExternalWebhookPayload {
  event_type: 'system.error'
  user_type: 'seeker' | 'employer'
  notification_data: {
    error_type: string
    error_message: string
    error_context: Record<string, any>
    timestamp: string
    severity: 'low' | 'medium' | 'high' | 'critical'
  }
}

export interface WebhookProcessingErrorWebhook extends ExternalWebhookPayload {
  event_type: 'webhook.processing_error'
  user_type: 'seeker' | 'employer'
  notification_data: {
    source_webhook: string
    error_message: string
    payload_data: Record<string, any>
    processing_step: string
    retry_count?: number
  }
}

// Union type for all webhook payloads
export type AllWebhookPayloads =
  | SeekerWelcomeWebhook
  | SeekerPreSignupWebhook
  | SeekerApplicationStatusWebhook
  | SeekerJobInvitationWebhook
  | SeekerPaymentConfirmationWebhook
  | SeekerSubscriptionReminderWebhook
  | SeekerSubscriptionChangedWebhook
  | SeekerResumeCritiqueWebhook
  | EmployerWelcomeWebhook
  | EmployerJobApprovedWebhook
  | EmployerJobRejectedWebhook
  | EmployerJobUnderReviewWebhook
  | EmployerNewApplicationWebhook
  | EmployerApplicationStatusWebhook
  | EmployerInvitationAcceptedWebhook
  | EmployerJobFilledWebhook
  | EmployerPaymentConfirmationWebhook
  | EmployerInterviewUpdateWebhook
  | SystemErrorWebhook
  | WebhookProcessingErrorWebhook

/**
 * External Webhook Service
 * Sends notifications to external webhook endpoints
 */
export class ExternalWebhookService {
  private static readonly TIMEOUT = parseInt(process.env.EXTERNAL_WEBHOOK_TIMEOUT || '5000')

  private static get SECRET(): string | undefined {
    return process.env.EXTERNAL_WEBHOOK_SECRET
  }

  /**
   * Send webhook to external endpoint
   */
  private static async sendWebhook(
    url: string | undefined,
    payload: AllWebhookPayloads
  ): Promise<{ success: boolean; error?: string }> {
    if (!url || url.startsWith('https://your-external-service.com')) {
      // Skip if URL is not configured or is placeholder
      return { success: true }
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'AmperTalent-Webhook/1.0'
      }

      // Add authentication header if secret is configured
      if (this.SECRET) {
        // Check if secret contains username:password for Basic auth
        if (this.SECRET.includes(':')) {
          // Use Basic authentication (username:password format)
          // The secret should already be in "username:password" format
          const basicAuth = Buffer.from(this.SECRET).toString('base64')
          headers['Authorization'] = `Basic ${basicAuth}`
        } else {
          // Fallback to Bearer token
          headers['Authorization'] = `Bearer ${this.SECRET}`
        }

        // Also include HMAC signature for additional security
        const signature = this.generateSignature(JSON.stringify(payload))
        headers['X-Webhook-Signature'] = signature
      }

      console.log('🔍 WEBHOOK: Sending request to:', url)
      console.log('🔍 WEBHOOK: Headers:', headers)
      console.log('🔍 WEBHOOK: Payload:', JSON.stringify(payload, null, 2))

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.TIMEOUT)
      })

      console.log('🔍 WEBHOOK: Response status:', response.status)
      console.log('🔍 WEBHOOK: Response headers:', Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      console.log(`✅ External webhook sent successfully: ${payload.event_type}`)
      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`❌ External webhook failed: ${payload.event_type}`, errorMessage)

      // Send webhook processing error notification (avoid infinite loops by checking event type)
      if (payload.event_type !== 'webhook.processing_error' && payload.event_type !== 'system.error') {
        try {
          await this.sendWebhookProcessingError({
            userId: payload.user_data.id,
            email: payload.user_data.email,
            firstName: payload.user_data.first_name,
            userType: payload.user_type,
            sourceWebhook: payload.event_type,
            errorMessage,
            payloadData: payload,
            processingStep: 'webhook_delivery'
          })
        } catch (webhookError) {
          console.error('Failed to send webhook processing error notification:', webhookError)
        }
      }

      return { success: false, error: errorMessage }
    }
  }

  /**
   * Generate HMAC signature for webhook payload
   */
  private static generateSignature(payload: string): string {
    if (!this.SECRET) return ''

    return crypto
      .createHmac('sha256', this.SECRET)
      .update(payload)
      .digest('hex')
  }

  /**
   * Generate unique event ID
   */
  private static generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Seeker webhook methods
  static async sendSeekerWelcome(data: {
    userId: string
    email: string
    firstName: string
    lastName?: string
    loginUrl: string
    membershipPlan?: string
  }): Promise<{ success: boolean; error?: string }> {
    const payload: SeekerWelcomeWebhook = {
      event_type: 'seeker.welcome',
      event_id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      user_type: 'seeker',
      user_data: {
        id: data.userId,
        email: data.email,
        name: `${data.firstName} ${data.lastName || ''}`.trim(),
        first_name: data.firstName,
        last_name: data.lastName
      },
      notification_data: {
        login_url: data.loginUrl,
        membership_plan: data.membershipPlan
      }
    }

    return this.sendWebhook(process.env.EXTERNAL_WEBHOOK_SEEKER_WELCOME, payload)
  }

  static async sendSeekerPreSignup(data: {
    userId: string
    email: string
    firstName: string
    lastName?: string
    selectedPlan: string
    planName: string
    checkoutUrl: string
    expiresAt: string
  }): Promise<{ success: boolean; error?: string }> {
    const payload: SeekerPreSignupWebhook = {
      event_type: 'seeker.pre_signup',
      event_id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      user_type: 'seeker',
      user_data: {
        id: data.userId,
        email: data.email,
        name: `${data.firstName} ${data.lastName || ''}`.trim(),
        first_name: data.firstName,
        last_name: data.lastName
      },
      notification_data: {
        selected_plan: data.selectedPlan,
        plan_name: data.planName,
        checkout_url: data.checkoutUrl,
        expires_at: data.expiresAt
      }
    }

    return this.sendWebhook(process.env.EXTERNAL_WEBHOOK_SEEKER_PRE_SIGNUP, payload)
  }

  static async sendSeekerApplicationStatus(data: {
    userId: string
    email: string
    firstName: string
    jobTitle: string
    companyName: string
    status: 'reviewed' | 'interview' | 'rejected' | 'hired'
    message?: string
    jobUrl: string
    applicationId: string
    employerEmail: string
  }): Promise<{ success: boolean; error?: string }> {
    const payload: SeekerApplicationStatusWebhook = {
      event_type: 'seeker.application_status_update',
      event_id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      user_type: 'seeker',
      user_data: {
        id: data.userId,
        email: data.email,
        name: data.firstName,
        first_name: data.firstName
      },
      notification_data: {
        job_title: data.jobTitle,
        company_name: data.companyName,
        status: data.status,
        message: data.message,
        job_url: data.jobUrl,
        application_id: data.applicationId,
        employer_email: data.employerEmail
      }
    }

    return this.sendWebhook(process.env.EXTERNAL_WEBHOOK_SEEKER_APPLICATION_STATUS, payload)
  }

  static async sendSeekerJobInvitation(data: {
    userId: string
    email: string
    firstName: string
    jobId: string
    jobTitle: string
    companyName: string
    employerMessage?: string
    jobUrl: string
    employerEmail: string
  }): Promise<{ success: boolean; error?: string }> {
    const payload: SeekerJobInvitationWebhook = {
      event_type: 'seeker.job_invitation',
      event_id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      user_type: 'seeker',
      user_data: {
        id: data.userId,
        email: data.email,
        name: data.firstName,
        first_name: data.firstName
      },
      notification_data: {
        job_id: data.jobId,
        job_title: data.jobTitle,
        company_name: data.companyName,
        employer_message: data.employerMessage,
        job_url: data.jobUrl,
        employer_email: data.employerEmail
      }
    }

    return this.sendWebhook(process.env.EXTERNAL_WEBHOOK_SEEKER_JOB_INVITATION, payload)
  }

  static async sendSeekerPaymentConfirmation(data: {
    userId: string
    email: string
    firstName: string
    amount: number
    description: string
    transactionId?: string
    invoiceUrl?: string
    planName?: string
  }): Promise<{ success: boolean; error?: string }> {
    const payload: SeekerPaymentConfirmationWebhook = {
      event_type: 'seeker.payment_confirmation',
      event_id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      user_type: 'seeker',
      user_data: {
        id: data.userId,
        email: data.email,
        name: data.firstName,
        first_name: data.firstName
      },
      notification_data: {
        amount: data.amount,
        description: data.description,
        transaction_id: data.transactionId,
        invoice_url: data.invoiceUrl,
        plan_name: data.planName
      }
    }

    return this.sendWebhook(process.env.EXTERNAL_WEBHOOK_SEEKER_PAYMENT_CONFIRMATION, payload)
  }

  static async sendSeekerSubscriptionReminder(data: {
    userId: string
    email: string
    firstName: string
    plan: string
    renewalDate: string
    amount: number
    manageUrl: string
  }): Promise<{ success: boolean; error?: string }> {
    const payload: SeekerSubscriptionReminderWebhook = {
      event_type: 'seeker.subscription_reminder',
      event_id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      user_type: 'seeker',
      user_data: {
        id: data.userId,
        email: data.email,
        name: data.firstName,
        first_name: data.firstName
      },
      notification_data: {
        plan: data.plan,
        renewal_date: data.renewalDate,
        amount: data.amount,
        manage_url: data.manageUrl
      }
    }

    return this.sendWebhook(process.env.EXTERNAL_WEBHOOK_SEEKER_SUBSCRIPTION_REMINDER, payload)
  }

  static async sendSeekerSubscriptionChanged(data: {
    userId: string
    email: string
    firstName: string
    action: 'upgrade' | 'downgrade' | 'cancel' | 'reactivate'
    oldPlan?: string
    newPlan?: string
    effectiveDate: string
    manageUrl: string
    reason?: string
  }): Promise<{ success: boolean; error?: string }> {
    const payload: SeekerSubscriptionChangedWebhook = {
      event_type: 'seeker.subscription_changed',
      event_id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      user_type: 'seeker',
      user_data: {
        id: data.userId,
        email: data.email,
        name: data.firstName,
        first_name: data.firstName
      },
      notification_data: {
        action: data.action,
        old_plan: data.oldPlan,
        new_plan: data.newPlan,
        effective_date: data.effectiveDate,
        manage_url: data.manageUrl,
        reason: data.reason
      }
    }

    return this.sendWebhook(process.env.EXTERNAL_WEBHOOK_SEEKER_SUBSCRIPTION_CHANGED, payload)
  }

  static async sendSeekerResumeCritiqueCreated(data: {
    userId: string
    email: string
    firstName: string
    lastName?: string
    critiqueRequestId: string
    resumeUrl: string
    targetRole?: string
    targetIndustry?: string
    priority: 'standard' | 'rush'
    cost: number
  }): Promise<{ success: boolean; error?: string }> {
    const payload: SeekerResumeCritiqueWebhook = {
      event_type: 'seeker.resume_critique_created',
      event_id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      user_type: 'seeker',
      user_data: {
        id: data.userId,
        email: data.email,
        name: `${data.firstName} ${data.lastName || ''}`.trim(),
        first_name: data.firstName,
        last_name: data.lastName
      },
      notification_data: {
        critique_request_id: data.critiqueRequestId,
        resume_url: data.resumeUrl,
        target_role: data.targetRole,
        target_industry: data.targetIndustry,
        priority: data.priority,
        cost: data.cost
      }
    }

    return this.sendWebhook(process.env.EXTERNAL_WEBHOOK_SEEKER_RESUME_CRITIQUE, payload)
  }

  // Employer webhook methods
  static async sendEmployerWelcome(data: {
    userId: string
    email: string
    firstName: string
    lastName?: string
    companyName: string
    loginUrl: string
    packageType?: string
  }): Promise<{ success: boolean; error?: string }> {
    const payload: EmployerWelcomeWebhook = {
      event_type: 'employer.welcome',
      event_id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      user_type: 'employer',
      user_data: {
        id: data.userId,
        email: data.email,
        name: `${data.firstName} ${data.lastName || ''}`.trim(),
        first_name: data.firstName,
        last_name: data.lastName
      },
      notification_data: {
        company_name: data.companyName,
        login_url: data.loginUrl,
        package_type: data.packageType
      }
    }

    return this.sendWebhook(process.env.EXTERNAL_WEBHOOK_EMPLOYER_WELCOME, payload)
  }

  static async sendEmployerJobApproved(data: {
    userId: string
    email: string
    firstName: string
    jobId: string
    jobTitle: string
    jobUrl: string
    companyName: string
  }): Promise<{ success: boolean; error?: string }> {
    const payload: EmployerJobApprovedWebhook = {
      event_type: 'employer.job_approved',
      event_id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      user_type: 'employer',
      user_data: {
        id: data.userId,
        email: data.email,
        name: data.firstName,
        first_name: data.firstName
      },
      notification_data: {
        job_id: data.jobId,
        job_title: data.jobTitle,
        job_url: data.jobUrl,
        company_name: data.companyName
      }
    }

    return this.sendWebhook(process.env.EXTERNAL_WEBHOOK_EMPLOYER_JOB_APPROVED, payload)
  }

  static async sendEmployerJobRejected(data: {
    userId: string
    email: string
    firstName: string
    jobId: string
    jobTitle: string
    rejectionReason: string
    companyName: string
    editUrl: string
  }): Promise<{ success: boolean; error?: string }> {
    const payload: EmployerJobRejectedWebhook = {
      event_type: 'employer.job_rejected',
      event_id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      user_type: 'employer',
      user_data: {
        id: data.userId,
        email: data.email,
        name: data.firstName,
        first_name: data.firstName
      },
      notification_data: {
        job_id: data.jobId,
        job_title: data.jobTitle,
        rejection_reason: data.rejectionReason,
        company_name: data.companyName,
        edit_url: data.editUrl
      }
    }

    return this.sendWebhook(process.env.EXTERNAL_WEBHOOK_EMPLOYER_JOB_REJECTED, payload)
  }

  static async sendEmployerJobUnderReview(data: {
    userId: string
    email: string
    firstName: string
    jobId: string
    jobTitle: string
    companyName: string
    adminNotes?: string
    reviewStartedAt: string
  }): Promise<{ success: boolean; error?: string }> {
    const payload: EmployerJobUnderReviewWebhook = {
      event_type: 'employer.job_under_review',
      event_id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      user_type: 'employer',
      user_data: {
        id: data.userId,
        email: data.email,
        name: data.firstName,
        first_name: data.firstName
      },
      notification_data: {
        job_id: data.jobId,
        job_title: data.jobTitle,
        company_name: data.companyName,
        admin_notes: data.adminNotes,
        review_started_at: data.reviewStartedAt
      }
    }

    return this.sendWebhook(process.env.EXTERNAL_WEBHOOK_EMPLOYER_JOB_UNDER_REVIEW, payload)
  }

  static async sendEmployerNewApplication(data: {
    userId: string
    email: string
    firstName: string
    jobId: string
    jobTitle: string
    candidateName: string
    applicationUrl: string
    companyName: string
    applicationId: string
    candidateEmail: string
  }): Promise<{ success: boolean; error?: string }> {
    const payload: EmployerNewApplicationWebhook = {
      event_type: 'employer.new_application',
      event_id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      user_type: 'employer',
      user_data: {
        id: data.userId,
        email: data.email,
        name: data.firstName,
        first_name: data.firstName
      },
      notification_data: {
        job_id: data.jobId,
        job_title: data.jobTitle,
        candidate_name: data.candidateName,
        application_url: data.applicationUrl,
        company_name: data.companyName,
        application_id: data.applicationId,
        candidate_email: data.candidateEmail
      }
    }

    return this.sendWebhook(process.env.EXTERNAL_WEBHOOK_EMPLOYER_NEW_APPLICATION, payload)
  }

  static async sendEmployerApplicationStatus(data: {
    userId: string
    email: string
    firstName: string
    jobId: string
    jobTitle: string
    candidateName: string
    applicationId: string
    status: 'reviewed' | 'interview' | 'rejected' | 'hired'
    companyName: string
    applicationUrl: string
    candidateEmail: string
  }): Promise<{ success: boolean; error?: string }> {
    const payload: EmployerApplicationStatusWebhook = {
      event_type: 'employer.application_status_update',
      event_id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      user_type: 'employer',
      user_data: {
        id: data.userId,
        email: data.email,
        name: data.firstName,
        first_name: data.firstName
      },
      notification_data: {
        job_id: data.jobId,
        job_title: data.jobTitle,
        candidate_name: data.candidateName,
        application_id: data.applicationId,
        status: data.status,
        company_name: data.companyName,
        application_url: data.applicationUrl,
        candidate_email: data.candidateEmail
      }
    }

    return this.sendWebhook(process.env.EXTERNAL_WEBHOOK_EMPLOYER_APPLICATION_STATUS, payload)
  }

  static async sendEmployerJobFilled(data: {
    userId: string
    email: string
    firstName: string
    jobId: string
    jobTitle: string
    companyName: string
    hiredCandidateName: string
    applicationId: string
    filledAt: string
    jobUrl: string
    hiredCandidateEmail: string
  }): Promise<{ success: boolean; error?: string }> {
    const payload: EmployerJobFilledWebhook = {
      event_type: 'employer.job_filled',
      event_id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      user_type: 'employer',
      user_data: {
        id: data.userId,
        email: data.email,
        name: data.firstName,
        first_name: data.firstName
      },
      notification_data: {
        job_id: data.jobId,
        job_title: data.jobTitle,
        company_name: data.companyName,
        hired_candidate_name: data.hiredCandidateName,
        application_id: data.applicationId,
        filled_at: data.filledAt,
        job_url: data.jobUrl,
        hired_candidate_email: data.hiredCandidateEmail
      }
    }

    return this.sendWebhook(process.env.EXTERNAL_WEBHOOK_EMPLOYER_JOB_FILLED, payload)
  }

  static async sendEmployerInvitationAccepted(data: {
    userId: string
    email: string
    firstName: string
    jobId: string
    jobTitle: string
    candidateName: string
    candidateEmail: string
    applicationId: string
    companyName: string
    applicationUrl: string
    invitedAt: string
    acceptedAt: string
  }): Promise<{ success: boolean; error?: string }> {
    const payload: EmployerInvitationAcceptedWebhook = {
      event_type: 'employer.invitation_accepted',
      event_id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      user_type: 'employer',
      user_data: {
        id: data.userId,
        email: data.email,
        name: data.firstName,
        first_name: data.firstName
      },
      notification_data: {
        job_id: data.jobId,
        job_title: data.jobTitle,
        candidate_name: data.candidateName,
        candidate_email: data.candidateEmail,
        application_id: data.applicationId,
        company_name: data.companyName,
        application_url: data.applicationUrl,
        invited_at: data.invitedAt,
        accepted_at: data.acceptedAt
      }
    }

    return this.sendWebhook(process.env.EXTERNAL_WEBHOOK_EMPLOYER_INVITATION_ACCEPTED, payload)
  }

  static async sendEmployerPaymentConfirmation(data: {
    userId: string
    email: string
    firstName: string
    amount: number
    description: string
    transactionId: string
    invoiceUrl?: string
    packageName?: string
    creditsPurchased?: number
  }): Promise<{ success: boolean; error?: string }> {
    const payload: EmployerPaymentConfirmationWebhook = {
      event_type: 'employer.payment_confirmation',
      event_id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      user_type: 'employer',
      user_data: {
        id: data.userId,
        email: data.email,
        name: data.firstName,
        first_name: data.firstName
      },
      notification_data: {
        amount: data.amount,
        description: data.description,
        transaction_id: data.transactionId,
        invoice_url: data.invoiceUrl,
        package_name: data.packageName,
        credits_purchased: data.creditsPurchased
      }
    }

    return this.sendWebhook(process.env.EXTERNAL_WEBHOOK_EMPLOYER_PAYMENT_CONFIRMATION, payload)
  }

  // Error notification methods
  static async sendSystemError(data: {
    userId?: string
    email?: string
    firstName?: string
    userType: 'seeker' | 'employer'
    errorType: string
    errorMessage: string
    errorContext: Record<string, any>
    severity: 'low' | 'medium' | 'high' | 'critical'
  }): Promise<{ success: boolean; error?: string }> {
    const payload: SystemErrorWebhook = {
      event_type: 'system.error',
      event_id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      user_type: data.userType,
      user_data: {
        id: data.userId || 'unknown',
        email: data.email || 'unknown',
        name: data.firstName || 'Unknown User',
        first_name: data.firstName
      },
      notification_data: {
        error_type: data.errorType,
        error_message: data.errorMessage,
        error_context: data.errorContext,
        timestamp: new Date().toISOString(),
        severity: data.severity
      }
    }

    return this.sendWebhook(process.env.EXTERNAL_WEBHOOK_SYSTEM_ERROR, payload)
  }

  static async sendWebhookProcessingError(data: {
    userId?: string
    email?: string
    firstName?: string
    userType: 'seeker' | 'employer'
    sourceWebhook: string
    errorMessage: string
    payloadData: Record<string, any>
    processingStep: string
    retryCount?: number
  }): Promise<{ success: boolean; error?: string }> {
    const payload: WebhookProcessingErrorWebhook = {
      event_type: 'webhook.processing_error',
      event_id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      user_type: data.userType,
      user_data: {
        id: data.userId || 'unknown',
        email: data.email || 'unknown',
        name: data.firstName || 'Unknown User',
        first_name: data.firstName
      },
      notification_data: {
        source_webhook: data.sourceWebhook,
        error_message: data.errorMessage,
        payload_data: data.payloadData,
        processing_step: data.processingStep,
        retry_count: data.retryCount
      }
    }

    return this.sendWebhook(process.env.EXTERNAL_WEBHOOK_PROCESSING_ERROR, payload)
  }

  /**
   * Test webhook endpoint connectivity
   */
  static async testWebhook(url: string): Promise<{ success: boolean; error?: string; responseTime?: number }> {
    const startTime = Date.now()

    const testPayload: ExternalWebhookPayload = {
      event_type: 'test.connection',
      event_id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      user_type: 'seeker',
      user_data: {
        id: 'test_user_id',
        email: 'test@example.com',
        name: 'Test User'
      },
      notification_data: {
        message: 'This is a test webhook to verify connectivity'
      }
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'AmperTalent-Webhook/1.0'
      }

      // Add authentication header if secret is configured
      if (this.SECRET) {
        // Check if secret contains username:password for Basic auth
        if (this.SECRET.includes(':')) {
          // Use Basic authentication (username:password format)
          const basicAuth = Buffer.from(this.SECRET).toString('base64')
          headers['Authorization'] = `Basic ${basicAuth}`
        } else {
          // Fallback to Bearer token
          headers['Authorization'] = `Bearer ${this.SECRET}`
        }

        // Also include HMAC signature for additional security
        const signature = this.generateSignature(JSON.stringify(testPayload))
        headers['X-Webhook-Signature'] = signature
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(testPayload),
        signal: AbortSignal.timeout(this.TIMEOUT)
      })

      const responseTime = Date.now() - startTime

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return { success: true, responseTime }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, error: errorMessage, responseTime: Date.now() - startTime }
    }
  }

  /**
   * Send employer interview update webhook
   */
  static async sendEmployerInterviewUpdate(data: {
    userId: string
    email: string
    firstName: string
    jobId: string
    jobTitle: string
    candidateName: string
    applicationId: string
    stage: string
    notes?: string
    nextAction?: string
    companyName: string
    applicationUrl: string
    candidateEmail: string
  }): Promise<{ success: boolean; error?: string }> {
    const payload: EmployerInterviewUpdateWebhook = {
      event_type: 'employer.interview_update',
      event_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      user_type: 'employer',
      user_data: {
        id: data.userId,
        email: data.email,
        name: data.firstName,
        first_name: data.firstName
      },
      notification_data: {
        job_id: data.jobId,
        job_title: data.jobTitle,
        candidate_name: data.candidateName,
        application_id: data.applicationId,
        stage: data.stage,
        notes: data.notes,
        next_action: data.nextAction,
        company_name: data.companyName,
        application_url: data.applicationUrl,
        candidate_email: data.candidateEmail
      }
    }

    return this.sendWebhook(process.env.EXTERNAL_WEBHOOK_EMPLOYER_INTERVIEW_UPDATE, payload)
  }
}

// Export singleton instance
export const externalWebhookService = ExternalWebhookService