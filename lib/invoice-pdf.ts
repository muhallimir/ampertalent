import { jsPDF } from 'jspdf'
import fs from 'fs'
import path from 'path'

interface InvoiceData {
  id: string
  amount_due: number
  status: string
  created_at: Date
  description: string | null
  package_name?: string | null
  plan_name?: string | null
  paid_at: Date | null
  due_date?: Date | null
  // Billing info
  company_name?: string
  user_name?: string
  user_email?: string
  billing_address?: string | null
  tax_id?: string | null
}

const formatInvoiceNumber = (id: string) => {
  if (!id) return ''
  if (/^[A-Z]+-/.test(id)) {
    return id
  }
  return `INV-${id.slice(-8).toUpperCase()}`
}

export function generateInvoicePDF(invoice: InvoiceData): Buffer {
  // Create PDF using jsPDF
  const doc = new jsPDF()

  // Add AmperTalent logo
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo', 'ampertalent.png')
    if (fs.existsSync(logoPath)) {
      const logoData = fs.readFileSync(logoPath)
      const logoBase64 = `data:image/png;base64,${logoData.toString('base64')}`
      doc.addImage(logoBase64, 'PNG', 20, 10, 40, 20) // x, y, width, height
    }
  } catch (error) {
    console.warn('Could not load logo for PDF:', error)
  }

  // Header - adjusted position to accommodate logo
  doc.setFontSize(20)
  doc.setTextColor(0, 0, 0) // Black
  doc.text('INVOICE', 20, 45)

  doc.setFontSize(12)
  doc.setTextColor(0, 102, 102) // Teal color matching brand
  doc.text('AmperTalent.com', 20, 55)
  doc.setTextColor(100, 100, 100) // Gray
  doc.text('The trusted platform for remote work opportunities', 20, 62)

  // Invoice details (right side)
  doc.setTextColor(0, 0, 0) // Black
  doc.setFontSize(12)
  doc.text(`Invoice #: ${formatInvoiceNumber(invoice.id)}`, 120, 45)
  doc.text(`Date: ${invoice.created_at.toLocaleDateString()}`, 120, 52)
  doc.text(`Status: ${invoice.status.toUpperCase()}`, 120, 59)
  if (invoice.paid_at) {
    doc.setTextColor(0, 128, 0) // Green for paid date
    doc.text(`Paid: ${invoice.paid_at.toLocaleDateString()}`, 120, 66)
    doc.setTextColor(0, 0, 0) // Reset to black
  }

  // Bill to section
  doc.setFontSize(14)
  doc.setTextColor(0, 102, 102) // Teal
  doc.text('Bill To:', 20, 85)

  doc.setFontSize(12)
  doc.setTextColor(0, 0, 0) // Black
  
  // Use company name for employers, user name for seekers
  const billingName = invoice.company_name || invoice.user_name || 'Customer'
  doc.text(billingName, 20, 95)

  let yPos = 102
  
  // Add user email for seekers
  if (invoice.user_email && !invoice.company_name) {
    doc.setTextColor(100, 100, 100) // Gray
    doc.text(invoice.user_email, 20, yPos)
    doc.setTextColor(0, 0, 0) // Reset to black
    yPos += 7
  }

  // Add billing address if available
  if (invoice.billing_address) {
    const addressLines = invoice.billing_address.split('\n')
    doc.setTextColor(100, 100, 100) // Gray
    addressLines.forEach(line => {
      doc.text(line, 20, yPos)
      yPos += 7
    })
    doc.setTextColor(0, 0, 0) // Reset to black
  }

  // Add tax ID if available
  if (invoice.tax_id) {
    doc.setTextColor(100, 100, 100) // Gray
    doc.text(`Tax ID: ${invoice.tax_id}`, 20, yPos + 10)
    doc.setTextColor(0, 0, 0) // Reset to black
  }

  // Invoice items table
  const tableTop = 150

  // Table headers with background
  doc.setFillColor(0, 102, 102) // Teal background
  doc.rect(20, tableTop - 8, 170, 15, 'F') // Fill rectangle
  
  doc.setFontSize(12)
  doc.setTextColor(255, 255, 255) // White text
  doc.text('Description', 25, tableTop)
  doc.text('Amount', 155, tableTop)

  // Invoice item
  const itemY = tableTop + 20
  doc.setTextColor(0, 0, 0) // Black
  const itemDescription = invoice.description || 
                         invoice.package_name || 
                         invoice.plan_name || 
                         'Service Purchase'
  doc.text(itemDescription, 25, itemY)
  doc.text(`$${(invoice.amount_due / 100).toFixed(2)}`, 155, itemY)

  // Subtotal and Total section
  const subtotalY = itemY + 25
  doc.setTextColor(100, 100, 100) // Gray
  doc.text('Subtotal:', 120, subtotalY)
  doc.text(`$${(invoice.amount_due / 100).toFixed(2)}`, 155, subtotalY)

  const totalY = subtotalY + 10
  doc.setFillColor(240, 240, 240) // Light gray background
  doc.rect(120, totalY - 8, 70, 15, 'F')
  
  doc.setFontSize(14)
  doc.setTextColor(0, 0, 0) // Black
  doc.text('Total:', 125, totalY)
  doc.setFontSize(16)
  doc.text(`$${(invoice.amount_due / 100).toFixed(2)}`, 155, totalY)

  // Payment status with better styling
  const statusY = totalY + 30
  if (invoice.status === 'paid') {
    doc.setFillColor(220, 255, 220) // Light green background
    doc.rect(20, statusY - 10, 60, 20, 'F')
    doc.setFontSize(16)
    doc.setTextColor(0, 128, 0) // Green
    doc.text('✓ PAID', 25, statusY)
  } else {
    doc.setFillColor(255, 220, 220) // Light red background
    doc.rect(20, statusY - 10, 80, 20, 'F')
    doc.setFontSize(16)
    doc.setTextColor(255, 0, 0) // Red
    doc.text('⚠ UNPAID', 25, statusY)
    if (invoice.due_date) {
      doc.setFontSize(12)
      doc.setTextColor(0, 0, 0) // Black
      doc.text(`Due Date: ${invoice.due_date.toLocaleDateString()}`, 25, statusY + 15)
    }
  }

  // Footer with better styling
  doc.setFontSize(10)
  doc.setTextColor(0, 102, 102) // Teal
  const footerMessage = invoice.company_name 
    ? 'Thank you for choosing AmperTalent for your hiring needs!' 
    : 'Thank you for your subscription to AmperTalent!'
  doc.text(footerMessage, 20, 250)
  
  doc.setTextColor(100, 100, 100) // Gray
  doc.text('For questions about this invoice, please contact support@ampertalent.com', 20, 257)
  doc.text('Visit us at www.ampertalent.com', 20, 264)

  // Add a subtle border around the entire invoice
  doc.setDrawColor(200, 200, 200) // Light gray
  doc.setLineWidth(0.5)
  doc.rect(15, 5, 180, 270)

  // Generate PDF buffer
  return Buffer.from(doc.output('arraybuffer'))
}
