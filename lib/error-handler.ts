import { externalWebhookService } from './external-webhook-service'
import { inAppNotificationService } from './in-app-notification-service'

/**
 * Global Error Handler
 * Handles system errors and sends webhook notifications
 */
export class ErrorHandler {
  /**
   * Handle and report system errors
   */
  static async handleSystemError(
    error: Error | string,
    context: {
      userId?: string
      email?: string
      firstName?: string
      userType?: 'seeker' | 'employer'
      errorType: string
      errorContext: Record<string, any>
      severity?: 'low' | 'medium' | 'high' | 'critical'
    }
  ): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const severity = context.severity || 'medium'
    
    // Log the error
    console.error(`[${severity.toUpperCase()}] SYSTEM ERROR:`, {
      errorType: context.errorType,
      errorMessage,
      userId: context.userId,
      userType: context.userType,
      context: context.errorContext,
      timestamp: new Date().toISOString()
    })

    // Send external webhook notification
    try {
      await externalWebhookService.sendSystemError({
        userId: context.userId,
        email: context.email,
        firstName: context.firstName,
        userType: context.userType || 'seeker',
        errorType: context.errorType,
        errorMessage,
        errorContext: context.errorContext,
        severity
      })
    } catch (webhookError) {
      console.error('Failed to send system error webhook:', webhookError)
      // Don't throw here to avoid infinite error loops
    }

    // Send in-app notification to admins for critical/high severity errors
    if (severity === 'critical' || severity === 'high') {
      try {
        await inAppNotificationService.notifySystemError(
          context.errorType,
          errorMessage,
          severity,
          {
            userId: context.userId,
            userType: context.userType,
            errorContext: context.errorContext,
            timestamp: new Date().toISOString()
          }
        )
      } catch (notificationError) {
        console.error('Failed to send system error in-app notification:', notificationError)
        // Don't throw here to avoid infinite error loops
      }
    }
  }

  /**
   * Handle webhook processing errors
   */
  static async handleWebhookProcessingError(
    error: Error | string,
    context: {
      userId?: string
      email?: string
      firstName?: string
      userType?: 'seeker' | 'employer'
      sourceWebhook: string
      payloadData: Record<string, any>
      processingStep: string
      retryCount?: number
    }
  ): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    // Log the webhook processing error
    console.error('WEBHOOK PROCESSING ERROR:', {
      sourceWebhook: context.sourceWebhook,
      processingStep: context.processingStep,
      errorMessage,
      userId: context.userId,
      userType: context.userType,
      retryCount: context.retryCount,
      timestamp: new Date().toISOString()
    })

    // Send external webhook notification
    try {
      await externalWebhookService.sendWebhookProcessingError({
        userId: context.userId,
        email: context.email,
        firstName: context.firstName,
        userType: context.userType || 'seeker',
        sourceWebhook: context.sourceWebhook,
        errorMessage,
        payloadData: context.payloadData,
        processingStep: context.processingStep,
        retryCount: context.retryCount
      })
    } catch (webhookError) {
      console.error('Failed to send webhook processing error webhook:', webhookError)
      // Don't throw here to avoid infinite error loops
    }
  }

  /**
   * Wrap async functions with error handling
   */
  static wrapAsync<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    errorContext: {
      errorType: string
      userType?: 'seeker' | 'employer'
      severity?: 'low' | 'medium' | 'high' | 'critical'
    }
  ) {
    return async (...args: T): Promise<R> => {
      try {
        return await fn(...args)
      } catch (error) {
        await this.handleSystemError(error as Error, {
          ...errorContext,
          errorContext: { args: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)) }
        })
        throw error
      }
    }
  }

  /**
   * Create error context from request
   */
  static createErrorContext(
    request: any,
    additionalContext: Record<string, any> = {}
  ): Record<string, any> {
    return {
      url: request?.url || 'unknown',
      method: request?.method || 'unknown',
      userAgent: request?.headers?.get?.('user-agent') || 'unknown',
      timestamp: new Date().toISOString(),
      ...additionalContext
    }
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler