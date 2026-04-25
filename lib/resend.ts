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
        // Hardcoded fallback — always notify the primary admin
        return ['mir23wpurposes@gmail.com']
    }

    return envRecipients.split(',').map(email => email.trim()).filter(Boolean)
}

/**
 * Build a branded AmperTalent admin notification email HTML.
 * Use this for all internal admin alerts (purchases, signups, etc.).
 */
export function buildAdminEmailHtml(opts: {
    title: string
    subtitle?: string
    rows: Array<{ label: string; value: string }>
    footerNote?: string
}): string {
    const { title, subtitle, rows, footerNote } = opts
    const tableRows = rows
        .map(
            r =>
                `<tr>
          <td style="padding:10px 14px;border:1px solid #dde3e7;background:#f8fafc;font-weight:600;color:#374151;white-space:nowrap;width:160px">${r.label}</td>
          <td style="padding:10px 14px;border:1px solid #dde3e7;color:#111827">${r.value}</td>
        </tr>`
        )
        .join('')

    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif">
  <div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
    <!-- Logo -->
    <div style="text-align:center;padding:24px 30px 0;background:#ffffff">
      <img src="https://ampertalent.vercel.app/logo/ampertalent_logo.png" alt="AmperTalent" style="width:220px;height:auto" />
    </div>
    <!-- Header -->
    <div style="background:#50b7b7;padding:22px 30px;text-align:center">
      <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600">${title}</h1>
      ${subtitle ? `<p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:13px">${subtitle}</p>` : ''}
    </div>
    <!-- Content -->
    <div style="padding:28px 30px">
      <p style="margin:0 0 20px;font-size:14px;color:#374151">A new transaction was recorded on AmperTalent. Details below:</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tbody>${tableRows}</tbody>
      </table>
      ${footerNote ? `<p style="margin:20px 0 0;font-size:12px;color:#9ca3af;font-style:italic">${footerNote}</p>` : ''}
    </div>
    <!-- Footer -->
    <div style="text-align:center;padding:20px 30px;border-top:1px solid #e5e7eb">
      <p style="margin:0;font-size:12px;color:#9ca3af">© ${new Date().getFullYear()} AmperTalent · Internal Admin Notification · Do not reply</p>
    </div>
  </div>
</body>
</html>`
}

export { resend }
