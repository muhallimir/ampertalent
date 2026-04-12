import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { S3Service } from '@/lib/s3'
import { db } from '@/lib/db'
import { GetObjectCommand } from '@aws-sdk/client-s3'

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'hire-my-mom-files'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ employerId: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request)

    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify admin role
    if (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const { employerId } = await params

    // Get the employer's company logo URL
    const employer = await db.employer.findUnique({
      where: { userId: employerId },
      select: { companyLogoUrl: true, companyName: true }
    })

    if (!employer) {
      return NextResponse.json(
        { error: 'Employer not found' },
        { status: 404 }
      )
    }

    if (!employer.companyLogoUrl || employer.companyLogoUrl.trim() === '') {
      return NextResponse.json(
        { error: 'No company logo found' },
        { status: 404 }
      )
    }

    try {
      // Extract S3 key from the full URL
      const url = new URL(employer.companyLogoUrl)
      const s3Key = url.pathname.substring(1) // Remove leading slash

      // Generate presigned URL for download (valid for 1 hour)
      const presignedUrl = await S3Service.generatePresignedDownloadUrl(
        BUCKET_NAME,
        s3Key,
        3600 // 1 hour
      )

      return NextResponse.json({
        companyLogoUrl: presignedUrl,
        companyName: employer.companyName
      })
    } catch (error) {
      console.error('Error generating presigned URL for company logo:', error)
      // Fall back to original URL if presigned URL generation fails
      return NextResponse.json({
        companyLogoUrl: employer.companyLogoUrl,
        companyName: employer.companyName
      })
    }

  } catch (error) {
    console.error('Error fetching company logo:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ employerId: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request)

    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify admin role
    if (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const { employerId } = await params
    const { action, logoUrl } = await request.json()

    if (action !== 'download') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Get the employer's company info
    const employer = await db.employer.findUnique({
      where: { userId: employerId },
      select: { companyLogoUrl: true, companyName: true }
    })

    if (!employer) {
      return NextResponse.json(
        { error: 'Employer not found' },
        { status: 404 }
      )
    }

    // Use the provided logoUrl (custom email blast logo) or fall back to company profile logo
    const targetLogoUrl = logoUrl || employer.companyLogoUrl

    if (!targetLogoUrl || targetLogoUrl.trim() === '') {
      return NextResponse.json(
        { error: 'No logo found' },
        { status: 404 }
      )
    }

    try {
      // Extract S3 key from the full URL
      const url = new URL(targetLogoUrl)
      const s3Key = url.pathname.substring(1) // Remove leading slash

      // Get the file from S3 using AWS SDK directly
      const client = (S3Service as any).getClient()
      const getObjectCommand = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
      })

      const response = await client.send(getObjectCommand)

      if (!response.Body) {
        throw new Error('Failed to read file content')
      }

      const fileBuffer = Buffer.from(await response.Body.transformToByteArray())

      // Determine file extension from S3 key
      const fileExtension = s3Key.split('.').pop() || 'png'
      const mimeType = fileExtension === 'jpg' || fileExtension === 'jpeg' ? 'image/jpeg' :
        fileExtension === 'png' ? 'image/png' :
          fileExtension === 'gif' ? 'image/gif' :
            fileExtension === 'svg' ? 'image/svg+xml' : 'image/png'

      // Create filename
      const sanitizedCompanyName = employer.companyName.replace(/[^a-zA-Z0-9]/g, '_')
      const filename = `${sanitizedCompanyName}_logo.${fileExtension}`

      // Return the file as a download
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': mimeType,
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': fileBuffer.length.toString(),
        },
      })
    } catch (error) {
      console.error('Error downloading company logo:', error)
      return NextResponse.json(
        { error: 'Failed to download logo' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error in logo download:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}