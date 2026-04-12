import { NextRequest, NextResponse } from 'next/server'
import { checkSuperAdminAuth, getSuperAdminName } from '@/lib/crm-sync-auth'
import { db } from '@/lib/db'

/**
 * PUT /api/admin/crm-sync/mappings/[id]
 * Update field mapping
 * Super admin only
 */
export async function PUT(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        // Check authentication
        const authResult = await checkSuperAdminAuth()
        if ('error' in authResult) {
            return authResult.error
        }

        const { user, clerkUserId } = authResult

        // Await params (Next.js 16+ requirement)
        const params = await context.params
        const mappingId = params.id

        // Get existing mapping
        const existingMapping = await db.fieldMapping.findUnique({
            where: { id: mappingId },
            include: {
                ghlField: true,
                appField: true
            }
        })

        if (!existingMapping) {
            return NextResponse.json(
                { error: 'Mapping not found' },
                { status: 404 }
            )
        }

        // Get update data from request
        const body = await req.json()
        const {
            ghlFieldId,
            appFieldId,
            syncDirection,
            isEnabled,
            groupId,
            transformRules
        } = body

        // If changing field IDs, validate the new mapping doesn't duplicate existing
        if ((ghlFieldId && ghlFieldId !== existingMapping.ghlFieldId) ||
            (appFieldId && appFieldId !== existingMapping.appFieldId)) {

            const targetGhlId = ghlFieldId || existingMapping.ghlFieldId
            const targetAppId = appFieldId || existingMapping.appFieldId

            // Check for duplicate (excluding current mapping)
            const duplicate = await db.fieldMapping.findFirst({
                where: {
                    ghlFieldId: targetGhlId,
                    appFieldId: targetAppId,
                    id: { not: mappingId }
                }
            })

            if (duplicate) {
                return NextResponse.json(
                    { error: 'A mapping already exists for these fields' },
                    { status: 400 }
                )
            }
        }

        // Prepare update data with proper null handling for groupId
        // Empty string '' should be treated as null (no group)
        let targetGroupId = existingMapping.groupId
        if (groupId !== undefined) {
            // Convert empty string or 'none' to null
            targetGroupId = (groupId === '' || groupId === 'none' || groupId === null) ? null : groupId
        }

        // Update mapping
        const updatedMapping = await db.fieldMapping.update({
            where: { id: mappingId },
            data: {
                ghlFieldId: ghlFieldId !== undefined ? ghlFieldId : existingMapping.ghlFieldId,
                appFieldId: appFieldId !== undefined ? appFieldId : existingMapping.appFieldId,
                syncDirection: syncDirection !== undefined ? syncDirection : existingMapping.syncDirection,
                isEnabled: isEnabled !== undefined ? isEnabled : existingMapping.isEnabled,
                groupId: targetGroupId,
                transformRules: transformRules !== undefined ? transformRules : existingMapping.transformRules,
                updatedAt: new Date()
            },
            include: {
                ghlField: true,
                appField: true,
                group: true
            }
        })

        // Log change
        await db.crmSyncChangeLog.create({
            data: {
                superAdminId: clerkUserId,
                superAdminName: getSuperAdminName(user),
                actionType: 'UPDATE_MAPPING',
                actionDetails: {
                    mappingId,
                    ghlFieldName: updatedMapping.ghlField.name,
                    appFieldName: updatedMapping.appField.name,
                    changes: {
                        ghlFieldId: ghlFieldId !== undefined,
                        appFieldId: appFieldId !== undefined,
                        syncDirection: syncDirection !== undefined,
                        isEnabled: isEnabled !== undefined,
                        groupId: groupId !== undefined,
                        transformRules: transformRules !== undefined
                    }
                },
                oldValue: JSON.stringify({
                    ghlFieldId: existingMapping.ghlFieldId,
                    appFieldId: existingMapping.appFieldId,
                    syncDirection: existingMapping.syncDirection,
                    isEnabled: existingMapping.isEnabled,
                    groupId: existingMapping.groupId
                }),
                newValue: JSON.stringify({
                    ghlFieldId: updatedMapping.ghlFieldId,
                    appFieldId: updatedMapping.appFieldId,
                    syncDirection: updatedMapping.syncDirection,
                    isEnabled: updatedMapping.isEnabled,
                    groupId: updatedMapping.groupId
                }),
                entityType: 'FieldMapping',
                entityId: mappingId
            }
        })

        return NextResponse.json({
            success: true,
            message: 'Mapping updated successfully',
            mapping: updatedMapping
        })

    } catch (error: any) {
        console.error('Failed to update mapping:', error)

        return NextResponse.json(
            { error: 'Failed to update mapping' },
            { status: 500 }
        )
    }
}

/**
 * DELETE /api/admin/crm-sync/mappings/[id]
 * Delete field mapping
 * Super admin only
 */
export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        // Check authentication
        const authResult = await checkSuperAdminAuth()
        if ('error' in authResult) {
            return authResult.error
        }

        const { user, clerkUserId } = authResult

        // Await params (Next.js 16+ requirement)
        const params = await context.params
        const mappingId = params.id

        // Get existing mapping
        const existingMapping = await db.fieldMapping.findUnique({
            where: { id: mappingId },
            include: {
                ghlField: true,
                appField: true
            }
        })

        if (!existingMapping) {
            return NextResponse.json(
                { error: 'Mapping not found' },
                { status: 404 }
            )
        }

        // Delete mapping
        await db.fieldMapping.delete({
            where: { id: mappingId }
        })

        // Log change
        await db.crmSyncChangeLog.create({
            data: {
                superAdminId: clerkUserId,
                superAdminName: getSuperAdminName(user),
                actionType: 'DELETE_MAPPING',
                actionDetails: {
                    mappingId,
                    ghlFieldName: existingMapping.ghlField.name,
                    appFieldName: existingMapping.appField.fieldLabel
                },
                oldValue: JSON.stringify({
                    ghlField: existingMapping.ghlField.name,
                    appField: existingMapping.appField.fieldLabel,
                    syncDirection: existingMapping.syncDirection,
                    isEnabled: existingMapping.isEnabled
                }),
                newValue: null,
                entityType: 'FieldMapping',
                entityId: mappingId
            }
        })

        return NextResponse.json({
            success: true,
            message: 'Mapping deleted successfully'
        })

    } catch (error: any) {
        console.error('Failed to delete mapping:', error)

        return NextResponse.json(
            { error: 'Failed to delete mapping' },
            { status: 500 }
        )
    }
}
