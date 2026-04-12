import { NextRequest, NextResponse } from 'next/server'
import { checkSuperAdminAuth, getSuperAdminName } from '@/lib/crm-sync-auth'
import { db } from '@/lib/db'

/**
 * GET /api/admin/crm-sync/settings
 * Fetch current CRM Sync settings
 */
export async function GET(req: NextRequest) {
    try {
        // Check authentication
        const authResult = await checkSuperAdminAuth()
        if ('error' in authResult) {
            return authResult.error
        }

        const { clerkUserId } = authResult

        // Get or create settings (should be single row)
        let settings = await db.crmSyncSettings.findFirst()

        if (!settings) {
            // Create default settings if none exist
            const userProfile = await db.userProfile.findUnique({
                where: { clerkUserId }
            })

            settings = await db.crmSyncSettings.create({
                data: {
                    isGlobalSyncEnabled: false,
                    defaultSyncDirection: 'app_to_ghl',
                    syncOnCreate: true,
                    syncOnUpdate: true,
                    syncBatchSize: 50,
                    retryAttempts: 3,
                    lastUpdatedBy: userProfile?.id || clerkUserId
                }
            })
        }

        return NextResponse.json({ settings })
    } catch (error) {
        console.error('Error fetching CRM Sync settings:', error)
        return NextResponse.json(
            { error: 'Failed to fetch settings' },
            { status: 500 }
        )
    }
}

/**
 * PUT /api/admin/crm-sync/settings
 * Update CRM Sync settings
 */
export async function PUT(request: Request) {
    try {
        // Check authentication
        const authResult = await checkSuperAdminAuth()
        if ('error' in authResult) {
            return authResult.error
        }

        const { user, clerkUserId } = authResult

        const body = await request.json()
        const {
            isGlobalSyncEnabled,
            defaultSyncDirection,
            syncOnCreate,
            syncOnUpdate,
            syncBatchSize,
            retryAttempts
        } = body

        // Validation
        if (syncBatchSize < 1 || syncBatchSize > 100) {
            return NextResponse.json(
                { error: 'Batch size must be between 1 and 100' },
                { status: 400 }
            )
        }

        if (retryAttempts < 0 || retryAttempts > 10) {
            return NextResponse.json(
                { error: 'Retry attempts must be between 0 and 10' },
                { status: 400 }
            )
        }

        if (!['app_to_ghl', 'ghl_to_app', 'two_way'].includes(defaultSyncDirection)) {
            return NextResponse.json(
                { error: 'Invalid sync direction' },
                { status: 400 }
            )
        }

        // Get super admin profile for change log
        const userProfile = await db.userProfile.findUnique({
            where: { clerkUserId }
        })

        // Get current settings for change log
        const currentSettings = await db.crmSyncSettings.findFirst()

        // Update or create settings
        let settings
        if (currentSettings) {
            settings = await db.crmSyncSettings.update({
                where: { id: currentSettings.id },
                data: {
                    isGlobalSyncEnabled,
                    defaultSyncDirection,
                    syncOnCreate,
                    syncOnUpdate,
                    syncBatchSize,
                    retryAttempts,
                    lastUpdatedBy: userProfile?.id || clerkUserId
                }
            })
        } else {
            settings = await db.crmSyncSettings.create({
                data: {
                    isGlobalSyncEnabled,
                    defaultSyncDirection,
                    syncOnCreate,
                    syncOnUpdate,
                    syncBatchSize,
                    retryAttempts,
                    lastUpdatedBy: userProfile?.id || clerkUserId
                }
            })
        }

        // Log the change
        await db.crmSyncChangeLog.create({
            data: {
                superAdminId: userProfile?.id || clerkUserId,
                superAdminName: getSuperAdminName(user),
                actionType: 'settings_updated',
                actionDetails: {
                    message: 'Updated CRM Sync global settings',
                    changes: {
                        isGlobalSyncEnabled: {
                            old: currentSettings?.isGlobalSyncEnabled,
                            new: isGlobalSyncEnabled
                        },
                        defaultSyncDirection: {
                            old: currentSettings?.defaultSyncDirection,
                            new: defaultSyncDirection
                        }
                    }
                },
                entityType: 'CrmSyncSettings',
                entityId: settings.id,
                oldValue: currentSettings || {},
                newValue: settings
            }
        })

        return NextResponse.json({ settings })
    } catch (error) {
        console.error('Error updating CRM Sync settings:', error)
        return NextResponse.json(
            { error: 'Failed to update settings' },
            { status: 500 }
        )
    }
}

