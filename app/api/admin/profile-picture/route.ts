import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// Configure S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export async function POST(request: NextRequest) {
  try {
    // Get current authenticated user
    const currentUser = await getCurrentUser(request)
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is an admin
    if (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const { profilePictureUrl } = body

    if (!profilePictureUrl) {
      return NextResponse.json({ error: 'No profile picture URL provided' }, { status: 400 })
    }

    console.log('🖼️ Profile picture presigned URL request:', {
      userId: currentUser.profile.id,
      profilePictureUrl,
      isS3Url: profilePictureUrl.includes('ampertalent-files.s3.') || profilePictureUrl.includes('.amazonaws.com')
    })

    // If it's already a complete non-S3 URL, return it as-is
    if ((profilePictureUrl.startsWith('http://') || profilePictureUrl.startsWith('https://')) &&
      !profilePictureUrl.includes('ampertalent-files.s3.') &&
      !profilePictureUrl.includes('.amazonaws.com')) {
      return NextResponse.json({ presignedUrl: profilePictureUrl })
    }

    // Extract S3 key from URL or use as-is if it's already a key
    let s3Key = profilePictureUrl

    // If it's a full S3 URL, extract the key
    if (profilePictureUrl.includes('ampertalent-files.s3.')) {
      const urlParts = profilePictureUrl.split('ampertalent-files.s3.amazonaws.com/')
      if (urlParts.length > 1) {
        s3Key = urlParts[1].split('?')[0] // Remove any existing query parameters
      }
    } else if (profilePictureUrl.includes('.amazonaws.com/')) {
      const urlParts = profilePictureUrl.split('.amazonaws.com/')
      if (urlParts.length > 1) {
        s3Key = urlParts[1].split('?')[0] // Remove any existing query parameters
      }
    }

    // Generate presigned URL for the S3 object
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: s3Key,
    })

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600, // URL expires in 1 hour
    })

    console.log('🖼️ Generated presigned URL for profile picture:', {
      originalUrl: profilePictureUrl,
      s3Key,
      presignedUrlGenerated: !!presignedUrl
    })

    return NextResponse.json({ presignedUrl })
  } catch (error) {
    console.error('❌ Error generating presigned URL for profile picture:', error)
    return NextResponse.json(
      { error: 'Failed to generate presigned URL' },
      { status: 500 }
    )
  }
}