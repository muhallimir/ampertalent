/**
 * CRM Sync - ChangeLog Tab Integration Tests
 * 
 * Tests all ChangeLog filters, pagination, and data formatting
 */

import { db } from '@/lib/db'
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'

describe('CRM Sync - ChangeLog Tab', () => {
    const testData = {
        changeLogIds: [] as string[],
        admin1Id: 'test-admin-1-' + Date.now(),
        admin2Id: 'test-admin-2-' + Date.now()
    }

    // Cleanup function to delete only test-created data
    afterAll(async () => {
        console.log('\n🧹 Cleaning up ChangeLog test data...')

        if (testData.changeLogIds.length > 0) {
            await db.crmSyncChangeLog.deleteMany({
                where: { id: { in: testData.changeLogIds } }
            })
            console.log(`✓ Deleted ${testData.changeLogIds.length} change log entries`)
        }
    })

    describe('ChangeLog Entry Creation', () => {
        it('creates test change log entries with different action types', async () => {
            const actionTypes = [
                'CREATE_MAPPING',
                'UPDATE_MAPPING',
                'DELETE_MAPPING',
                'REFRESH_APP_FIELDS',
                'REFRESH_GHL_FIELDS',
                'CREATE_GROUP',
                'UPDATE_SETTINGS'
            ]

            for (const actionType of actionTypes) {
                const entry = await db.crmSyncChangeLog.create({
                    data: {
                        superAdminId: testData.admin1Id,
                        superAdminName: 'Test Admin 1',
                        actionType,
                        actionDetails: {
                            testData: true,
                            actionType
                        },
                        entityType: 'Test',
                        entityId: null
                    }
                })

                testData.changeLogIds.push(entry.id)
            }

            // Create entries for second admin
            const entry2 = await db.crmSyncChangeLog.create({
                data: {
                    superAdminId: testData.admin2Id,
                    superAdminName: 'Test Admin 2',
                    actionType: 'CREATE_MAPPING',
                    actionDetails: {
                        testData: true
                    },
                    entityType: 'Test',
                    entityId: null
                }
            })

            testData.changeLogIds.push(entry2.id)

            expect(testData.changeLogIds.length).toBe(8)
            console.log('✓ Created test change log entries')
        })
    })

    describe('Filter by Admin', () => {
        it('filters change logs by superAdminId', async () => {
            const logs = await db.crmSyncChangeLog.findMany({
                where: {
                    id: { in: testData.changeLogIds },
                    superAdminId: testData.admin1Id
                }
            })

            expect(logs.length).toBe(7) // Admin 1 has 7 entries
            logs.forEach(log => {
                expect(log.superAdminId).toBe(testData.admin1Id)
            })

            console.log('✓ Admin filter working correctly')
        })

        it('returns all admins who made changes', async () => {
            const distinctAdmins = await db.crmSyncChangeLog.findMany({
                where: {
                    id: { in: testData.changeLogIds }
                },
                select: {
                    superAdminId: true,
                    superAdminName: true
                },
                distinct: ['superAdminId']
            })

            expect(distinctAdmins.length).toBe(2)
            const adminIds = distinctAdmins.map(a => a.superAdminId)
            expect(adminIds).toContain(testData.admin1Id)
            expect(adminIds).toContain(testData.admin2Id)

            console.log('✓ Distinct admins list correct')
        })
    })

    describe('Filter by Action Type', () => {
        it('filters by single action type', async () => {
            const logs = await db.crmSyncChangeLog.findMany({
                where: {
                    id: { in: testData.changeLogIds },
                    actionType: 'CREATE_MAPPING'
                }
            })

            expect(logs.length).toBe(2) // Both admins created mappings
            logs.forEach(log => {
                expect(log.actionType).toBe('CREATE_MAPPING')
            })

            console.log('✓ Single action type filter working')
        })

        it('filters by multiple action types', async () => {
            const logs = await db.crmSyncChangeLog.findMany({
                where: {
                    id: { in: testData.changeLogIds },
                    actionType: {
                        in: ['CREATE_MAPPING', 'UPDATE_MAPPING', 'DELETE_MAPPING']
                    }
                }
            })

            expect(logs.length).toBeGreaterThanOrEqual(3)
            logs.forEach(log => {
                expect(['CREATE_MAPPING', 'UPDATE_MAPPING', 'DELETE_MAPPING']).toContain(log.actionType)
            })

            console.log('✓ Multiple action types filter working')
        })

        it('filters REFRESH actions', async () => {
            const logs = await db.crmSyncChangeLog.findMany({
                where: {
                    id: { in: testData.changeLogIds },
                    actionType: {
                        in: ['REFRESH_APP_FIELDS', 'REFRESH_GHL_FIELDS']
                    }
                }
            })

            expect(logs.length).toBe(2)
            console.log('✓ Refresh actions filter working')
        })
    })

    describe('Filter by Date Range', () => {
        it('filters by start date', async () => {
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

            const logs = await db.crmSyncChangeLog.findMany({
                where: {
                    id: { in: testData.changeLogIds },
                    createdAt: {
                        gte: oneDayAgo
                    }
                }
            })

            expect(logs.length).toBe(8) // All test logs are recent
            console.log('✓ Start date filter working')
        })

        it('filters by end date', async () => {
            const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)

            const logs = await db.crmSyncChangeLog.findMany({
                where: {
                    id: { in: testData.changeLogIds },
                    createdAt: {
                        lte: tomorrow
                    }
                }
            })

            expect(logs.length).toBe(8) // All test logs are before tomorrow
            console.log('✓ End date filter working')
        })

        it('filters by date range', async () => {
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
            const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)

            const logs = await db.crmSyncChangeLog.findMany({
                where: {
                    id: { in: testData.changeLogIds },
                    createdAt: {
                        gte: oneDayAgo,
                        lte: tomorrow
                    }
                }
            })

            expect(logs.length).toBe(8)
            console.log('✓ Date range filter working')
        })
    })

    describe('Combined Filters', () => {
        it('combines admin and action type filters', async () => {
            const logs = await db.crmSyncChangeLog.findMany({
                where: {
                    id: { in: testData.changeLogIds },
                    superAdminId: testData.admin1Id,
                    actionType: {
                        in: ['CREATE_MAPPING', 'UPDATE_MAPPING']
                    }
                }
            })

            expect(logs.length).toBe(2) // Admin 1 has CREATE and UPDATE mapping
            logs.forEach(log => {
                expect(log.superAdminId).toBe(testData.admin1Id)
                expect(['CREATE_MAPPING', 'UPDATE_MAPPING']).toContain(log.actionType)
            })

            console.log('✓ Combined admin + action type filter working')
        })

        it('combines all filters', async () => {
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
            const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)

            const logs = await db.crmSyncChangeLog.findMany({
                where: {
                    id: { in: testData.changeLogIds },
                    superAdminId: testData.admin1Id,
                    actionType: 'CREATE_MAPPING',
                    createdAt: {
                        gte: oneDayAgo,
                        lte: tomorrow
                    }
                }
            })

            expect(logs.length).toBe(1)
            expect(logs[0].superAdminId).toBe(testData.admin1Id)
            expect(logs[0].actionType).toBe('CREATE_MAPPING')

            console.log('✓ All filters combined working')
        })
    })

    describe('Pagination', () => {
        it('paginates results correctly', async () => {
            const pageSize = 3
            const page1 = await db.crmSyncChangeLog.findMany({
                where: { id: { in: testData.changeLogIds } },
                orderBy: { createdAt: 'desc' },
                take: pageSize,
                skip: 0
            })

            const page2 = await db.crmSyncChangeLog.findMany({
                where: { id: { in: testData.changeLogIds } },
                orderBy: { createdAt: 'desc' },
                take: pageSize,
                skip: pageSize
            })

            expect(page1.length).toBe(3)
            expect(page2.length).toBe(3)

            // Ensure no overlap
            const page1Ids = page1.map(l => l.id)
            const page2Ids = page2.map(l => l.id)
            page1Ids.forEach(id => {
                expect(page2Ids).not.toContain(id)
            })

            console.log('✓ Pagination working correctly')
        })

        it('calculates total pages correctly', async () => {
            const totalCount = testData.changeLogIds.length
            const pageSize = 3
            const totalPages = Math.ceil(totalCount / pageSize)

            expect(totalPages).toBe(3) // 8 items / 3 per page = 3 pages

            console.log('✓ Total pages calculation correct')
        })
    })

    describe('ActionDetails Formatting', () => {
        it('stores actionDetails as JSON', async () => {
            const log = await db.crmSyncChangeLog.findFirst({
                where: {
                    id: { in: testData.changeLogIds },
                    actionType: 'REFRESH_APP_FIELDS'
                }
            })

            expect(log).toBeDefined()
            expect(log?.actionDetails).toBeDefined()
            expect(typeof log?.actionDetails).toBe('object')

            console.log('✓ ActionDetails stored as JSON')
        })

        it('can query actionDetails content', async () => {
            const log = await db.crmSyncChangeLog.findFirst({
                where: {
                    id: { in: testData.changeLogIds },
                    actionDetails: {
                        path: ['testData'],
                        equals: true
                    }
                }
            })

            expect(log).toBeDefined()
            console.log('✓ ActionDetails content queryable')
        })
    })

    describe('Sorting', () => {
        it('sorts by createdAt descending (newest first)', async () => {
            const logs = await db.crmSyncChangeLog.findMany({
                where: { id: { in: testData.changeLogIds } },
                orderBy: { createdAt: 'desc' }
            })

            expect(logs.length).toBeGreaterThan(1)

            // Check that each log is older than or equal to the previous
            for (let i = 1; i < logs.length; i++) {
                expect(logs[i].createdAt.getTime()).toBeLessThanOrEqual(
                    logs[i - 1].createdAt.getTime()
                )
            }

            console.log('✓ Sorting by createdAt DESC working')
        })
    })
})
