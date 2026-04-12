import { NextRequest, NextResponse } from 'next/server'
import { checkSuperAdminAuth, getSuperAdminName } from '@/lib/crm-sync-auth'
import { db } from '@/lib/db'

/**
 * PUT /api/admin/crm-sync/groups/[id]
 * Update field group
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
        const groupId = params.id

        // Get existing group
        const existingGroup = await db.fieldGroup.findUnique({
            where: { id: groupId }
        })

        if (!existingGroup) {
            return NextResponse.json(
                { error: 'Group not found' },
                { status: 404 }
            )
        }

        // Get update data from request
        const body = await req.json()
        const { name, description, sortOrder } = body

        // Check for duplicate name (excluding current group)
        if (name && name !== existingGroup.name) {
            const duplicateGroup = await db.fieldGroup.findFirst({
                where: {
                    name,
                    id: { not: groupId }
                }
            })

            if (duplicateGroup) {
                return NextResponse.json(
                    { error: 'Group with this name already exists' },
                    { status: 400 }
                )
            }
        }

        // Update group
        const updatedGroup = await db.fieldGroup.update({
            where: { id: groupId },
            data: {
                name: name !== undefined ? name : existingGroup.name,
                description: description !== undefined ? description : existingGroup.description,
                sortOrder: sortOrder !== undefined ? sortOrder : existingGroup.sortOrder,
                updatedAt: new Date()
            }
        })

        // Log change
        await db.crmSyncChangeLog.create({
            data: {
                superAdminId: clerkUserId,
                superAdminName: getSuperAdminName(user),
                actionType: 'UPDATE_GROUP',
                actionDetails: {
                    groupId,
                    groupName: existingGroup.name,
                    changes: {
                        name: name !== undefined,
                        description: description !== undefined,
                        sortOrder: sortOrder !== undefined
                    }
                },
                oldValue: JSON.stringify({
                    name: existingGroup.name,
                    description: existingGroup.description,
                    sortOrder: existingGroup.sortOrder
                }),
                newValue: JSON.stringify({
                    name: updatedGroup.name,
                    description: updatedGroup.description,
                    sortOrder: updatedGroup.sortOrder
                }),
                entityType: 'FieldGroup',
                entityId: groupId
            }
        })

        return NextResponse.json({
            success: true,
            message: 'Group updated successfully',
            group: updatedGroup
        })

    } catch (error: any) {
        console.error('Failed to update group:', error)

        return NextResponse.json(
            { error: 'Failed to update group' },
            { status: 500 }
        )
    }
}

/**
 * DELETE /api/admin/crm-sync/groups/[id]
 * Delete field group
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
        const groupId = params.id

        // Get existing group
        const existingGroup = await db.fieldGroup.findUnique({
            where: { id: groupId },
            include: {
                _count: {
                    select: { mappings: true }
                }
            }
        })

        if (!existingGroup) {
            return NextResponse.json(
                { error: 'Group not found' },
                { status: 404 }
            )
        }

        // Check if group has mappings
        if (existingGroup._count.mappings > 0) {
            return NextResponse.json(
                {
                    error: 'Cannot delete group with active mappings',
                    mappingsCount: existingGroup._count.mappings
                },
                { status: 400 }
            )
        }

        // Delete group
        await db.fieldGroup.delete({
            where: { id: groupId }
        })

        // Log change
        await db.crmSyncChangeLog.create({
            data: {
                superAdminId: clerkUserId,
                superAdminName: getSuperAdminName(user),
                actionType: 'DELETE_GROUP',
                actionDetails: {
                    groupId,
                    groupName: existingGroup.name
                },
                oldValue: JSON.stringify({
                    name: existingGroup.name,
                    description: existingGroup.description,
                    sortOrder: existingGroup.sortOrder
                }),
                newValue: null,
                entityType: 'FieldGroup',
                entityId: groupId
            }
        })

        return NextResponse.json({
            success: true,
            message: 'Group deleted successfully'
        })

    } catch (error: any) {
        console.error('Failed to delete group:', error)

        return NextResponse.json(
            { error: 'Failed to delete group' },
            { status: 500 }
        )
    }
}
