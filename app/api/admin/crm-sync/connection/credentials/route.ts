import { NextRequest, NextResponse } from 'next/server'
import { checkSuperAdminAuth, getSuperAdminName } from '@/lib/crm-sync-auth'
import { db } from '@/lib/db'

/**
 * GET /api/admin/crm-sync/connection/credentials
 * Fetch current GHL credentials (redacted API key)
 * Super admin only
 */
export async function GET(req: NextRequest) {
    try {
        // Check authentication
        const authResult = await checkSuperAdminAuth()
        if ('error' in authResult) {
            return authResult.error
        }

        // Fetch settings from database
        const settings = await db.crmSyncSettings.findFirst({
            include: {
                lastSavedByUser: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            }
        })

        if (!settings) {
            return NextResponse.json({
                credentials: {
                    ghlApiKey: '',
                    ghlLocationId: ''
                },
                connectionStatus: {
                    status: 'disconnected',
                    lastTested: null,
                    lastTestedBy: null,
                    lastSavedAt: null,
                    lastSavedByName: null
                }
            })
        }

        return NextResponse.json({
            credentials: {
                ghlApiKey: settings.ghlApiKey || '',
                ghlLocationId: settings.ghlLocationId || ''
            },
            connectionStatus: {
                status: settings.ghlConnectionStatus || 'disconnected',
                lastTested: settings.ghlLastTested?.toISOString() || null,
                lastTestedBy: settings.ghlLastTestedBy || null,
                lastSavedAt: settings.lastSavedAt?.toISOString() || null,
                lastSavedBy: settings.lastSavedBy || null,
                lastSavedByName: settings.lastSavedByUser?.name || (settings.lastSavedBy ? 'Unknown User' : null)
            }
        })

    } catch (error: any) {
        console.error('Failed to fetch credentials:', error)

        return NextResponse.json(
            { error: 'Failed to fetch credentials' },
            { status: 500 }
        )
    }
}

/**
 * PUT /api/admin/crm-sync/connection/credentials
 * Update GHL credentials
 * Super admin only
 */
export async function PUT(req: NextRequest) {
    try {
        // Check authentication
        const authResult = await checkSuperAdminAuth()
        if ('error' in authResult) {
            return authResult.error
        }

        const { user, clerkUserId } = authResult

        // Get credentials from request
        const body = await req.json()
        // Support both naming conventions: apiKey/locationId and ghlApiKey/ghlLocationId
        const apiKey = body.apiKey || body.ghlApiKey
        const locationId = body.locationId || body.ghlLocationId

        if (!apiKey || !locationId) {
            return NextResponse.json(
                { error: 'Missing required fields: apiKey and locationId' },
                { status: 400 }
            )
        }

        // Get existing settings to track changes
        const existingSettings = await db.crmSyncSettings.findFirst()

        const superAdminName = getSuperAdminName(user)

        // Check if credentials actually changed
        const credentialsChanged =
            existingSettings?.ghlApiKey !== apiKey ||
            existingSettings?.ghlLocationId !== locationId

        // If credentials changed, reset connection status
        // If not changed, preserve existing status
        const newConnectionStatus = credentialsChanged
            ? 'not_tested'
            : (existingSettings?.ghlConnectionStatus || 'not_tested')

        // Upsert settings
        const settings = await db.crmSyncSettings.upsert({
            where: {
                id: existingSettings?.id || 'default'
            },
            create: {
                id: 'default',
                ghlApiKey: apiKey,
                ghlLocationId: locationId,
                ghlConnectionStatus: 'not_tested',
                lastUpdatedBy: superAdminName,
                lastSavedBy: user.id,
                lastSavedAt: new Date()
            },
            update: {
                ghlApiKey: apiKey,
                ghlLocationId: locationId,
                ghlConnectionStatus: newConnectionStatus,
                lastUpdatedBy: superAdminName,
                lastSavedBy: user.id,
                lastSavedAt: new Date(),
                updatedAt: new Date()
            }
        })

        // Log change to change log
        await db.crmSyncChangeLog.create({
            data: {
                superAdminId: clerkUserId,
                superAdminName: getSuperAdminName(user),
                actionType: existingSettings ? 'UPDATE_CREDENTIALS' : 'CREATE_CREDENTIALS',
                actionDetails: {
                    previousLocationId: existingSettings?.ghlLocationId,
                    newLocationId: locationId,
                    credentialsChanged: true
                },
                oldValue: existingSettings ? JSON.stringify({
                    locationId: existingSettings.ghlLocationId
                }) : null,
                newValue: JSON.stringify({
                    locationId: locationId
                }),
                entityType: 'CrmSyncSettings',
                entityId: settings.id
            }
        })

        return NextResponse.json({
            success: true,
            message: 'Credentials updated successfully',
            settings: {
                locationId: settings.ghlLocationId,
                connectionStatus: settings.ghlConnectionStatus,
                lastTestedAt: settings.ghlLastTested
            }
        })

    } catch (error: any) {
        console.error('Failed to update credentials:', error)

        return NextResponse.json(
            { error: 'Failed to update credentials' },
            { status: 500 }
        )
    }
}
