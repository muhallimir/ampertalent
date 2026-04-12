import { NextRequest, NextResponse } from 'next/server'
import { checkSuperAdminAuth, getSuperAdminName } from '@/lib/crm-sync-auth'
import { db } from '@/lib/db'

/**
 * GET /api/admin/crm-sync/groups
 * Fetch all field groups
 * Super admin only
 */
export async function GET(req: NextRequest) {
    try {
        // Check authentication
        const authResult = await checkSuperAdminAuth()
        if ('error' in authResult) {
            return authResult.error
        }

        // Fetch groups with mapping count
        const groupsRaw = await db.fieldGroup.findMany({
            include: {
                _count: {
                    select: { mappings: true }
                }
            },
            orderBy: {
                sortOrder: 'asc'
            }
        })

        // Transform _count.mappings to mappingCount for frontend compatibility
        const groups = groupsRaw.map(group => ({
            ...group,
            mappingCount: group._count.mappings,
            _count: undefined
        }))

        return NextResponse.json({
            groups,
            count: groups.length
        })

    } catch (error: any) {
        console.error('Failed to fetch groups:', error)

        return NextResponse.json(
            { error: 'Failed to fetch groups' },
            { status: 500 }
        )
    }
}

/**
 * POST /api/admin/crm-sync/groups
 * Create new field group
 * Super admin only
 */
export async function POST(req: NextRequest) {
    try {
        // Check authentication
        const authResult = await checkSuperAdminAuth()
        if ('error' in authResult) {
            return authResult.error
        }

        const { user, clerkUserId } = authResult

        // Get group data from request
        const body = await req.json()
        const { name, description, sortOrder } = body

        if (!name) {
            return NextResponse.json(
                { error: 'Missing required field: name' },
                { status: 400 }
            )
        }

        // Check for duplicate name
        const existingGroup = await db.fieldGroup.findFirst({
            where: { name }
        })

        if (existingGroup) {
            return NextResponse.json(
                { error: 'Group with this name already exists' },
                { status: 400 }
            )
        }

        // Get max sort order if not provided
        let finalSortOrder = sortOrder
        if (finalSortOrder === undefined) {
            const maxGroup = await db.fieldGroup.findFirst({
                orderBy: { sortOrder: 'desc' }
            })
            finalSortOrder = (maxGroup?.sortOrder || 0) + 1
        }

        // Create group
        const group = await db.fieldGroup.create({
            data: {
                name,
                description: description || null,
                sortOrder: finalSortOrder
            }
        })

        // Log change
        await db.crmSyncChangeLog.create({
            data: {
                superAdminId: clerkUserId,
                superAdminName: getSuperAdminName(user),
                actionType: 'CREATE_GROUP',
                actionDetails: {
                    groupName: name,
                    description
                },
                oldValue: null,
                newValue: JSON.stringify({ name, description, sortOrder: finalSortOrder }),
                entityType: 'FieldGroup',
                entityId: group.id
            }
        })

        return NextResponse.json({
            success: true,
            message: 'Group created successfully',
            group
        })

    } catch (error: any) {
        console.error('Failed to create group:', error)

        return NextResponse.json(
            { error: 'Failed to create group' },
            { status: 500 }
        )
    }
}
