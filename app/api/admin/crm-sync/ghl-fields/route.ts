import { NextRequest, NextResponse } from 'next/server'
import { checkSuperAdminAuth } from '@/lib/crm-sync-auth'
import { db } from '@/lib/db'
import { createGHLService } from '@/lib/ghl-sync-service'

/**
 * GET /api/admin/crm-sync/ghl-fields
 * Fetch cached GHL custom fields
 * Super admin only
 */
export async function GET(req: NextRequest) {
    try {
        // Check authentication
        const authResult = await checkSuperAdminAuth()
        if ('error' in authResult) {
            return authResult.error
        }

        // Fetch cached GHL fields from database
        const ghlFields = await db.ghlField.findMany({
            orderBy: [
                { isSystemField: 'desc' }, // System fields first
                { name: 'asc' }
            ]
        })

        // Group by field type (system vs custom) for UI grouping
        const groupedByType = {
            'System Fields': ghlFields.filter(f => f.isSystemField),
            'Custom Fields': ghlFields.filter(f => !f.isSystemField)
        }

        return NextResponse.json({
            fields: ghlFields,
            groupedByType,
            count: ghlFields.length,
            systemFieldsCount: ghlFields.filter(f => f.isSystemField).length,
            customFieldsCount: ghlFields.filter(f => !f.isSystemField).length,
            lastRefreshedAt: ghlFields[0]?.lastSyncedAt || null
        })

    } catch (error: any) {
        console.error('Failed to fetch GHL fields:', error)

        return NextResponse.json(
            { error: 'Failed to fetch GHL fields' },
            { status: 500 }
        )
    }
}
