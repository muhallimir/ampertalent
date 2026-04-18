import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { generateInvoicePDF } from '@/lib/invoice-pdf'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params
        const currentUser = await getCurrentUser(request)
        if (!currentUser?.clerkUser?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userProfile = await db.userProfile.findUnique({
            where: { clerkUserId: currentUser.clerkUser.id as string },
            include: { employer: true },
        })

        if (!userProfile || userProfile.role !== 'employer' || !userProfile.employer) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        const invoices = await db.$queryRaw`
            SELECT i.id, i.amount_due, i.status, i.created_at, i.description, i.package_name, i.paid_at, i.due_date,
                   e.company_name, e.billing_address, e.tax_id
            FROM invoices i
            JOIN employer_packages ep ON i.employer_package_id = ep.id
            JOIN employers e ON ep.employer_id = e.user_id
            WHERE i.id = ${resolvedParams.id} AND ep.employer_id = ${userProfile.employer.userId}
        ` as Array<{
            id: string; amount_due: number; status: string; created_at: Date
            description: string | null; package_name: string | null; paid_at: Date | null; due_date: Date | null
            company_name: string; billing_address: string | null; tax_id: string | null
        }>

        if (invoices.length === 0) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
        }

        const invoice = invoices[0]
        const pdfBuffer = await generateInvoicePDF(invoice as any)

        return new NextResponse(pdfBuffer as unknown as BodyInit, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="invoice-${invoice.id}.pdf"`,
                'Content-Length': pdfBuffer.length.toString(),
            },
        })
    } catch (error) {
        console.error('Error generating invoice PDF:', error)
        return NextResponse.json({ error: 'Failed to generate invoice PDF' }, { status: 500 })
    }
}
