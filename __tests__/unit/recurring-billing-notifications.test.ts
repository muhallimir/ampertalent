import { RecurringBillingService } from '@/lib/jobs/recurring-billing';
import { inAppNotificationService } from '@/lib/in-app-notification-service';
import { db } from '@/lib/db';

// Mock resend to prevent "Missing API key" error at module load time
jest.mock('@/lib/resend', () => ({
    sendEmail: jest.fn().mockResolvedValue({ success: true }),
    sendBatchIndividualEmails: jest.fn().mockResolvedValue({ sent: 0, errors: [] }),
}));

// Mock dependencies
jest.mock('@/lib/db', () => ({
    db: {
        notification: {
            create: jest.fn(),
        },
        jobSeeker: {
            update: jest.fn(),
        },
        subscription: {
            update: jest.fn(),
        },
        userProfile: {
            findUnique: jest.fn(),
        },
        externalPayment: {
            create: jest.fn(),
        },
    },
}));

jest.mock('@/lib/in-app-notification-service', () => ({
    inAppNotificationService: {
        createNotification: jest.fn().mockResolvedValue({ success: true, notificationId: 'notif-123' }),
        notifySeekerPaymentConfirmation: jest.fn().mockResolvedValue(undefined),
        notifySeekerSubscriptionRenewal: jest.fn().mockResolvedValue(undefined),
    },
}));

jest.mock('@/lib/external-webhook-service', () => ({
    ExternalWebhookService: {
        sendSeekerPaymentConfirmation: jest.fn().mockResolvedValue(undefined),
    },
}));

jest.mock('@/lib/redis', () => ({
    CacheService: {
        incrementMetric: jest.fn().mockResolvedValue(undefined),
    },
}));

jest.mock('@/lib/jobs/membership-reminders', () => ({
    MembershipReminderService: {
        scheduleMembershipReminders: jest.fn().mockResolvedValue(undefined),
    },
}));

describe('RecurringBillingService - In-App Notifications', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('renewMembership - In-App Notification Integration', () => {
        it('should create in-app notification on successful renewal', async () => {
            // Arrange
            const seekerId = 'test-seeker-123';
            const membershipPlan = 'gold_bimonthly';
            const subscriptionId = 'sub-456';
            const transactionId = 'txn-789';

            const mockUserProfile = {
                id: seekerId,
                email: 'test@example.com',
                firstName: 'Test',
            };

            (db.userProfile.findUnique as jest.Mock).mockResolvedValue(mockUserProfile);
            (db.jobSeeker.update as jest.Mock).mockResolvedValue({
                userId: seekerId,
                membershipPlan,
                membershipExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
            });
            (db.subscription.update as jest.Mock).mockResolvedValue({
                id: subscriptionId,
                status: 'active',
            });
            (db.externalPayment.create as jest.Mock).mockResolvedValue({
                id: 'payment-123',
                userId: seekerId,
                amount: 49.99,
            });

            // Act
            await RecurringBillingService['renewMembership'](
                seekerId,
                membershipPlan,
                subscriptionId,
                transactionId
            );

            // Assert - Verify in-app notification was triggered via notifySeekerSubscriptionRenewal
            expect(inAppNotificationService.notifySeekerSubscriptionRenewal).toHaveBeenCalled();
            const notificationCall = (inAppNotificationService.notifySeekerSubscriptionRenewal as jest.Mock).mock.calls[0];
            expect(notificationCall[0]).toBe(seekerId);
            expect(notificationCall[1]).toContain('Gold');
            expect(notificationCall[2]).toBe(49.99);
        });

        it('should include correct seeker ID in renewal notification', async () => {
            // Arrange
            const seekerId = 'test-seeker-789';
            const membershipPlan = 'vip_quarterly';
            const subscriptionId = 'sub-xyz';
            const transactionId = 'txn-abc';

            const mockUserProfile = {
                id: seekerId,
                email: 'vip@example.com',
                firstName: 'VIP',
            };

            (db.userProfile.findUnique as jest.Mock).mockResolvedValue(mockUserProfile);
            (db.jobSeeker.update as jest.Mock).mockResolvedValue({
                userId: seekerId,
                membershipPlan,
            });
            (db.subscription.update as jest.Mock).mockResolvedValue({ id: subscriptionId });
            (db.externalPayment.create as jest.Mock).mockResolvedValue({});

            // Act
            await RecurringBillingService['renewMembership'](
                seekerId,
                membershipPlan,
                subscriptionId,
                transactionId
            );

            // Assert
            const notificationCall = (inAppNotificationService.notifySeekerSubscriptionRenewal as jest.Mock)
                .mock.calls[0];
            expect(notificationCall[0]).toBe(seekerId);
        });

        it('should create notification with correct plan details for gold_bimonthly', async () => {
            // Arrange
            const seekerId = 'gold-seeker';
            const membershipPlan = 'gold_bimonthly';
            const subscriptionId = 'sub-gold';
            const transactionId = 'gold-txn';

            (db.userProfile.findUnique as jest.Mock).mockResolvedValue({
                id: seekerId,
                email: 'gold@test.com',
            });
            (db.jobSeeker.update as jest.Mock).mockResolvedValue({});
            (db.subscription.update as jest.Mock).mockResolvedValue({});
            (db.externalPayment.create as jest.Mock).mockResolvedValue({});

            // Act
            await RecurringBillingService['renewMembership'](
                seekerId,
                membershipPlan,
                subscriptionId,
                transactionId
            );

            // Assert
            const notificationCall = (inAppNotificationService.notifySeekerSubscriptionRenewal as jest.Mock)
                .mock.calls[0];
            expect(notificationCall[1]).toContain('Gold Mom Professional');
            expect(notificationCall[2]).toBe(49.99); // Gold plan amount
        });

        it('should create notification with correct plan details for vip_quarterly', async () => {
            // Arrange
            const seekerId = 'vip-seeker';
            const membershipPlan = 'vip_quarterly';
            const subscriptionId = 'sub-vip';
            const transactionId = 'vip-txn';

            (db.userProfile.findUnique as jest.Mock).mockResolvedValue({
                id: seekerId,
                email: 'vip@test.com',
            });
            (db.jobSeeker.update as jest.Mock).mockResolvedValue({});
            (db.subscription.update as jest.Mock).mockResolvedValue({});
            (db.externalPayment.create as jest.Mock).mockResolvedValue({});

            // Act
            await RecurringBillingService['renewMembership'](
                seekerId,
                membershipPlan,
                subscriptionId,
                transactionId
            );

            // Assert
            const notificationCall = (inAppNotificationService.notifySeekerSubscriptionRenewal as jest.Mock)
                .mock.calls[0];
            expect(notificationCall[1]).toContain('VIP Platinum Mom Professional');
            expect(notificationCall[2]).toBe(79.99); // VIP plan amount
        });

        it('should create notification with correct plan details for annual_platinum', async () => {
            // Arrange
            const seekerId = 'annual-seeker';
            const membershipPlan = 'annual_platinum';
            const subscriptionId = 'sub-annual';
            const transactionId = 'annual-txn';

            (db.userProfile.findUnique as jest.Mock).mockResolvedValue({
                id: seekerId,
                email: 'annual@test.com',
            });
            (db.jobSeeker.update as jest.Mock).mockResolvedValue({});
            (db.subscription.update as jest.Mock).mockResolvedValue({});
            (db.externalPayment.create as jest.Mock).mockResolvedValue({});

            // Act
            await RecurringBillingService['renewMembership'](
                seekerId,
                membershipPlan,
                subscriptionId,
                transactionId
            );

            // Assert
            const notificationCall = (inAppNotificationService.notifySeekerSubscriptionRenewal as jest.Mock)
                .mock.calls[0];
            expect(notificationCall[1]).toContain('Annual Platinum Mom Professional');
            expect(notificationCall[2]).toBe(299.0); // Annual plan amount
        });

        it('should create notification with next billing date', async () => {
            // Arrange
            const seekerId = 'txn-seeker';
            const membershipPlan = 'gold_bimonthly';
            const subscriptionId = 'sub-txn';
            const transactionId = 'RENEWAL-121525-abc1';

            (db.userProfile.findUnique as jest.Mock).mockResolvedValue({
                id: seekerId,
                email: 'txn@test.com',
            });
            (db.jobSeeker.update as jest.Mock).mockResolvedValue({});
            (db.subscription.update as jest.Mock).mockResolvedValue({});
            (db.externalPayment.create as jest.Mock).mockResolvedValue({});

            // Act
            await RecurringBillingService['renewMembership'](
                seekerId,
                membershipPlan,
                subscriptionId,
                transactionId
            );

            // Assert - Verify next billing date is passed to notification
            const notificationCall = (inAppNotificationService.notifySeekerSubscriptionRenewal as jest.Mock)
                .mock.calls[0];
            const nextBillingDate = notificationCall[3] as Date;
            expect(nextBillingDate).toBeInstanceOf(Date);
            expect(nextBillingDate.getTime()).toBeGreaterThan(Date.now());
        });

        it('should pass plan name to notification', async () => {
            // Arrange
            const seekerId = 'plan-seeker';
            const membershipPlan = 'vip_quarterly';
            const subscriptionId = 'sub-plan';
            const transactionId = 'plan-txn';

            (db.userProfile.findUnique as jest.Mock).mockResolvedValue({
                id: seekerId,
                email: 'plan@test.com',
            });
            (db.jobSeeker.update as jest.Mock).mockResolvedValue({});
            (db.subscription.update as jest.Mock).mockResolvedValue({});
            (db.externalPayment.create as jest.Mock).mockResolvedValue({});

            // Act
            await RecurringBillingService['renewMembership'](
                seekerId,
                membershipPlan,
                subscriptionId,
                transactionId
            );

            // Assert
            const notificationCall = (inAppNotificationService.notifySeekerSubscriptionRenewal as jest.Mock)
                .mock.calls[0];
            expect(notificationCall[1]).toBe('VIP Platinum Mom Professional');
        });

        it('should update membership expiration correctly for gold_bimonthly (60 days)', async () => {
            // Arrange
            const seekerId = 'expiry-seeker';
            const membershipPlan = 'gold_bimonthly';
            const subscriptionId = 'sub-expiry';
            const transactionId = 'expiry-txn';

            const beforeUpdate = new Date();
            (db.userProfile.findUnique as jest.Mock).mockResolvedValue({
                id: seekerId,
                email: 'expiry@test.com',
            });
            (db.jobSeeker.update as jest.Mock).mockResolvedValue({});
            (db.subscription.update as jest.Mock).mockResolvedValue({});
            (db.externalPayment.create as jest.Mock).mockResolvedValue({});

            // Act
            await RecurringBillingService['renewMembership'](
                seekerId,
                membershipPlan,
                subscriptionId,
                transactionId
            );

            // Assert - Check that jobSeeker.update was called with expiration date ~60 days from now
            const seekerUpdateCall = (db.jobSeeker.update as jest.Mock).mock.calls[0];
            const updatedExpirationDate = seekerUpdateCall[0].data.membershipExpiresAt;
            const daysDifference = Math.floor(
                (updatedExpirationDate - beforeUpdate) / (1000 * 60 * 60 * 24)
            );
            // Gold plan is 2 months, which is approximately 60 days (58-62 depending on months)
            expect(daysDifference).toBeGreaterThanOrEqual(58);
            expect(daysDifference).toBeLessThanOrEqual(63);
        });

        it('should update membership expiration correctly for annual_platinum (365 days)', async () => {
            // Arrange
            const seekerId = 'annual-expiry-seeker';
            const membershipPlan = 'annual_platinum';
            const subscriptionId = 'sub-annual-expiry';
            const transactionId = 'annual-expiry-txn';

            const beforeUpdate = new Date();
            (db.userProfile.findUnique as jest.Mock).mockResolvedValue({
                id: seekerId,
                email: 'annual-expiry@test.com',
            });
            (db.jobSeeker.update as jest.Mock).mockResolvedValue({});
            (db.subscription.update as jest.Mock).mockResolvedValue({});
            (db.externalPayment.create as jest.Mock).mockResolvedValue({});

            // Act
            await RecurringBillingService['renewMembership'](
                seekerId,
                membershipPlan,
                subscriptionId,
                transactionId
            );

            // Assert - Check that jobSeeker.update was called with expiration date ~365 days from now
            const seekerUpdateCall = (db.jobSeeker.update as jest.Mock).mock.calls[0];
            const updatedExpirationDate = seekerUpdateCall[0].data.membershipExpiresAt;
            const daysDifference = Math.floor(
                (updatedExpirationDate - beforeUpdate) / (1000 * 60 * 60 * 24)
            );
            expect(daysDifference).toBe(365);
        });

        it('should record payment for renewal', async () => {
            // Arrange
            const seekerId = 'payment-seeker';
            const membershipPlan = 'gold_bimonthly';
            const subscriptionId = 'sub-payment';
            const transactionId = 'payment-txn';

            (db.userProfile.findUnique as jest.Mock).mockResolvedValue({
                id: seekerId,
                email: 'payment@test.com',
            });
            (db.jobSeeker.update as jest.Mock).mockResolvedValue({});
            (db.subscription.update as jest.Mock).mockResolvedValue({});
            (db.externalPayment.create as jest.Mock).mockResolvedValue({});

            // Act
            await RecurringBillingService['renewMembership'](
                seekerId,
                membershipPlan,
                subscriptionId,
                transactionId
            );

            // Assert - Verify externalPayment.create was called
            expect(db.externalPayment.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        userId: seekerId,
                        authnetTransactionId: transactionId,
                        amount: 49.99,
                        planId: 'gold',
                        status: 'completed',
                    }),
                })
            );
        });

        it('should update subscription status to active after renewal', async () => {
            // Arrange
            const seekerId = 'status-seeker';
            const membershipPlan = 'vip_quarterly';
            const subscriptionId = 'sub-status';
            const transactionId = 'status-txn';

            (db.userProfile.findUnique as jest.Mock).mockResolvedValue({
                id: seekerId,
                email: 'status@test.com',
            });
            (db.jobSeeker.update as jest.Mock).mockResolvedValue({});
            (db.subscription.update as jest.Mock).mockResolvedValue({});
            (db.externalPayment.create as jest.Mock).mockResolvedValue({});

            // Act
            await RecurringBillingService['renewMembership'](
                seekerId,
                membershipPlan,
                subscriptionId,
                transactionId
            );

            // Assert
            expect(db.subscription.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: subscriptionId },
                    data: expect.objectContaining({
                        status: 'active',
                    }),
                })
            );
        });

        it('should handle all four subscription plan types', async () => {
            // Arrange
            const testPlans = [
                { plan: 'trial_monthly', amount: 34.99, planId: 'trial', planName: '3 Day Free Trial Subscription' },
                { plan: 'gold_bimonthly', amount: 49.99, planId: 'gold', planName: 'Gold Mom Professional' },
                { plan: 'vip_quarterly', amount: 79.99, planId: 'vip-platinum', planName: 'VIP Platinum Mom Professional' },
                { plan: 'annual_platinum', amount: 299.0, planId: 'annual-platinum', planName: 'Annual Platinum Mom Professional' },
            ];

            for (const { plan, amount, planId, planName } of testPlans) {
                jest.clearAllMocks();

                (db.userProfile.findUnique as jest.Mock).mockResolvedValue({
                    id: `seeker-${plan}`,
                    email: `${plan}@test.com`,
                });
                (db.jobSeeker.update as jest.Mock).mockResolvedValue({});
                (db.subscription.update as jest.Mock).mockResolvedValue({});
                (db.externalPayment.create as jest.Mock).mockResolvedValue({});

                // Act
                await RecurringBillingService['renewMembership'](
                    `seeker-${plan}`,
                    plan,
                    `sub-${plan}`,
                    `txn-${plan}`
                );

                // Assert - Verify notification called with correct plan details
                expect(inAppNotificationService.notifySeekerSubscriptionRenewal).toHaveBeenCalledWith(
                    `seeker-${plan}`,
                    planName,
                    amount,
                    expect.any(Date)
                );

                // Verify payment recorded
                expect(db.externalPayment.create).toHaveBeenCalledWith(
                    expect.objectContaining({
                        data: expect.objectContaining({
                            amount: amount,
                            planId: planId,
                        }),
                    })
                );
            }
        });
    });

    describe('convertTrialToPaid - Notification on Trial Conversion', () => {
        it('should trigger renewal notification on successful trial conversion', async () => {
            // Arrange
            const seekerId = 'trial-seeker';
            const membershipPlan = 'gold_bimonthly';
            const subscriptionId = 'sub-trial';
            const transactionId = 'trial-txn';

            (db.userProfile.findUnique as jest.Mock).mockResolvedValue({
                id: seekerId,
                email: 'trial@example.com',
            });
            (db.jobSeeker.update as jest.Mock).mockResolvedValue({});
            (db.subscription.update as jest.Mock).mockResolvedValue({});
            (db.externalPayment.create as jest.Mock).mockResolvedValue({});

            // Act
            await RecurringBillingService['convertTrialToPaid'](
                seekerId,
                membershipPlan,
                subscriptionId,
                transactionId
            );

            // Assert - Should trigger subscription renewal notification
            expect(inAppNotificationService.notifySeekerSubscriptionRenewal).toHaveBeenCalledWith(
                seekerId,
                'Gold Mom Professional',
                49.99,
                expect.any(Date)
            );

            // Verify payment was recorded
            expect(db.externalPayment.create).toHaveBeenCalled();
        });
    });

    describe('reactivatePastDueSubscription - Notification on Reactivation', () => {
        it('should trigger renewal notification on successful reactivation', async () => {
            // Arrange
            const seekerId = 'pastdue-seeker';
            const membershipPlan = 'vip_quarterly';
            const subscriptionId = 'sub-pastdue';
            const transactionId = 'pastdue-txn';

            (db.userProfile.findUnique as jest.Mock).mockResolvedValue({
                id: seekerId,
                email: 'pastdue@example.com',
            });
            (db.jobSeeker.update as jest.Mock).mockResolvedValue({});
            (db.subscription.update as jest.Mock).mockResolvedValue({});
            (db.externalPayment.create as jest.Mock).mockResolvedValue({});

            // Act
            await RecurringBillingService['reactivatePastDueSubscription'](
                seekerId,
                membershipPlan,
                subscriptionId,
                transactionId
            );

            // Assert - Should trigger subscription renewal notification
            expect(inAppNotificationService.notifySeekerSubscriptionRenewal).toHaveBeenCalledWith(
                seekerId,
                'VIP Platinum Mom Professional',
                79.99,
                expect.any(Date)
            );

            // Verify payment was recorded
            expect(db.externalPayment.create).toHaveBeenCalled();
        });
    });
});
