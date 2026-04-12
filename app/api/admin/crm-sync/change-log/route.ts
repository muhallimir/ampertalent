import { NextRequest, NextResponse } from 'next/server'
import { checkSuperAdminAuth } from '@/lib/crm-sync-auth'
import { db } from '@/lib/db'

/**
 * GET /api/admin/crm-sync/change-log
 * Fetch CRM Sync change log with pagination and filtering
 * Super admin only
 */
export async function GET(req: NextRequest) {
    try {
        // Check authentication
        const authResult = await checkSuperAdminAuth()
        if ('error' in authResult) {
            return authResult.error
        }

        // Get query parameters
        const searchParams = req.nextUrl.searchParams
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || searchParams.get('pageSize') || '50')
        const actionType = searchParams.get('actionType')
        const actionTypes = searchParams.get('actionTypes') // Support multiple action types
        const superAdminId = searchParams.get('superAdminId') || searchParams.get('adminId') // Support both param names
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')
        const entityType = searchParams.get('entityType')

        // Build where clause
        const where: any = {}

        // Handle action type filtering (single or multiple)
        if (actionTypes) {
            // Multiple action types (comma-separated)
            const actionTypeArray = actionTypes.split(',').filter(Boolean)
            if (actionTypeArray.length > 0) {
                where.actionType = { in: actionTypeArray }
            }
        } else if (actionType) {
            // Single action type
            where.actionType = actionType
        }

        if (superAdminId) {
            where.superAdminId = superAdminId
        }

        if (entityType) {
            where.entityType = entityType
        }

        if (startDate || endDate) {
            where.createdAt = {}
            if (startDate) {
                where.createdAt.gte = new Date(startDate)
            }
            if (endDate) {
                where.createdAt.lte = new Date(endDate)
            }
        }

        // Calculate pagination
        const skip = (page - 1) * limit

        // Fetch change logs
        const [changeLogs, totalCount] = await Promise.all([
            db.crmSyncChangeLog.findMany({
                where,
                orderBy: {
                    createdAt: 'desc'
                },
                skip,
                take: limit
            }),
            db.crmSyncChangeLog.count({ where })
        ])

        // Calculate pagination metadata
        const totalPages = Math.ceil(totalCount / limit)
        const hasNextPage = page < totalPages
        const hasPreviousPage = page > 1

        return NextResponse.json({
            changeLogs,
            pagination: {
                currentPage: page,
                totalPages,
                totalCount,
                limit,
                hasNextPage,
                hasPreviousPage
            },
            filters: {
                actionType,
                superAdminId,
                startDate,
                endDate,
                entityType
            }
        })

    } catch (error: any) {
        console.error('Failed to fetch change log:', error)

        return NextResponse.json(
            {
                error: 'Failed to fetch change log',
                message: error.message,
                details: error.toString()
            },
            { status: 500 }
        )
    }
}

/**
 * GET /api/admin/crm-sync/change-log/export
 * Export change log as CSV
 * Super admin only
 */
export async function POST(req: NextRequest) {
    try {
        // Check authentication
        const authResult = await checkSuperAdminAuth()
        if ('error' in authResult) {
            return authResult.error
        }

        // Get filter parameters from request body
        const body = await req.json()
        const { actionType, superAdminId, startDate, endDate, tableName } = body

        // Build where clause (same as GET)
        const where: any = {}

        if (actionType) {
            where.actionType = actionType
        }

        if (superAdminId) {
            where.superAdminId = superAdminId
        }

        if (tableName) {
            where.tableName = tableName
        }

        if (startDate || endDate) {
            where.createdAt = {}
            if (startDate) {
                where.createdAt.gte = new Date(startDate)
            }
            if (endDate) {
                where.createdAt.lte = new Date(endDate)
            }
        }

        // Fetch all matching logs (no pagination for export)
        const changeLogs = await db.crmSyncChangeLog.findMany({
            where,
            orderBy: {
                createdAt: 'desc'
            }
        })

        // Convert to CSV format
        const csvHeaders = [
            'Timestamp',
            'Super Admin',
            'Action Type',
            'Table Name',
            'Record ID',
            'Old Value',
            'New Value'
        ].join(',')

        const csvRows = changeLogs.map(log => {
            return [
                log.createdAt.toISOString(),
                `"${log.superAdminName}"`,
                log.actionType,
                log.tableName || 'N/A',
                log.recordId || 'N/A',
                log.oldValue ? `"${log.oldValue.replace(/"/g, '""')}"` : 'N/A',
                log.newValue ? `"${log.newValue.replace(/"/g, '""')}"` : 'N/A'
            ].join(',')
        })

        const csvContent = [csvHeaders, ...csvRows].join('\n')

        // Return CSV response
        return new NextResponse(csvContent, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="crm-sync-change-log-${new Date().toISOString()}.csv"`
            }
        })

    } catch (error: any) {
        console.error('Failed to export change log:', error)

        return NextResponse.json(
            { error: 'Failed to export change log' },
            { status: 500 }
        )
    }
}
