import { db } from '@/lib/db'

export const serviceRequestAuditService = {
    /**
     * Log a status change for a service request
     */
    async logStatusChange(
        serviceRequestId: string,
        changedByUserId: string,
        previousStatus: string,
        newStatus: string,
        description?: string
    ) {
        try {
            const audit = await db.serviceRequestAudit.create({
                data: {
                    serviceRequestId,
                    changedBy: changedByUserId,
                    changeType: 'status',
                    previousValue: previousStatus,
                    newValue: newStatus,
                    description: description || `Status changed from ${previousStatus} to ${newStatus}`
                }
            })

            console.log('✅ AUDIT: Status change logged', {
                serviceRequestId,
                previousStatus,
                newStatus,
                auditId: audit.id
            })

            return audit
        } catch (error) {
            console.error('⚠️ AUDIT: Failed to log status change:', error)
            // Don't throw - audit logging shouldn't fail the main operation
            return null
        }
    },

    /**
     * Log a fulfillment notes change for a service request
     */
    async logNotesChange(
        serviceRequestId: string,
        changedByUserId: string,
        previousNotes: string | null,
        newNotes: string | null,
        description?: string
    ) {
        try {
            const audit = await db.serviceRequestAudit.create({
                data: {
                    serviceRequestId,
                    changedBy: changedByUserId,
                    changeType: 'notes',
                    previousValue: previousNotes || '',
                    newValue: newNotes || '',
                    description: description || 'Fulfillment notes updated'
                }
            })

            console.log('✅ AUDIT: Notes change logged', {
                serviceRequestId,
                notesUpdated: true,
                auditId: audit.id
            })

            return audit
        } catch (error) {
            console.error('⚠️ AUDIT: Failed to log notes change:', error)
            return null
        }
    },

    /**
     * Log an admin assignment change
     */
    async logAssignmentChange(
        serviceRequestId: string,
        changedByUserId: string,
        previousAdminId: string | null,
        newAdminId: string | null,
        previousAdminName?: string,
        newAdminName?: string
    ) {
        try {
            const audit = await db.serviceRequestAudit.create({
                data: {
                    serviceRequestId,
                    changedBy: changedByUserId,
                    changeType: 'assignment',
                    previousValue: previousAdminId || '',
                    newValue: newAdminId || '',
                    description: `Assignment changed from ${previousAdminName || 'unassigned'} to ${newAdminName || 'unassigned'}`
                }
            })

            console.log('✅ AUDIT: Assignment change logged', {
                serviceRequestId,
                from: previousAdminName || 'unassigned',
                to: newAdminName || 'unassigned',
                auditId: audit.id
            })

            return audit
        } catch (error) {
            console.error('⚠️ AUDIT: Failed to log assignment change:', error)
            return null
        }
    }
}
