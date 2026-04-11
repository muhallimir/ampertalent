import { notificationService } from './notification-service'

// Event types that can trigger notifications
export type EventType =
  | 'user_registered'
  | 'job_submitted'
  | 'job_approved'
  | 'job_rejected'
  | 'application_submitted'
  | 'application_status_changed'
  | 'payment_completed'
  | 'subscription_renewed'

// Event data interfaces
export interface UserRegisteredEvent {
  userId: string
  email: string
  firstName: string
  lastName?: string
  role: 'seeker' | 'employer'
  companyName?: string
}

export interface JobSubmittedEvent {
  jobId: string
  employerId: string
  employerEmail: string
  employerName: string
  jobTitle: string
  companyName: string
}

export interface JobApprovedEvent {
  jobId: string
  employerId: string
  employerEmail: string
  employerName: string
  jobTitle: string
  companyName: string
  jobUrl: string
}

export interface JobRejectedEvent {
  jobId: string
  employerId: string
  employerEmail: string
  employerName: string
  jobTitle: string
  companyName: string
  rejectionReason: string
  editUrl: string
}

export interface ApplicationSubmittedEvent {
  applicationId: string
  jobId: string
  jobTitle: string
  seekerId: string
  seekerName: string
  seekerEmail: string
  employerId: string
  employerEmail: string
  employerName: string
  companyName: string
  applicationUrl: string
}

export interface ApplicationStatusChangedEvent {
  applicationId: string
  jobId: string
  jobTitle: string
  seekerId: string
  seekerEmail: string
  seekerName: string
  companyName: string
  status: 'reviewed' | 'interview' | 'rejected' | 'hired'
  message?: string
  jobUrl: string
}

export interface PaymentCompletedEvent {
  userId: string
  userEmail: string
  userName: string
  amount: number
  description: string
  transactionId: string
  invoiceUrl?: string
}

// Event data union type
export type EventData =
  | UserRegisteredEvent
  | JobSubmittedEvent
  | JobApprovedEvent
  | JobRejectedEvent
  | ApplicationSubmittedEvent
  | ApplicationStatusChangedEvent
  | PaymentCompletedEvent

/**
 * Event emitter for triggering notifications
 */
export class EventEmitter {
  private static listeners: Map<EventType, Array<(data: unknown) => Promise<void>>> = new Map()

  /**
   * Register an event listener
   */
  static on(eventType: EventType, listener: (data: unknown) => Promise<void>): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, [])
    }
    this.listeners.get(eventType)!.push(listener)
  }

  /**
   * Remove an event listener
   */
  static off(eventType: EventType, listener: (data: unknown) => Promise<void>): void {
    const listeners = this.listeners.get(eventType)
    if (listeners) {
      const index = listeners.indexOf(listener)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  /**
   * Emit an event to all listeners
   */
  static async emit(eventType: EventType, data: EventData): Promise<void> {
    const listeners = this.listeners.get(eventType) || []

    // Execute all listeners concurrently
    const promises = listeners.map(listener =>
      listener(data).catch(error => {
        console.error(`Error in event listener for ${eventType}:`, error)
      })
    )

    await Promise.all(promises)
  }

  /**
   * Get all registered event types
   */
  static getEventTypes(): EventType[] {
    return Array.from(this.listeners.keys())
  }

  /**
   * Get listener count for an event type
   */
  static getListenerCount(eventType: EventType): number {
    return this.listeners.get(eventType)?.length || 0
  }

  /**
   * Clear all listeners for an event type
   */
  static clearListeners(eventType: EventType): void {
    this.listeners.delete(eventType)
  }

  /**
   * Clear all listeners
   */
  static clearAllListeners(): void {
    this.listeners.clear()
  }
}

/**
 * Notification event handlers
 * These automatically trigger appropriate notifications when events occur
 */
export class NotificationEventHandlers {
  /**
   * Initialize all notification event handlers
   */
  static initialize(): void {
    // User registration events
    EventEmitter.on('user_registered', async (data: unknown) => {
      await this.handleUserRegistered(data as UserRegisteredEvent)
    })

    // Job events
    EventEmitter.on('job_approved', async (data: unknown) => {
      await this.handleJobApproved(data as JobApprovedEvent)
    })
    EventEmitter.on('job_rejected', async (data: unknown) => {
      await this.handleJobRejected(data as JobRejectedEvent)
    })

    // Application events
    EventEmitter.on('application_submitted', async (data: unknown) => {
      await this.handleApplicationSubmitted(data as ApplicationSubmittedEvent)
    })
    EventEmitter.on('application_status_changed', async (data: unknown) => {
      await this.handleApplicationStatusChanged(data as ApplicationStatusChangedEvent)
    })

    // Payment events
    EventEmitter.on('payment_completed', async (data: unknown) => {
      await this.handlePaymentCompleted(data as PaymentCompletedEvent)
    })
    console.log('Notification event handlers initialized')
  }

  /**
   * Handle user registration event
   */
  private static async handleUserRegistered(data: UserRegisteredEvent): Promise<void> {
    try {
      const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`

      if (data.role === 'seeker') {
        await notificationService.sendWelcomeSeeker({
          firstName: data.firstName,
          email: data.email,
          loginUrl
        })
      } else if (data.role === 'employer') {
        await notificationService.sendWelcomeEmployer({
          firstName: data.firstName,
          companyName: data.companyName || 'Your Company',
          email: data.email,
          loginUrl
        })
      }
    } catch (error) {
      console.error('Error handling user registration event:', error)
    }
  }

  /**
   * Handle job approved event
   */
  private static async handleJobApproved(data: JobApprovedEvent): Promise<void> {
    try {
      await notificationService.sendJobApproved({
        firstName: data.employerName,
        jobTitle: data.jobTitle,
        jobId: data.jobId,
        jobUrl: data.jobUrl,
        companyName: data.companyName,
        email: data.employerEmail
      })
    } catch (error) {
      console.error('Error handling job approved event:', error)
    }
  }

  /**
   * Handle job rejected event
   */
  private static async handleJobRejected(data: JobRejectedEvent): Promise<void> {
    try {
      await notificationService.sendJobRejected({
        firstName: data.employerName,
        jobTitle: data.jobTitle,
        rejectionReason: data.rejectionReason,
        companyName: data.companyName,
        editUrl: data.editUrl,
        email: data.employerEmail
      })
    } catch (error) {
      console.error('Error handling job rejected event:', error)
    }
  }

  /**
   * Handle application submitted event
   */
  private static async handleApplicationSubmitted(data: ApplicationSubmittedEvent): Promise<void> {
    try {
      await notificationService.sendNewApplication({
        firstName: data.employerName,
        jobTitle: data.jobTitle,
        candidateName: data.seekerName,
        applicationUrl: data.applicationUrl,
        companyName: data.companyName,
        email: data.employerEmail
      })
    } catch (error) {
      console.error('Error handling application submitted event:', error)
    }
  }

  /**
   * Handle application status changed event
   */
  private static async handleApplicationStatusChanged(data: ApplicationStatusChangedEvent): Promise<void> {
    try {
      await notificationService.sendApplicationStatusUpdate({
        firstName: data.seekerName,
        jobTitle: data.jobTitle,
        companyName: data.companyName,
        status: data.status,
        message: data.message,
        jobUrl: data.jobUrl,
        email: data.seekerEmail
      })
    } catch (error) {
      console.error('Error handling application status changed event:', error)
    }
  }

  /**
   * Handle payment completed event
   */
  private static async handlePaymentCompleted(data: PaymentCompletedEvent): Promise<void> {
    try {
      await notificationService.sendPaymentConfirmation({
        firstName: data.userName,
        email: data.userEmail,
        amount: data.amount,
        description: data.description,
        transactionId: data.transactionId,
        invoiceUrl: data.invoiceUrl
      })
    } catch (error) {
      console.error('Error handling payment completed event:', error)
    }
  }

}

// Helper functions for common event emissions
export const emitEvent = {
  /**
   * Emit user registered event
   */
  userRegistered: (data: UserRegisteredEvent) =>
    EventEmitter.emit('user_registered', data),

  /**
   * Emit job approved event
   */
  jobApproved: (data: JobApprovedEvent) =>
    EventEmitter.emit('job_approved', data),

  /**
   * Emit job rejected event
   */
  jobRejected: (data: JobRejectedEvent) =>
    EventEmitter.emit('job_rejected', data),

  /**
   * Emit application submitted event
   */
  applicationSubmitted: (data: ApplicationSubmittedEvent) =>
    EventEmitter.emit('application_submitted', data),

  /**
   * Emit application status changed event
   */
  applicationStatusChanged: (data: ApplicationStatusChangedEvent) =>
    EventEmitter.emit('application_status_changed', data),

  /**
   * Emit payment completed event
   */
  paymentCompleted: (data: PaymentCompletedEvent) =>
    EventEmitter.emit('payment_completed', data),
}

// Initialize notification handlers when this module is imported
NotificationEventHandlers.initialize()
