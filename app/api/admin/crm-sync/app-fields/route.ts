import { NextRequest, NextResponse } from 'next/server'
import { checkSuperAdminAuth, getSuperAdminName } from '@/lib/crm-sync-auth'
import { db } from '@/lib/db'
import { createSchemaIntrospector } from '@/lib/dynamic-schema-introspector'

/**
 * GET /api/admin/crm-sync/app-fields
 * Fetch app fields from schema introspector
 * Super admin only
 */
export async function GET(req: NextRequest) {
    try {
        // Check authentication
        const authResult = await checkSuperAdminAuth()
        if ('error' in authResult) {
            return authResult.error
        }

        const { user, clerkUserId } = authResult

        // Check if we should refresh from introspector
        const { refresh } = Object.fromEntries(req.nextUrl.searchParams)

        if (refresh === 'true') {
            // Create schema introspector
            const introspector = createSchemaIntrospector(db)

            // Get all mappable fields
            const modelFields = await introspector.getAllMappableFields()

            // Upsert fields (update if exists, create if not)
            // This preserves existing mappings by NOT deleting app fields
            const upsertedFields = []

            for (const modelResult of modelFields) {
                for (const field of modelResult.fields) {
                    const upserted = await db.appField.upsert({
                        where: {
                            fieldKey: field.fieldKey
                        },
                        create: {
                            fieldKey: field.fieldKey,
                            name: field.fieldLabel, // Map fieldLabel to name
                            dataType: field.dataType,
                            modelName: field.modelName,
                            isRequired: field.isRequired,
                            isSystemField: field.isSystemField,
                            description: field.description || null
                        },
                        update: {
                            name: field.fieldLabel,
                            dataType: field.dataType,
                            modelName: field.modelName,
                            isRequired: field.isRequired,
                            isSystemField: field.isSystemField,
                            description: field.description || null
                        }
                    })
                    upsertedFields.push(upserted)
                }
            }

            // Log change
            await db.crmSyncChangeLog.create({
                data: {
                    superAdminId: clerkUserId,
                    superAdminName: getSuperAdminName(user),
                    actionType: 'REFRESH_APP_FIELDS',
                    actionDetails: {
                        fieldsRefreshed: upsertedFields.length,
                        source: 'Schema Introspector'
                    },
                    oldValue: null,
                    newValue: JSON.stringify({
                        fieldCount: upsertedFields.length,
                        models: modelFields.map(m => m.modelName)
                    }),
                    entityType: 'AppField',
                    entityId: null
                }
            })
        }

        // Fetch app fields from database
        const appFields = await db.appField.findMany({
            orderBy: [
                { modelName: 'asc' },
                { name: 'asc' }
            ]
        })

        // Group by model
        const groupedByModel = appFields.reduce((acc, field) => {
            if (!acc[field.modelName]) {
                acc[field.modelName] = []
            }
            acc[field.modelName].push(field)
            return acc
        }, {} as Record<string, typeof appFields>)

        return NextResponse.json({
            fields: appFields,
            groupedByModel,
            count: appFields.length
        })

    } catch (error: any) {
        console.error('Failed to fetch app fields:', error)

        return NextResponse.json(
            { error: 'Failed to fetch app fields' },
            { status: 500 }
        )
    }
}
