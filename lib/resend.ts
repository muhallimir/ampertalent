/**
 * Resend Email Service
 * 
 * Handles transactional email sending via Resend.
 * This service is used for all admin notifications and transactional emails.
 * 
 * Configuration:
 * - RESEND_API_KEY: API key from Resend dashboard
 * - RESEND_FROM_EMAIL: Verified sender email (e.g., team@notifications.ampertalent.com)
 */

import { Resend } from 'resend'

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY)

// Default sender email
const DEFAULT_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'team@notifications.ampertalent.com'

export interface SendEmailOptions {
    to: string | string[]
    subject: string
    html: string
    text?: string
    from?: string
    replyTo?: string
    tags?: { name: string; value: string }[]
}

export interface SendEmailResult {
    success: boolean
    messageId?: string
    error?: string
}

/**
 * Send an email via Resend
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    try {
        const { to, subject, html, text, from, replyTo, tags } = options

        const { data, error } = await resend.emails.send({
            from: from || DEFAULT_FROM_EMAIL,
            to: Array.isArray(to) ? to : [to],
            subject,
            html,
            text,
            replyTo,
            tags
        })

        if (error) {
            console.error('❌ Resend email error:', error)
            return {
                success: false,
                error: error.message
            }
        }

        console.log('✅ Email sent successfully via Resend:', {
            messageId: data?.id,
            to: Array.isArray(to) ? to.join(', ') : to,
            subject
        })

        return {
            success: true,
            messageId: data?.id
        }
    } catch (error) {
        console.error('❌ Failed to send email via Resend:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}

/**
 * Send email to multiple recipients (batch)
 */
export async function sendBatchEmails(
    recipients: string[],
    subject: string,
    html: string,
    text?: string
): Promise<SendEmailResult> {
    return sendEmail({
        to: recipients,
        subject,
        html,
        text
    })
}

export interface BatchEmailPayload {
    to: string
    subject: string
    html: string
    text?: string
    tags?: { name: string; value: string }[]
}

/**
 * Send up to 100 individually-addressed emails in a single Resend API call.
 * This is the correct approach for reminder jobs — one HTTP request, no rate-limit loops.
 * See: https://resend.com/docs/api-reference/emails/send-batch-emails
 */
export async function sendBatchIndividualEmails(
    emails: BatchEmailPayload[],
    from?: string
): Promise<{ sent: number; errors: string[] }> {
    if (emails.length === 0) return { sent: 0, errors: [] }

    const fromAddress = from || DEFAULT_FROM_EMAIL

    try {
        const { data, error } = await resend.batch.send(
            emails.map(e => ({
                from: fromAddress,
                to: [e.to],
                subject: e.subject,
                html: e.html,
                text: e.text,
                tags: e.tags
            }))
        )

        if (error) {
            console.error('❌ Resend batch email error:', error)
            return { sent: 0, errors: [error.message] }
        }

        const sent = data?.data?.length ?? emails.length
        console.log(`✅ Resend batch sent ${sent} emails in one API call`)
        return { sent, errors: [] }
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('❌ Resend batch send failed:', msg)
        return { sent: 0, errors: [msg] }
    }
}

/**
 * Get admin notification recipients from environment
 */
export function getAdminNotificationRecipients(): string[] {
    const envRecipients = process.env.ADMIN_ORDER_NOTIFICATION_EMAILS

    if (!envRecipients) {
        // Fallback to hardcoded list for safety
        return [
            'contact@ampertalent.com',
            'lesley@ampertalent.com',
            'melissa@locusdigital.ai'
        ]
    }

    return envRecipients.split(',').map(email => email.trim()).filter(Boolean)
}

export { resend }
