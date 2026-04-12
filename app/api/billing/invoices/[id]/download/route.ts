import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateInvoicePDF } from '@/lib/invoice-pdf'

export const dynamic = 'force-dynamic'

/**
 * GET /api/billing/invoices/[id]/download
 * Download invoice as PDF
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const invoiceId = params.id

    // Get invoice
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        employerPackage: {
          include: {
            employer: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Verify access - user must be either the employer or an admin
    // For now, just check if they own the employer account
    if (invoice.employerPackage?.employer.user.clerkUserId !== userId) {
      // Check if user is an admin
      const userProfile = await db.userProfile.findUnique({
        where: { clerkUserId: userId },
      })

      if (userProfile?.role !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }
    }

    // Generate PDF
    const pdfBuffer = generateInvoicePDF({
      id: invoice.id,
      amount_due: invoice.amountDue,
      status: invoice.status,
      created_at: invoice.createdAt,
      description: invoice.description || undefined,
      package_name: invoice.packageName || undefined,
      paid_at: invoice.paidAt,
      due_date: invoice.dueDate || undefined,
      company_name: invoice.employerPackage?.employer.companyName,
      user_name: invoice.employerPackage?.employer.user.name || undefined,
      user_email: invoice.employerPackage?.employer.user.email || undefined,
      billing_address: invoice.employerPackage?.employer.billingAddress || undefined,
    })

    // Return PDF
    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoice.id}.pdf"`,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('[Invoice Download] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate PDF'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
