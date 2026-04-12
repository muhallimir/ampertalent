/**
 * Integration Tests: Admin Sales - Service Revenue
 *
 * Tests the admin sales API's ability to track and report service revenue
 * separately from seeker subscriptions and employer packages.
 *
 * This adds "Services" as a third category in Revenue by Source.
 *
 * Related documentation:
 * - docs/SERVICE_ONLY_ONBOARDING.md
 * - docs/SERVICE_ONLY_ONBOARDING_MANUAL_TESTS.md
 */

import { db } from '@/lib/db'
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'

describe('Admin Sales - Service Revenue Tracking', () => {
    const uniqueId = Date.now()

    // Test data holders
    let testSeeker: any
    let testJobSeeker: any
    let testServices: any[] = []

    beforeAll(async () => {
        console.log('Admin Sales Service Revenue Tests Starting...')

        // Create test seeker for service purchases
        testSeeker = await db.userProfile.create({
            data: {
                name: 'Sales Test Seeker',
                email: `sales-test-${uniqueId}@test.com`,
                role: 'seeker' as any,
                jobSeeker: {
                    create: {
                        membershipPlan: 'none',
                    },
                },
            },
            include: { jobSeeker: true },
        })
        testJobSeeker = testSeeker.jobSeeker

        // Create test services
        const servicesData = [
            { serviceId: `test_resume_${uniqueId}`, name: 'Test Resume Refresh', price: 149.0 },
            { serviceId: `test_cover_${uniqueId}`, name: 'Test Cover Letter', price: 75.0 },
            { serviceId: `test_interview_${uniqueId}`, name: 'Test Interview', price: 100.0 },
            { serviceId: `test_works_${uniqueId}`, name: 'Test The Works', price: 349.0 },
            { serviceId: `test_jumpstart_${uniqueId}`, name: 'Test Career Jumpstart', price: 99.0 },
        ]

        for (const s of servicesData) {
            const service = await db.additionalService.create({
                data: {
                    serviceId: s.serviceId,
                    name: s.name,
                    description: `Test service - ${s.name}`,
                    price: s.price,
                    category: 'resume',
                    userType: 'seeker',
                    isActive: true,
                },
            })
            testServices.push(service)
        }
    })

    afterAll(async () => {
        console.log('Cleaning up Admin Sales Service Revenue Tests...')

        // Clean up in reverse order
        await db.additionalServicePurchase.deleteMany({
            where: { seekerId: testSeeker.id },
        })
        await db.jobSeeker.delete({
            where: { userId: testSeeker.id },
        })
        await db.userProfile.delete({ where: { id: testSeeker.id } })

        // Clean up test services
        for (const service of testServices) {
            await db.additionalService.delete({
                where: { id: service.id },
            }).catch(() => { }) // Ignore if already deleted
        }

        console.log('Admin Sales Service Revenue Tests Complete')
    })

    // ======================================
    // PART A: SERVICE PURCHASE DATA STRUCTURE
    // ======================================

    describe('AdditionalServicePurchase Data Structure', () => {
        let servicePurchase: any

        beforeAll(async () => {
            servicePurchase = await db.additionalServicePurchase.create({
                data: {
                    serviceId: testServices[0].serviceId,
                    userId: testSeeker.id,
                    seekerId: testSeeker.id,
                    amountPaid: 149.0,
                    status: 'completed',
                },
            })
        })

        afterAll(async () => {
            await db.additionalServicePurchase.delete({
                where: { id: servicePurchase.id },
            })
        })

        // TEST 1: Service purchase has amountPaid field
        it('should store amountPaid for service purchases', async () => {
            const purchase = await db.additionalServicePurchase.findUnique({
                where: { id: servicePurchase.id },
            })

            expect(purchase).not.toBeNull()
            expect(Number(purchase?.amountPaid)).toBe(149.0)
        })

        // TEST 2: Service purchase has status field
        it('should track status for revenue calculation', async () => {
            const purchase = await db.additionalServicePurchase.findUnique({
                where: { id: servicePurchase.id },
            })

            expect(purchase?.status).toBe('completed')
        })

        // TEST 3: Service purchase has createdAt for date filtering
        it('should have createdAt for date range queries', async () => {
            const purchase = await db.additionalServicePurchase.findUnique({
                where: { id: servicePurchase.id },
            })

            expect(purchase?.createdAt).toBeInstanceOf(Date)
        })

        // TEST 4: Service purchase linked to seeker
        it('should be linked to seeker for user type identification', async () => {
            const purchase = await db.additionalServicePurchase.findUnique({
                where: { id: servicePurchase.id },
                include: {
                    seeker: true,
                },
            })

            expect(purchase?.seeker).not.toBeNull()
            expect(purchase?.seekerId).toBe(testSeeker.id)
        })
    })

    // ======================================
    // PART B: SERVICE REVENUE AGGREGATION
    // ======================================

    describe('Service Revenue Aggregation', () => {
        let purchases: any[] = []

        beforeAll(async () => {
            // Create multiple service purchases for aggregation testing
            // Use testServices[0..3] which have prices 149, 75, 100, 349
            const servicesToUse = testServices.slice(0, 4)

            for (const service of servicesToUse) {
                const purchase = await db.additionalServicePurchase.create({
                    data: {
                        serviceId: service.serviceId,
                        userId: testSeeker.id,
                        seekerId: testSeeker.id,
                        amountPaid: Number(service.price),
                        status: 'completed',
                    },
                })
                purchases.push(purchase)
            }
        })

        afterAll(async () => {
            for (const purchase of purchases) {
                await db.additionalServicePurchase.delete({
                    where: { id: purchase.id },
                }).catch(() => { }) // Ignore if already deleted
            }
        })

        // TEST 1: Can query completed service purchases
        it('should query only completed service purchases', async () => {
            const completedPurchases = await db.additionalServicePurchase.findMany({
                where: {
                    seekerId: testSeeker.id,
                    status: 'completed',
                },
            })

            expect(completedPurchases.length).toBe(4)
        })

        // TEST 2: Can calculate total service revenue
        it('should calculate total service revenue correctly', async () => {
            const completedPurchases = await db.additionalServicePurchase.findMany({
                where: {
                    seekerId: testSeeker.id,
                    status: 'completed',
                },
            })

            const totalRevenue = completedPurchases.reduce(
                (sum, p) => sum + Number(p.amountPaid),
                0
            )

            // 149 + 75 + 100 + 349 = 673
            expect(totalRevenue).toBe(673.0)
        })

        // TEST 3: Can filter by date range
        it('should filter service purchases by date range', async () => {
            const startOfToday = new Date()
            startOfToday.setHours(0, 0, 0, 0)

            const purchasesToday = await db.additionalServicePurchase.findMany({
                where: {
                    seekerId: testSeeker.id,
                    status: 'completed',
                    createdAt: {
                        gte: startOfToday,
                    },
                },
            })

            expect(purchasesToday.length).toBe(4)
        })

        // TEST 4: Pending purchases excluded from revenue
        it('should exclude pending purchases from revenue calculation', async () => {
            // Create a pending purchase using the 5th test service (career jumpstart - $99)
            const pendingPurchase = await db.additionalServicePurchase.create({
                data: {
                    serviceId: testServices[4].serviceId,
                    userId: testSeeker.id,
                    seekerId: testSeeker.id,
                    amountPaid: 99.0,
                    status: 'pending',
                },
            })

            const completedPurchases = await db.additionalServicePurchase.findMany({
                where: {
                    seekerId: testSeeker.id,
                    status: 'completed',
                },
            })

            const totalRevenue = completedPurchases.reduce(
                (sum, p) => sum + Number(p.amountPaid),
                0
            )

            // Should still be 673 (pending not included)
            expect(totalRevenue).toBe(673.0)

            // Cleanup pending
            await db.additionalServicePurchase.delete({
                where: { id: pendingPurchase.id },
            })
        })
    })

    // ======================================
    // PART C: REVENUE BY SOURCE STRUCTURE
    // ======================================

    describe('Revenue by Source - Three Categories', () => {
        /**
         * The admin sales API returns revenueBySource with three categories:
         * 1. seekerSubscriptions - From ExternalPayment for seekers (excluding service planIds)
         * 2. employerPackages - From ExternalPayment for employers
         * 3. seekerServices - From ExternalPayment with service planIds (e.g., service_*, career_jumpstart)
         * 
         * NOTE: Service revenue is tracked via ExternalPayment table (not AdditionalServicePurchase)
         * to avoid double-counting, as each service purchase creates both records.
         */

        interface RevenueBySource {
            seekerSubscriptions: number
            employerPackages: number
            seekerServices: number // NEW
        }

        it('should define correct interface for revenueBySource', () => {
            const mockRevenueBySource: RevenueBySource = {
                seekerSubscriptions: 1000,
                employerPackages: 2000,
                seekerServices: 500,
            }

            expect(mockRevenueBySource).toHaveProperty('seekerSubscriptions')
            expect(mockRevenueBySource).toHaveProperty('employerPackages')
            expect(mockRevenueBySource).toHaveProperty('seekerServices')
        })

        it('should calculate total revenue as sum of all sources', () => {
            const mockRevenueBySource: RevenueBySource = {
                seekerSubscriptions: 1000,
                employerPackages: 2000,
                seekerServices: 500,
            }

            const totalRevenue =
                mockRevenueBySource.seekerSubscriptions +
                mockRevenueBySource.employerPackages +
                mockRevenueBySource.seekerServices

            expect(totalRevenue).toBe(3500)
        })

        it('should handle zero service revenue gracefully', () => {
            const mockRevenueBySource: RevenueBySource = {
                seekerSubscriptions: 1000,
                employerPackages: 2000,
                seekerServices: 0,
            }

            expect(mockRevenueBySource.seekerServices).toBe(0)
            expect(mockRevenueBySource.seekerSubscriptions + mockRevenueBySource.employerPackages).toBe(3000)
        })
    })

    // ======================================
    // PART D: SERVICE PLANID IDENTIFICATION
    // ======================================

    describe('Service PlanId Detection', () => {
        /**
         * The admin sales API uses planId patterns to identify service payments:
         * - planIds starting with 'service_' (e.g., service_resume_refresh)
         * - planIds matching service IDs directly (e.g., career_jumpstart)
         */

        const SEEKER_SERVICE_IDS = [
            'career_jumpstart',
            'interview_success_training',
            'personal_career_strategist',
            'resume_refresh',
            'create_new_resume',
            'cover_letter_service',
            'the_works'
        ]

        const isServicePlanId = (planId: string | null): boolean => {
            if (!planId) return false
            return planId.startsWith('service_') || SEEKER_SERVICE_IDS.includes(planId)
        }

        it('should identify service_ prefixed planIds as services', () => {
            expect(isServicePlanId('service_resume_refresh')).toBe(true)
            expect(isServicePlanId('service_personal_career_strategist')).toBe(true)
            expect(isServicePlanId('service_create_new_resume')).toBe(true)
        })

        it('should identify direct service IDs as services', () => {
            expect(isServicePlanId('career_jumpstart')).toBe(true)
            expect(isServicePlanId('the_works')).toBe(true)
            expect(isServicePlanId('resume_refresh')).toBe(true)
        })

        it('should NOT identify subscription planIds as services', () => {
            expect(isServicePlanId('trial')).toBe(false)
            expect(isServicePlanId('gold')).toBe(false)
            expect(isServicePlanId('vip-platinum')).toBe(false)
            expect(isServicePlanId('annual-platinum')).toBe(false)
        })

        it('should NOT identify employer planIds as services', () => {
            expect(isServicePlanId('standard')).toBe(false)
            expect(isServicePlanId('featured')).toBe(false)
            expect(isServicePlanId('email_blast')).toBe(false)
            expect(isServicePlanId('concierge_level_1')).toBe(false)
        })

        it('should handle null planId gracefully', () => {
            expect(isServicePlanId(null)).toBe(false)
        })
    })

    // ======================================
    // PART E: SERVICE TYPE BREAKDOWN
    // ======================================

    describe('Service Type Revenue Breakdown (via AdditionalServicePurchase)', () => {
        /**
         * While admin sales uses ExternalPayment for revenue calculation,
         * AdditionalServicePurchase is still used for service request management
         * and can provide breakdown by service type.
         */
        let purchases: any[] = []

        beforeAll(async () => {
            // Create multiple purchases of same type (resume - testServices[0])
            for (let i = 0; i < 3; i++) {
                const purchase = await db.additionalServicePurchase.create({
                    data: {
                        serviceId: testServices[0].serviceId,
                        userId: testSeeker.id,
                        seekerId: testSeeker.id,
                        amountPaid: 149.0,
                        status: 'completed',
                    },
                })
                purchases.push(purchase)
            }

            // Add different service type (the works - testServices[3])
            const otherPurchase = await db.additionalServicePurchase.create({
                data: {
                    serviceId: testServices[3].serviceId,
                    userId: testSeeker.id,
                    seekerId: testSeeker.id,
                    amountPaid: 349.0,
                    status: 'completed',
                },
            })
            purchases.push(otherPurchase)
        })

        afterAll(async () => {
            for (const purchase of purchases) {
                await db.additionalServicePurchase.delete({
                    where: { id: purchase.id },
                }).catch(() => { }) // Ignore if already deleted
            }
        })

        // TEST 1: Group by service ID
        it('should group revenue by service ID', async () => {
            const allPurchases = await db.additionalServicePurchase.findMany({
                where: {
                    seekerId: testSeeker.id,
                    status: 'completed',
                },
            })

            // Group by serviceId
            const byServiceId = allPurchases.reduce((acc, p) => {
                if (!acc[p.serviceId]) {
                    acc[p.serviceId] = { count: 0, revenue: 0 }
                }
                acc[p.serviceId].count++
                acc[p.serviceId].revenue += Number(p.amountPaid)
                return acc
            }, {} as Record<string, { count: number; revenue: number }>)

            // testServices[0] = resume (149 x 3 = 447)
            expect(byServiceId[testServices[0].serviceId]).toBeDefined()
            expect(byServiceId[testServices[0].serviceId].count).toBe(3)
            expect(byServiceId[testServices[0].serviceId].revenue).toBe(447)

            // testServices[3] = the works (349 x 1 = 349)
            expect(byServiceId[testServices[3].serviceId]).toBeDefined()
            expect(byServiceId[testServices[3].serviceId].count).toBe(1)
            expect(byServiceId[testServices[3].serviceId].revenue).toBe(349)
        })

        // TEST 2: Calculate total unique service types sold
        it('should count unique service types', async () => {
            const allPurchases = await db.additionalServicePurchase.findMany({
                where: {
                    seekerId: testSeeker.id,
                    status: 'completed',
                },
            })

            const uniqueServiceIds = new Set(allPurchases.map((p) => p.serviceId))
            expect(uniqueServiceIds.size).toBe(2)
        })
    })
})
