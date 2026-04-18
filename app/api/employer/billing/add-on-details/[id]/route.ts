import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { EMPLOYER_ADDONS } from '@/lib/addons-config'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: serviceRequestId } = await params

        const currentUser = await getCurrentUser(request)
        if (!currentUser?.clerkUser || !currentUser.profile) {
            return NextResponse.json({ error: 'Unauthorized - Authentication required' }, { status: 401 })
        }

        const serviceRequest = await db.additionalServicePurchase.findUnique({
            where: { id: serviceRequestId },
            select: {
                id: true,
                userId: true,
                employerPackageId: true,
                status: true,
                fulfillmentNotes: true,
                service: { select: { name: true } },
            },
        })

        if (!serviceRequest) {
            return NextResponse.json({ error: 'Service request not found' }, { status: 404 })
        }

        if (serviceRequest.userId !== currentUser.profile.id) {
            return NextResponse.json({ error: 'Forbidden - You do not have access to this service request' }, { status: 403 })
        }

        if (!serviceRequest.employerPackageId) {
            return NextResponse.json({ error: 'Audit trail only available for employer add-on services' }, { status: 400 })
        }

        const auditTrail = await db.serviceRequestAudit.findMany({
            where: { serviceRequestId },
            include: {
                changedByUser: { select: { id: true, name: true, email: true, role: true } },
            },
            orderBy: { createdAt: 'asc' },
        })

        return NextResponse.json({
            success: true,
            serviceRequest: {
                id: serviceRequest.id,
                serviceName: serviceRequest.service.name,
                status: serviceRequest.status,
                fulfillmentNotes: serviceRequest.fulfillmentNotes,
            },
            auditTrail: auditTrail.map(audit => ({
                id: audit.id,
                changeType: audit.changeType,
                previousValue: audit.previousValue,
                newValue: audit.newValue,
                description: audit.description,
                changedBy: { id: audit.changedByUser.id, name: audit.changedByUser.name, email: audit.changedByUser.email, role: audit.changedByUser.role },
                createdAt: audit.createdAt.toISOString(),
            })),
        })
    } catch (error) {
        console.error('Error fetching employer audit trail:', error)
        return NextResponse.json({ error: 'Failed to fetch audit trail' }, { status: 500 })
    }
}
