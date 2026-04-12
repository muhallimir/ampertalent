import { NextRequest, NextResponse } from 'next/server'
import { checkSuperAdminAuth, getSuperAdminName } from '@/lib/crm-sync-auth'
import { db } from '@/lib/db'
import { AutoGenerationService } from '@/lib/auto-generation-service'

/**
 * POST /api/admin/crm-sync/auto-generate
 * Auto-generate Phase 2 field mappings with system group
 * Super admin only
 */
export async function POST(req: NextRequest) {
    try {
        console.log('\n[API] POST /api/admin/crm-sync/auto-generate')

        // Check authentication
        const authResult = await checkSuperAdminAuth()
        if ('error' in authResult) {
            console.error('[API] ❌ Authentication failed')
            return authResult.error
        }

        const { user, clerkUserId } = authResult
        console.log(`[API] ✓ Authenticated as: ${user.email}`)

        // Get CRM sync settings for GHL credentials
        const settings = await db.crmSyncSettings.findFirst()

        if (!settings) {
            console.error('[API] ❌ CRM Sync settings not configured')
            return NextResponse.json(
                { error: 'CRM Sync settings not configured' },
                { status: 400 }
            )
        }

        if (!settings.ghlApiKey || !settings.ghlLocationId) {
            console.error('[API] ❌ GHL API credentials not configured')
            return NextResponse.json(
                { error: 'GHL API credentials not configured' },
                { status: 400 }
            )
        }

        console.log('[API] ✓ GHL credentials found')

        // Initialize auto-generation service
        const autoGenService = new AutoGenerationService(
            settings.ghlApiKey,
            settings.ghlLocationId
        )

        // Execute auto-generation
        console.log('[API] 🚀 Starting auto-generation service...')
        const result = await autoGenService.autoGenerateMappings(clerkUserId)

        if (!result.success) {
            console.error(`[API] ❌ Auto-generation failed: ${result.message}`)
            return NextResponse.json(
                {
                    success: false,
                    message: result.message,
                    errors: result.errors
                },
                { status: 400 }
            )
        }

        console.log(`[API] ✓ Auto-generation succeeded: ${result.mappingsCreated} created, ${result.mappingsSkipped} skipped`)

        // Log the admin who ran this
        console.log(`[API] ✓    Admin tracking: ${getSuperAdminName(user)}`)
        console.log(`[API] ✅ Response sent to client (group: "${result.groupName}")`)

        return NextResponse.json({
            success: true,
            message: result.message,
            groupId: result.groupId,
            groupName: result.groupName,
            mappingsCreated: result.mappingsCreated,
            mappingsSkipped: result.mappingsSkipped,
            mappingsTotal: result.mappingsTotal,
            details: result.details
        })

    } catch (error: any) {
        console.error(`[API] ❌ Unexpected error: ${error.message}`)
        console.error('Auto-generation endpoint error:', error)

        return NextResponse.json(
            { error: 'Auto-generation failed', details: error.message },
            { status: 500 }
        )
    }
}
