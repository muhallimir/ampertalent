import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Await params for Next.js 16
        const { id: serviceRequestId } = await params

        // Verify user is authenticated and is an admin
        const currentUser = await getCurrentUser(request)
        if (!currentUser?.clerkUser || !currentUser.profile) {
            return NextResponse.json(
                { error: 'Unauthorized - Authentication required' },
                { status: 401 }
            )
        }

        // Check if user is admin or super_admin
        if (!['admin', 'super_admin'].includes(currentUser.profile.role)) {
            return NextResponse.json(
                { error: 'Forbidden - Admin access required' },
                { status: 403 }
            )
        }

        // Verify the service request exists and is an employer add-on
        const serviceRequest = await db.additionalServicePurchase.findUnique({
            where: { id: serviceRequestId },
            select: {
                id: true,
                employerPackageId: true,
                status: true
            }
        })

        if (!serviceRequest) {
            return NextResponse.json(
                { error: 'Service request not found' },
                { status: 404 }
            )
        }

        // Only allow audit trail for employer add-ons (those with employerPackageId set)
        if (!serviceRequest.employerPackageId) {
            return NextResponse.json(
                { error: 'Audit trail only available for employer add-on services' },
                { status: 400 }
            )
        }

        // Fetch audit trail records
        const auditTrail = await db.serviceRequestAudit.findMany({
            where: { serviceRequestId: serviceRequestId },
            include: {
                changedByUser: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true
                    }
                }
            },
            orderBy: { createdAt: 'asc' }
        })

        console.log('✅ AUDIT TRAIL: Retrieved for service request:', {
            serviceRequestId,
            auditCount: auditTrail.length
        })

        return NextResponse.json({
            success: true,
            auditTrail: auditTrail.map((audit) => ({
                id: audit.id,
                changeType: audit.changeType,
                previousValue: audit.previousValue,
                newValue: audit.newValue,
                description: audit.description,
                changedBy: {
                    id: audit.changedByUser.id,
                    name: audit.changedByUser.name,
                    email: audit.changedByUser.email,
                    role: audit.changedByUser.role
                },
                createdAt: audit.createdAt.toISOString()
            }))
        })
    } catch (error) {
        console.error('Error fetching audit trail:', error)
        return NextResponse.json(
            { error: 'Failed to fetch audit trail' },
            { status: 500 }
        )
    }
}
