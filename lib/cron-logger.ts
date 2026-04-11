import { db } from './db';

export interface ActionLogInput {
  actionType: string;
  entityType?: string;
  entityId?: string;
  status: 'success' | 'failed' | 'skipped' | 'warning';
  message?: string;
  details?: string;
}

// ============================================
// Helper Types for Error Details
// ============================================

export interface PaymentSuccessInfo {
  plan: string;
  amount: number;
  transactionId: string;
  method: 'AuthNet' | 'PayPal';
  cycle?: string; // "3/6" for recurring
  email?: string;
}

export interface AuthNetErrorInfo {
  errorCode: string;
  errorText: string;
  customerProfileId?: string;
  paymentProfileId?: string;
  responseCode?: string;
}

export interface PayPalErrorInfo {
  error: string;
  errorDescription?: string;
  billingAgreementId?: string;
  debugId?: string;
  correlationId?: string;
}

export interface PaymentAttempt {
  method: 'AuthNet' | 'PayPal';
  label: string;
  error: string;
}

export interface PaymentFailureInfo {
  plan: string;
  amount: number;
  method: 'AuthNet' | 'PayPal';
  error: AuthNetErrorInfo | PayPalErrorInfo;
  email?: string;
  fallbackAttempts?: PaymentAttempt[];
}

// ============================================
// Helper Functions for Formatting Details
// ============================================

export class LogFormatter {
  /**
   * Format success payment details
   */
  static success(info: PaymentSuccessInfo): string {
    let details = `Plan: ${info.plan}, Amount: $${info.amount.toFixed(2)}, TxnId: ${info.transactionId}, Method: ${info.method}`;
    if (info.cycle) {
      details += `, Cycle: ${info.cycle}`;
    }
    if (info.email) {
      details += `\nEmail: ${info.email}`;
    }
    return details;
  }

  /**
   * Format AuthNet error details
   */
  static authNetError(info: PaymentFailureInfo): string {
    const err = info.error as AuthNetErrorInfo;
    let details = `Plan: ${info.plan}, Amount: $${info.amount.toFixed(2)}, Method: AuthNet`;
    if (info.email) {
      details += `\nEmail: ${info.email}`;
    }
    details += `\nERROR: [${err.errorCode}] ${err.errorText}`;
    if (err.customerProfileId) {
      details += `\nCustomerProfileId: ${err.customerProfileId}`;
    }
    if (err.paymentProfileId) {
      details += `\nPaymentProfileId: ${err.paymentProfileId}`;
    }
    if (err.responseCode) {
      details += `\nResponseCode: ${err.responseCode}`;
    }
    return details;
  }

  /**
   * Format PayPal error details
   */
  static payPalError(info: PaymentFailureInfo): string {
    const err = info.error as PayPalErrorInfo;
    let details = `Plan: ${info.plan}, Amount: $${info.amount.toFixed(2)}, Method: PayPal`;
    if (info.email) {
      details += `\nEmail: ${info.email}`;
    }
    details += `\nERROR: ${err.error}`;
    if (err.errorDescription) {
      details += ` - ${err.errorDescription}`;
    }
    if (err.billingAgreementId) {
      details += `\nBillingAgreementId: ${err.billingAgreementId}`;
    }
    if (err.debugId) {
      details += `\nPayPalDebugId: ${err.debugId}`;
    }
    if (err.correlationId) {
      details += `\nCorrelationId: ${err.correlationId}`;
    }
    return details;
  }

  /**
   * Format error with fallback attempts
   */
  static fallbackExhausted(info: PaymentFailureInfo): string {
    let details = `Plan: ${info.plan}, Amount: $${info.amount.toFixed(2)}`;
    if (info.email) {
      details += `\nEmail: ${info.email}`;
    }
    details += `\nERROR: All payment methods exhausted`;
    
    if (info.fallbackAttempts && info.fallbackAttempts.length > 0) {
      details += `\nAttempted methods:`;
      info.fallbackAttempts.forEach((attempt, index) => {
        details += `\n  ${index + 1}. ${attempt.method} (${attempt.label}) - ${attempt.error}`;
      });
    }
    return details;
  }

  /**
   * Format skipped action details
   */
  static skipped(reason: string, info?: { plan?: string; email?: string; entityId?: string }): string {
    let details = `SKIPPED: ${reason}`;
    if (info?.plan) {
      details += `\nPlan: ${info.plan}`;
    }
    if (info?.email) {
      details += `\nEmail: ${info.email}`;
    }
    if (info?.entityId) {
      details += `\nEntityId: ${info.entityId}`;
    }
    return details;
  }

  /**
   * Format generic error from any source
   */
  static genericError(error: unknown, context?: Record<string, string | number | undefined>): string {
    let details = '';
    
    // Add context info
    if (context) {
      const contextParts = Object.entries(context)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => `${k}: ${v}`);
      if (contextParts.length > 0) {
        details += contextParts.join(', ');
        details += '\n';
      }
    }

    // Format the error
    if (error instanceof Error) {
      details += `ERROR: ${error.message}`;
      if (error.stack) {
        // Only include first 3 lines of stack trace
        const stackLines = error.stack.split('\n').slice(0, 4).join('\n');
        details += `\nStack: ${stackLines}`;
      }
    } else if (typeof error === 'object' && error !== null) {
      details += `ERROR: ${JSON.stringify(error, null, 2)}`;
    } else {
      details += `ERROR: ${String(error)}`;
    }

    return details;
  }
}

// ============================================
// Main CronLogger Class
// ============================================

export class CronLogger {
  static async start(taskName: string, triggeredBy: string = 'cron'): Promise<string> {
    const log = await db.executionLog.create({
      data: {
        taskName,
        triggeredBy,
        status: 'running',
      }
    });
    return log.id;
  }

  static async logAction(executionId: string | null, action: ActionLogInput): Promise<string> {
    const record = await db.actionLog.create({
      data: {
        executionId,
        actionType: action.actionType,
        entityType: action.entityType ?? null,
        entityId: action.entityId ?? null,
        status: action.status,
        message: action.message ?? null,
        details: action.details ?? null,
      }
    });
    return record.id;
  }

  static async logActions(executionId: string | null, actions: ActionLogInput[]): Promise<number> {
    const result = await db.actionLog.createMany({
      data: actions.map(action => ({
        executionId,
        actionType: action.actionType,
        entityType: action.entityType ?? null,
        entityId: action.entityId ?? null,
        status: action.status,
        message: action.message ?? null,
        details: action.details ?? null,
      }))
    });
    return result.count;
  }

  static async finish(logId: string, results: {
    processed?: number;
    successful?: number;
    failed?: number;
    errors?: string[];
    results?: any;
  }, startTime: number): Promise<void> {
    const durationMs = Date.now() - startTime;
    const hasErrors = (results.failed && results.failed > 0) || (results.errors && results.errors.length > 0);

    const summary = `Processed: ${results.processed ?? 0}, Successful: ${results.successful ?? 0}, Failed: ${results.failed ?? 0}`;
    let logOutput: string | null = null;

    const parts: string[] = [];
    if (results.errors && results.errors.length > 0) {
      parts.push(`Errors:\n${results.errors.join('\n')}`);
    }
    if (results.results) {
      try {
        parts.push(`Results:\n${JSON.stringify(results.results, null, 2)}`);
      } catch {
        parts.push(`Results: [unable to serialize]`);
      }
    }
    if (parts.length > 0) {
      logOutput = parts.join('\n\n');
    }

    await db.executionLog.update({
      where: { id: logId },
      data: {
        status: hasErrors ? 'completed_with_errors' : 'completed',
        completedAt: new Date(),
        durationMs,
        summary,
        logOutput,
      }
    });
  }

  static async fail(logId: string, error: unknown, startTime: number): Promise<void> {
    const durationMs = Date.now() - startTime;

    await db.executionLog.update({
      where: { id: logId },
      data: {
        status: 'failed',
        completedAt: new Date(),
        durationMs,
        summary: 'Execution failed with critical error',
        logOutput: LogFormatter.genericError(error),
      }
    });
  }

  /**
   * Mark any executions stuck in 'running' state for longer than staleAfterMinutes as failed.
   * This handles cases where the process was killed (e.g. Vercel timeout) before finish/fail was called.
   */
  static async cleanupStaleExecutions(staleAfterMinutes: number = 60): Promise<number> {
    const cutoff = new Date(Date.now() - staleAfterMinutes * 60 * 1000);

    const result = await db.executionLog.updateMany({
      where: {
        status: 'running',
        createdAt: { lt: cutoff },
      },
      data: {
        status: 'failed',
        completedAt: new Date(),
        summary: 'Execution abandoned (process timeout or kill)',
        logOutput: `Marked as failed by stale-execution cleanup. No completion signal received after ${staleAfterMinutes} minutes.`,
      },
    });

    if (result.count > 0) {
      console.warn(`⚠️  [CronLogger] Marked ${result.count} stale execution(s) as failed (running > ${staleAfterMinutes}min)`);
    }

    return result.count;
  }
}
