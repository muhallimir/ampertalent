import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser(request)
        if (!currentUser?.clerkUser || !currentUser.profile) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (currentUser.profile.role !== 'employer' && !(currentUser.isImpersonating && currentUser.profile.role === 'employer')) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        if (!currentUser.profile.employer) {
            return NextResponse.json({ error: 'Employer profile not found' }, { status: 403 })
        }

        const invoices = await db.$queryRaw`
            SELECT i.id, i.amount_due, i.status, i.created_at, i.description, i.package_name, i.paid_at, i.due_date
            FROM invoices i
            JOIN employer_packages ep ON i.employer_package_id = ep.id
            WHERE ep.employer_id = ${currentUser.profile.employer.userId}
            ORDER BY i.created_at DESC
        ` as Array<{
            id: string; amount_due: number; status: string; created_at: Date
            description: string | null; package_name: string | null; paid_at: Date | null; due_date: Date | null
        }>

        const formattedInvoices = invoices.map(invoice => ({
            id: invoice.id,
            amount: invoice.amount_due / 100,
            status: invoice.status,
            date: invoice.created_at.toISOString(),
            description: invoice.description || '',
            packageName: invoice.package_name || '',
            paidAt: invoice.paid_at?.toISOString() || null,
            dueDate: invoice.due_date?.toISOString() || null,
            downloadUrl: `/api/employer/billing/invoices/${invoice.id}/download`,
        }))

        return NextResponse.json({ success: true, invoices: formattedInvoices })
    } catch (error) {
        console.error('Error fetching employer invoices:', error)
        return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
    }
}
