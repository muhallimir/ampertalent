import { NextRequest, NextResponse } from 'next/server'
import { checkSuperAdminAuth, getSuperAdminName } from '@/lib/crm-sync-auth'
import { db } from '@/lib/db'

/**
 * GET /api/admin/crm-sync/mappings
 * Fetch all field mappings
 * Super admin only
 */
export async function GET(req: NextRequest) {
    try {
        // Check authentication
        const authResult = await checkSuperAdminAuth()
        if ('error' in authResult) {
            return authResult.error
        }

        // Fetch mappings with related fields
        const mappings = await db.fieldMapping.findMany({
            include: {
                ghlField: true,
                appField: true,
                group: true
            },
            orderBy: [
                { isEnabled: 'desc' },
                { createdAt: 'desc' }
            ]
        })

        return NextResponse.json({
            mappings,
            count: mappings.length,
            enabledCount: mappings.filter(m => m.isEnabled).length
        })

    } catch (error: any) {
        console.error('Failed to fetch mappings:', error)

        return NextResponse.json(
            { error: 'Failed to fetch mappings' },
            { status: 500 }
        )
    }
}

/**
 * POST /api/admin/crm-sync/mappings
 * Create new field mapping
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

        // Get mapping data from request
        const body = await req.json()
        const {
            ghlFieldId,
            appFieldId,
            syncDirection = 'app_to_ghl',
            isEnabled = true,
            groupId, // Frontend sends groupId
            fieldGroupId, // Legacy support
            transformationRule
        } = body

        // Use groupId or fieldGroupId (whichever is provided)
        // Convert empty string, 'none', or null to actual null
        const finalGroupId = (groupId === '' || groupId === 'none' || groupId === null) ? null :
            (fieldGroupId === '' || fieldGroupId === 'none' || fieldGroupId === null) ? null :
                groupId || fieldGroupId || null

        console.log('Creating mapping with data:', {
            ghlFieldId,
            appFieldId,
            syncDirection,
            isEnabled,
            groupId: finalGroupId,
            transformationRule
        })

        if (!ghlFieldId || !appFieldId) {
            return NextResponse.json(
                { error: 'Missing required fields: ghlFieldId and appFieldId' },
                { status: 400 }
            )
        }

        // Fetch fields to validate data types
        const [ghlField, appField] = await Promise.all([
            db.ghlField.findUnique({ where: { id: ghlFieldId } }),
            db.appField.findUnique({ where: { id: appFieldId } })
        ])

        if (!ghlField || !appField) {
            return NextResponse.json(
                { error: 'Invalid field IDs' },
                { status: 400 }
            )
        }

        // Check data type compatibility (case-insensitive)
        const ghlTypeLower = ghlField.dataType.toLowerCase()
        const appTypeLower = appField.dataType.toLowerCase()

        const compatibilityMatrix: Record<string, string[]> = {
            'text': ['text', 'picklist', 'phone', 'email', 'url', 'string', 'varchar', 'char', 'textarea'],
            'large_text': ['text', 'string', 'textarea', 'longtext'],
            'number': ['number', 'integer', 'float', 'int', 'decimal', 'double'],
            'numerical': ['number', 'integer', 'int', 'decimal'],
            'float': ['number', 'float', 'double', 'decimal'],
            'boolean': ['boolean', 'bool', 'bit'],
            'checkbox': ['boolean', 'bool', 'bit'],
            'date': ['date', 'datetime', 'timestamp', 'time'],
            'picklist': ['text', 'picklist', 'string', 'enum'],
            'single_options': ['text', 'string', 'enum', 'userrole', 'membershipplan', 'subscriptionstatus', 'packagetype'], // GHL dropdown fields
            'multiple_options': ['text', 'string', 'enum', 'membershipplan', 'array'], // GHL multi-select
            'textbox_list': ['text', 'string', 'array'],
            'email': ['email', 'text', 'string'],
            'phone': ['phone', 'text', 'string'],
            'monetory': ['number', 'decimal', 'float', 'double'],
            'textarea': ['text', 'string', 'textarea', 'longtext'],
            'json': ['text', 'string', 'json']
        }

        const compatibleTypes = compatibilityMatrix[ghlTypeLower] || []
        const isCompatible = compatibleTypes.includes(appTypeLower) || ghlTypeLower === appTypeLower

        if (!isCompatible) {
            return NextResponse.json(
                {
                    error: 'Incompatible data types',
                    details: {
                        appFieldType: appField.dataType,
                        ghlFieldType: ghlField.dataType,
                        compatibleTypes: compatibilityMatrix[ghlTypeLower] || []
                    }
                },
                { status: 400 }
            )
        }

        // Check for duplicate mapping
        const existingMapping = await db.fieldMapping.findFirst({
            where: {
                OR: [
                    { ghlFieldId, appFieldId },
                    { ghlFieldId }, // One GHL field can only map to one app field
                ]
            }
        })

        if (existingMapping) {
            return NextResponse.json(
                { error: 'Mapping already exists for this GHL field' },
                { status: 400 }
            )
        }

        // Create mapping
        const mapping = await db.fieldMapping.create({
            data: {
                ghlFieldId,
                appFieldId,
                syncDirection,
                isEnabled,
                groupId: finalGroupId,
                createdBy: clerkUserId,
                transformRules: transformationRule || null
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
                actionType: 'CREATE_MAPPING',
                actionDetails: {
                    ghlFieldName: ghlField.name,
                    appFieldName: appField.name,
                    syncDirection,
                    isEnabled
                },
                oldValue: null,
                newValue: JSON.stringify({
                    ghlField: ghlField.name,
                    appField: appField.name,
                    syncDirection,
                    isEnabled
                }),
                entityType: 'FieldMapping',
                entityId: mapping.id
            }
        })

        return NextResponse.json({
            success: true,
            message: 'Mapping created successfully',
            mapping
        })

    } catch (error: any) {
        console.error('Failed to create mapping:', error)

        return NextResponse.json(
            { error: 'Failed to create mapping' },
            { status: 500 }
        )
    }
}
