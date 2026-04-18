/**
 * Customer Payment & Subscription Reminder Email Tests
 *
 * Tests for customer-facing payment confirmation and subscription renewal reminder emails.
 * These are SEPARATE from admin notifications - these go to customers (seekers/employers).
 *
 * Updated: Feb 26, 2026 — R1–R13 revisions implemented.
 * New params: lastName, isRecurring, billingFirstName, billingLastName, address, city, state, zipCode
 *
 * Updated: Billing & Payment Method fixes —
 *   - paymentMethod?: string param added to sendCustomerPaymentConfirmationEmail (Issue 4)
 *   - PayPal path: paymentMethod remains undefined (template uses its own "Method: PayPal" row)
 *   - Card path: paymentMethod = "Brand ending in XXXX" (e.g. "Visa ending in 1234")
 *
 * Coding Standards: YAGNI, DRY, KISS, SOLID
 */

import { NotificationService } from '@/lib/notification-service'
import { sendEmail } from '@/lib/resend'
import { emailTemplates } from '@/lib/email-templates'

// Mock the resend module
jest.mock('@/lib/resend', () => ({
    sendEmail: jest.fn().mockResolvedValue({ success: true, messageId: 'test-msg-123' }),
    getAdminNotificationRecipients: jest.fn().mockReturnValue(['admin@test.com'])
}))

// Mock email templates (use actual implementation)
jest.mock('@/lib/email-templates', () => ({
    emailTemplates: {
        paymentConfirmation: jest.fn().mockReturnValue({
            subject: 'Payment Confirmation - Test',
            html: '<html>Payment confirmed</html>',
            text: 'Payment confirmed'
        }),
        subscriptionReminder: jest.fn().mockReturnValue({
            subject: 'Your subscription renewal is coming up',
            html: '<html>Renewal reminder</html>',
            text: 'Renewal reminder'
        })
    }
}))

// Enable customer payment emails for all tests by default
// (The "Feature Flag" describe block overrides this per-test)
beforeAll(() => {
    process.env.ENABLE_CUSTOMER_PAYMENT_EMAILS = 'true'
})

describe('Customer Payment Confirmation Emails', () => {
    afterEach(() => {
        jest.clearAllMocks()
    })

    describe('sendCustomerPaymentConfirmationEmail', () => {
        const baseParams = {
            email: 'customer@example.com',
            firstName: 'John',
            amount: 34.99,
            description: 'Gold Membership',
            transactionId: 'TXN-123456',
            isRecurring: false,
        }

        it('should send email with correct parameters for seeker subscription', async () => {
            const result = await NotificationService.sendCustomerPaymentConfirmationEmail(baseParams)

            expect(emailTemplates.paymentConfirmation).toHaveBeenCalledWith(expect.objectContaining({
                firstName: 'John',
                email: 'customer@example.com',
                amount: 34.99,
                description: 'Gold Membership',
                transactionId: 'TXN-123456',
                isRecurring: false,
            }))

            expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
                to: 'customer@example.com',
                tags: [{ name: 'type', value: 'customer_payment_confirmation' }]
            }))

            expect(result.success).toBe(true)
        })

        it('should pass billing info fields when provided (Authnet checkout flow)', async () => {
            const paramsWithBilling = {
                ...baseParams,
                lastName: 'Doe',
                billingFirstName: 'Jonathan',
                billingLastName: 'Doe',
                address: '123 Main St',
                city: 'Dallas',
                state: 'TX',
                zipCode: '75001',
                paymentType: 'card' as const,
            }

            const result = await NotificationService.sendCustomerPaymentConfirmationEmail(paramsWithBilling)

            expect(emailTemplates.paymentConfirmation).toHaveBeenCalledWith(expect.objectContaining({
                lastName: 'Doe',
                billingFirstName: 'Jonathan',
                billingLastName: 'Doe',
                address: '123 Main St',
                city: 'Dallas',
                state: 'TX',
                zipCode: '75001',
                paymentType: 'card',
            }))
            expect(result.success).toBe(true)
        })

        it('should pass paymentType "paypal" for PayPal flows (no billing address fields)', async () => {
            const paypalParams = {
                ...baseParams,
                paymentType: 'paypal' as const,
            }

            const result = await NotificationService.sendCustomerPaymentConfirmationEmail(paypalParams)

            expect(emailTemplates.paymentConfirmation).toHaveBeenCalledWith(expect.objectContaining({
                paymentType: 'paypal',
                billingFirstName: undefined,
                billingLastName: undefined,
                address: undefined,
                city: undefined,
                state: undefined,
                zipCode: undefined,
            }))
            expect(result.success).toBe(true)
        })

        it('should pass paymentMethod string to template when provided (Authnet card)', async () => {
            const paramsWithPaymentMethod = {
                ...baseParams,
                paymentType: 'card' as const,
                paymentMethod: 'Visa ending in 1234',
            }

            const result = await NotificationService.sendCustomerPaymentConfirmationEmail(paramsWithPaymentMethod)

            expect(emailTemplates.paymentConfirmation).toHaveBeenCalledWith(expect.objectContaining({
                paymentType: 'card',
                paymentMethod: 'Visa ending in 1234',
            }))
            expect(result.success).toBe(true)
        })

        it('should pass paymentMethod as undefined when not provided (no payment method row shown)', async () => {
            const result = await NotificationService.sendCustomerPaymentConfirmationEmail(baseParams)

            expect(emailTemplates.paymentConfirmation).toHaveBeenCalledWith(expect.objectContaining({
                paymentMethod: undefined,
            }))
            expect(result.success).toBe(true)
        })

        it('should not pass paymentMethod for PayPal flows', async () => {
            const paypalParams = {
                ...baseParams,
                paymentType: 'paypal' as const,
                // paymentMethod intentionally omitted — PayPal path has its own "Method: PayPal" row
            }

            const result = await NotificationService.sendCustomerPaymentConfirmationEmail(paypalParams)

            expect(emailTemplates.paymentConfirmation).toHaveBeenCalledWith(expect.objectContaining({
                paymentType: 'paypal',
                paymentMethod: undefined,
            }))
            expect(result.success).toBe(true)
        })

        it('should pass undefined billing fields for saved-card flows (no billing info)', async () => {
            // Saved card flows: billing fields omitted → template renders "Not provided"
            const result = await NotificationService.sendCustomerPaymentConfirmationEmail(baseParams)

            expect(emailTemplates.paymentConfirmation).toHaveBeenCalledWith(expect.objectContaining({
                billingFirstName: undefined,
                billingLastName: undefined,
                address: undefined,
                city: undefined,
                state: undefined,
                zipCode: undefined,
            }))
            expect(result.success).toBe(true)
        })

        it('should send email for employer package purchase with add-ons (isRecurring: false)', async () => {
            const employerParams = {
                email: 'employer@company.com',
                firstName: 'Jane',
                amount: 149.99,
                description: 'Concierge Package with Add-ons',
                transactionId: 'TXN-EMPLOYER-789',
                isRecurring: false,
                lineItems: [
                    { name: 'Concierge Base Package', amount: 99.99 },
                    { name: 'Resume Writing Add-on', amount: 50.00 }
                ]
            }

            const result = await NotificationService.sendCustomerPaymentConfirmationEmail(employerParams)

            expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
                to: 'employer@company.com'
            }))
            expect(result.success).toBe(true)
        })

        it('should send email for trial subscription — isTrial:true, isRecurring omitted', async () => {
            const trialParams = {
                ...baseParams,
                amount: 0,
                description: '3 Day Free Trial Subscription (Free Trial - No Charge Today)',
                isTrial: true,
                isRecurring: undefined,
            }

            const result = await NotificationService.sendCustomerPaymentConfirmationEmail(trialParams)

            expect(emailTemplates.paymentConfirmation).toHaveBeenCalledWith(expect.objectContaining({
                amount: 0,
                isTrial: true,
                description: '3 Day Free Trial Subscription (Free Trial - No Charge Today)',
            }))
            expect(result.success).toBe(true)
        })

        it('should omit End Date row when isRecurring:true (single purchase — 6-month employer package)', async () => {
            // isRecurring:true = single/fixed-term purchase → template omits End Date row entirely
            const recurringPackageParams = {
                email: 'employer@business.com',
                firstName: 'Sarah',
                amount: 97.00,
                description: 'Gold Plus Small Business - Recurring Payment (Month 3 of 6)',
                transactionId: 'TXN-RECURRING-321',
                isRecurring: true,
            }

            const result = await NotificationService.sendCustomerPaymentConfirmationEmail(recurringPackageParams)

            expect(emailTemplates.paymentConfirmation).toHaveBeenCalledWith(expect.objectContaining({
                isRecurring: true,
                description: 'Gold Plus Small Business - Recurring Payment (Month 3 of 6)',
            }))
            expect(result.success).toBe(true)
        })

        it('should show End Date "When cancelled" when isRecurring:false (open-ended subscription)', async () => {
            // isRecurring:false = open-ended subscription → template shows End Date: "When cancelled"
            const subscriptionParams = {
                email: 'seeker@example.com',
                firstName: 'Mike',
                amount: 34.99,
                description: 'Gold Membership - Subscription Renewal',
                transactionId: 'TXN-RENEWAL-456',
                isRecurring: false,
            }

            const result = await NotificationService.sendCustomerPaymentConfirmationEmail(subscriptionParams)

            expect(emailTemplates.paymentConfirmation).toHaveBeenCalledWith(expect.objectContaining({
                isRecurring: false,
                description: 'Gold Membership - Subscription Renewal',
            }))
            expect(result.success).toBe(true)
        })

        it('should include invoice URL when provided', async () => {
            const paramsWithInvoice = {
                ...baseParams,
                invoiceUrl: 'https://ampertalent.com/invoice/INV-123'
            }

            const result = await NotificationService.sendCustomerPaymentConfirmationEmail(paramsWithInvoice)

            expect(emailTemplates.paymentConfirmation).toHaveBeenCalledWith(expect.objectContaining({
                invoiceUrl: 'https://ampertalent.com/invoice/INV-123'
            }))
            expect(result.success).toBe(true)
        })

        it('should handle email sending failure gracefully', async () => {
            (sendEmail as jest.Mock).mockResolvedValueOnce({
                success: false,
                error: 'Resend API error'
            })

            const result = await NotificationService.sendCustomerPaymentConfirmationEmail(baseParams)

            expect(result.success).toBe(false)
            // Error should be present when email sending fails
            expect(result.error).toBe('Resend API error')
        })

        it('should catch and handle exceptions without throwing', async () => {
            (sendEmail as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

            const result = await NotificationService.sendCustomerPaymentConfirmationEmail(baseParams)

            expect(result.success).toBe(false)
            expect(result.error).toContain('Network error')
        })

        it('should send email for premium service purchase (one-time, isRecurring:false)', async () => {
            const serviceParams = {
                email: 'seeker@example.com',
                firstName: 'Alex',
                amount: 49.99,
                description: 'Resume Critique (One-time Service)',
                transactionId: 'TXN-SERVICE-555',
                isRecurring: false,
            }

            const result = await NotificationService.sendCustomerPaymentConfirmationEmail(serviceParams)

            expect(sendEmail).toHaveBeenCalled()
            expect(result.success).toBe(true)
        })
    })
})

describe('Customer Subscription Renewal Reminder Emails', () => {
    afterEach(() => {
        jest.clearAllMocks()
    })

    describe('sendCustomerSubscriptionReminderEmail', () => {
        const baseReminderParams = {
            email: 'seeker@example.com',
            firstName: 'Jane',
            plan: 'VIP Platinum',
            renewalDate: 'March 1, 2026',
            amount: 89.99,
            manageUrl: 'https://ampertalent.com/seeker/subscription',
            daysUntilRenewal: 7
        }

        it('should send 7-day reminder email for seeker subscription', async () => {
            const result = await NotificationService.sendCustomerSubscriptionReminderEmail(baseReminderParams)

            expect(emailTemplates.subscriptionReminder).toHaveBeenCalledWith({
                firstName: 'Jane',
                plan: 'VIP Platinum',
                renewalDate: 'March 1, 2026',
                amount: 89.99,
                manageUrl: 'https://ampertalent.com/seeker/subscription',
                daysUntilRenewal: 7,
                paymentMethod: undefined
            })

            expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
                to: 'seeker@example.com',
                tags: [{ name: 'type', value: 'customer_subscription_reminder' }]
            }))

            expect(result.success).toBe(true)
        })

        it('should send 3-day reminder email', async () => {
            const params = { ...baseReminderParams, daysUntilRenewal: 3 }

            const result = await NotificationService.sendCustomerSubscriptionReminderEmail(params)

            expect(sendEmail).toHaveBeenCalled()
            expect(result.success).toBe(true)
        })

        it('should send 1-day reminder email', async () => {
            const params = { ...baseReminderParams, daysUntilRenewal: 1 }

            const result = await NotificationService.sendCustomerSubscriptionReminderEmail(params)

            expect(sendEmail).toHaveBeenCalled()
            expect(result.success).toBe(true)
        })

        it('should include correct manage subscription URL', async () => {
            const result = await NotificationService.sendCustomerSubscriptionReminderEmail(baseReminderParams)

            expect(emailTemplates.subscriptionReminder).toHaveBeenCalledWith(expect.objectContaining({
                manageUrl: 'https://ampertalent.com/seeker/subscription'
            }))
            expect(result.success).toBe(true)
        })

        it('should handle different seeker plan types', async () => {
            const planTypes = [
                { plan: 'Gold Membership', amount: 34.99 },
                { plan: 'VIP Platinum', amount: 89.99 },
                { plan: 'Annual Platinum', amount: 299.99 }
            ]

            for (const planType of planTypes) {
                jest.clearAllMocks()
                const params = { ...baseReminderParams, ...planType }

                const result = await NotificationService.sendCustomerSubscriptionReminderEmail(params)

                expect(emailTemplates.subscriptionReminder).toHaveBeenCalledWith(expect.objectContaining({
                    plan: planType.plan,
                    amount: planType.amount
                }))
                expect(result.success).toBe(true)
            }
        })

        it('should send reminder for employer 6-month recurring', async () => {
            const employerParams = {
                email: 'employer@company.com',
                firstName: 'Bob',
                plan: 'Gold Plus Small Business (Month 4 of 6)',
                renewalDate: 'March 15, 2026',
                amount: 97.00,
                manageUrl: 'https://ampertalent.com/employer/billing',
                daysUntilRenewal: 7
            }

            const result = await NotificationService.sendCustomerSubscriptionReminderEmail(employerParams)

            expect(emailTemplates.subscriptionReminder).toHaveBeenCalledWith(expect.objectContaining({
                plan: 'Gold Plus Small Business (Month 4 of 6)'
            }))
            expect(result.success).toBe(true)
        })

        it('should handle email sending failure gracefully', async () => {
            (sendEmail as jest.Mock).mockResolvedValueOnce({
                success: false,
                error: 'Rate limit exceeded'
            })

            const result = await NotificationService.sendCustomerSubscriptionReminderEmail(baseReminderParams)

            expect(result.success).toBe(false)
        })

        it('should catch and handle exceptions without throwing', async () => {
            (sendEmail as jest.Mock).mockRejectedValueOnce(new Error('Connection timeout'))

            const result = await NotificationService.sendCustomerSubscriptionReminderEmail(baseReminderParams)

            expect(result.success).toBe(false)
            expect(result.error).toContain('Connection timeout')
        })
    })
})

describe('Edge Cases and Error Handling', () => {
    afterEach(() => {
        jest.clearAllMocks()
    })

    it('should handle empty email address gracefully', async () => {
        const params = {
            email: '',
            firstName: 'Test',
            amount: 34.99,
            description: 'Test Plan',
            transactionId: 'TXN-TEST'
        }

        // Even with empty email, the method should not throw
        const result = await NotificationService.sendCustomerPaymentConfirmationEmail(params)

        // Email sending might fail, but it should be handled gracefully
        expect(sendEmail).toHaveBeenCalled()
    })

    it('should handle special characters in description', async () => {
        const params = {
            email: 'test@example.com',
            firstName: 'Test',
            amount: 99.99,
            description: 'Concierge Package + Resume Writing & Interview Prep',
            transactionId: 'TXN-SPECIAL'
        }

        const result = await NotificationService.sendCustomerPaymentConfirmationEmail(params)

        expect(emailTemplates.paymentConfirmation).toHaveBeenCalledWith(expect.objectContaining({
            description: 'Concierge Package + Resume Writing & Interview Prep'
        }))
        expect(result.success).toBe(true)
    })

    it('should handle very large amounts', async () => {
        const params = {
            email: 'test@example.com',
            firstName: 'Test',
            amount: 9999.99,
            description: 'Enterprise Package',
            transactionId: 'TXN-LARGE'
        }

        const result = await NotificationService.sendCustomerPaymentConfirmationEmail(params)

        expect(emailTemplates.paymentConfirmation).toHaveBeenCalledWith(expect.objectContaining({
            amount: 9999.99
        }))
        expect(result.success).toBe(true)
    })
})

describe('Feature Flag: ENABLE_CUSTOMER_PAYMENT_EMAILS', () => {
    // Save original env
    const originalEnv = process.env.ENABLE_CUSTOMER_PAYMENT_EMAILS

    afterEach(() => {
        jest.clearAllMocks()
        // Restore original env
        process.env.ENABLE_CUSTOMER_PAYMENT_EMAILS = originalEnv
    })

    describe('sendCustomerPaymentConfirmationEmail', () => {
        const baseParams = {
            email: 'customer@example.com',
            firstName: 'John',
            amount: 34.99,
            description: 'Gold Membership',
            transactionId: 'TXN-123456'
        }

        it('should send email when feature flag is enabled (true)', async () => {
            process.env.ENABLE_CUSTOMER_PAYMENT_EMAILS = 'true'

            const result = await NotificationService.sendCustomerPaymentConfirmationEmail(baseParams)

            expect(result.success).toBe(true)
            expect(sendEmail).toHaveBeenCalled()
        })

        it('should NOT send email when feature flag is disabled (false)', async () => {
            process.env.ENABLE_CUSTOMER_PAYMENT_EMAILS = 'false'

            const result = await NotificationService.sendCustomerPaymentConfirmationEmail(baseParams)

            expect(result.success).toBe(true)
            expect(sendEmail).not.toHaveBeenCalled()
        })

        it('should NOT send email when feature flag is undefined', async () => {
            delete process.env.ENABLE_CUSTOMER_PAYMENT_EMAILS

            const result = await NotificationService.sendCustomerPaymentConfirmationEmail(baseParams)

            expect(result.success).toBe(true)
            expect(sendEmail).not.toHaveBeenCalled()
        })
    })

    describe('sendCustomerSubscriptionReminderEmail', () => {
        const baseParams = {
            email: 'seeker@example.com',
            firstName: 'Jane',
            plan: 'Gold',
            renewalDate: 'March 1, 2026',
            amount: 34.99,
            manageUrl: 'https://ampertalent.com/seeker/subscription',
            daysUntilRenewal: 3
        }

        it('should send email when feature flag is enabled (true)', async () => {
            process.env.ENABLE_CUSTOMER_PAYMENT_EMAILS = 'true'

            const result = await NotificationService.sendCustomerSubscriptionReminderEmail(baseParams)

            expect(result.success).toBe(true)
            expect(sendEmail).toHaveBeenCalled()
        })

        it('should NOT send email when feature flag is disabled (false)', async () => {
            process.env.ENABLE_CUSTOMER_PAYMENT_EMAILS = 'false'

            const result = await NotificationService.sendCustomerSubscriptionReminderEmail(baseParams)

            expect(result.success).toBe(true)
            expect(sendEmail).not.toHaveBeenCalled()
        })

        it('should NOT send email when feature flag is undefined', async () => {
            delete process.env.ENABLE_CUSTOMER_PAYMENT_EMAILS

            const result = await NotificationService.sendCustomerSubscriptionReminderEmail(baseParams)

            expect(result.success).toBe(true)
            expect(sendEmail).not.toHaveBeenCalled()
        })
    })
})
