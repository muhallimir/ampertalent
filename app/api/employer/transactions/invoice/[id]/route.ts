import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { generateInvoicePDF } from '@/lib/invoice-pdf'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params for Next.js 16
    const { id } = await params

    const currentUser = await getCurrentUser(request)
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is an employer
    if (currentUser.profile.role !== 'employer') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const userId = currentUser.profile.id
    const transactionId = id

    console.log(`🔍 PDF INVOICE: Looking for transaction ${transactionId} for user ${userId}`)

    // First try to find it as an invoice
    let invoice = await db.invoice.findFirst({
      where: {
        id: transactionId,
        employerPackage: {
          employerId: userId
        }
      },
      include: {
        employerPackage: {
          include: {
            employer: true
          }
        }
      }
    })

    // If not found as invoice, try to find as external payment and create invoice data
    if (!invoice) {
      console.log(`🔍 PDF INVOICE: Not found as invoice, checking external payments`)

      const externalPayment = await db.externalPayment.findFirst({
        where: {
          id: transactionId,
          userId: userId
        }
      })

      if (externalPayment) {
        console.log(`🔍 PDF INVOICE: Found as external payment, creating invoice data`)

        // Get user's employer info
        const userProfile = await db.userProfile.findUnique({
          where: { id: userId },
          include: { employer: true }
        })

        // Create a mock invoice structure for PDF generation
        invoice = {
          id: externalPayment.id,
          amountDue: Number(externalPayment.amount) * 100, // Convert to cents
          status: externalPayment.status === 'completed' ? 'paid' : 'pending',
          createdAt: externalPayment.createdAt,
          description: `Package payment for ${externalPayment.planId}`,
          packageName: externalPayment.planId,
          paidAt: externalPayment.status === 'completed' ? externalPayment.createdAt : null,
          dueDate: null,
          employerPackage: {
            employer: userProfile?.employer || {
              companyName: 'Company',
              billingAddress: null,
              taxId: null
            }
          }
        } as any
      }
    }

    if (!invoice) {
      console.log(`❌ PDF INVOICE: Transaction ${transactionId} not found for user ${userId}`)
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    console.log(`✅ PDF INVOICE: Found transaction data for ${transactionId}`)

    // Prepare invoice data for PDF generation
    const invoiceData = {
      id: invoice.id,
      amount_due: invoice.amountDue,
      status: invoice.status,
      created_at: invoice.createdAt,
      description: invoice.description,
      package_name: invoice.packageName,
      paid_at: invoice.paidAt,
      due_date: invoice.dueDate,
      company_name: invoice.employerPackage.employer.companyName,
      billing_address: invoice.employerPackage.employer.billingAddress,
      tax_id: invoice.employerPackage.employer.taxId
    }

    // Generate PDF
    const pdfBuffer = generateInvoicePDF(invoiceData)

    // Generate filename
    const filename = `ampertalent-invoice-${invoice.id.slice(-8).toUpperCase()}.pdf`

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    console.error('Error generating employer invoice PDF:', error)
    return NextResponse.json(
      { error: 'Failed to generate invoice PDF' },
      { status: 500 }
    )
  }
}