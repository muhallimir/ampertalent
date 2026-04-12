import { NextRequest, NextResponse } from 'next/server'
import { checkSuperAdminAuth } from '@/lib/crm-sync-auth'
import { db } from '@/lib/db'

/**
 * GET /api/admin/crm-sync/change-log/admins
 * Fetch list of super admins who made CRM sync changes (for filtering)
 * Super admin only
 */
export async function GET(req: NextRequest) {
    try {
        // Check authentication
        const authResult = await checkSuperAdminAuth()
        if ('error' in authResult) {
            return authResult.error
        }

        // Get distinct super admin IDs from change logs
        const changeLogs = await db.crmSyncChangeLog.findMany({
            select: {
                superAdminId: true,
                superAdminName: true
            },
            distinct: ['superAdminId']
        })

        // Create unique list of admins
        const adminsMap = new Map<string, { id: string; name: string }>()

        for (const log of changeLogs) {
            if (log.superAdminId && !adminsMap.has(log.superAdminId)) {
                adminsMap.set(log.superAdminId, {
                    id: log.superAdminId,
                    name: log.superAdminName || 'Unknown Admin'
                })
            }
        }

        const admins = Array.from(adminsMap.values()).sort((a, b) =>
            a.name.localeCompare(b.name)
        )

        return NextResponse.json({ admins })

    } catch (error: any) {
        console.error('Failed to fetch admin list:', error)

        return NextResponse.json(
            { error: 'Failed to fetch admin list' },
            { status: 500 }
        )
    }
}
