import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { S3Service } from '@/lib/s3';

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'hire-my-mom-files';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Log impersonation context for debugging
    if (currentUser.isImpersonating) {
      console.log(
        '🎭 IMPERSONATION: Company logo API called with impersonated user',
        {
          adminId: (currentUser as any).adminProfile?.id,
          impersonatedUserId: currentUser.profile?.id,
          impersonatedRole: currentUser.profile?.role,
        }
      );
    }

    // Verify employer role
    if (
      !currentUser.profile ||
      currentUser.profile.role !== 'employer' ||
      !currentUser.profile.employer
    ) {
      console.error('❌ EMPLOYER ACCESS DENIED (Company Logo GET):', {
        hasProfile: !!currentUser.profile,
        role: currentUser.profile?.role,
        hasEmployer: !!currentUser.profile?.employer,
        isImpersonating: currentUser.isImpersonating,
      });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const employer = currentUser.profile.employer;

    if (!employer.companyLogoUrl || employer.companyLogoUrl.trim() === '') {
      return NextResponse.json(
        { error: 'No company logo found' },
        { status: 404 }
      );
    }

    try {
      // Extract S3 key from the full URL
      const url = new URL(employer.companyLogoUrl);
      const s3Key = url.pathname.substring(1); // Remove leading slash

      // Generate presigned URL for download (valid for 1 hour)
      const presignedUrl = await S3Service.generatePresignedDownloadUrl(
        BUCKET_NAME,
        s3Key,
        3600 // 1 hour
      );

      return NextResponse.json({
        companyLogoUrl: presignedUrl,
      });
    } catch (error) {
      console.error('Error generating presigned URL for company logo:', error);
      // Fall back to original URL if presigned URL generation fails
      return NextResponse.json({
        companyLogoUrl: employer.companyLogoUrl,
      });
    }
  } catch (error) {
    console.error('Error fetching company logo:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify employer role
    if (!currentUser.profile || currentUser.profile.role !== 'employer') {
      console.error('❌ EMPLOYER ACCESS DENIED (Company Logo POST):', {
        hasProfile: !!currentUser.profile,
        role: currentUser.profile?.role,
        isImpersonating: currentUser.isImpersonating,
      });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const form = await request.formData();
    const file = form.get('logo') as unknown as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided. Expected form field "logo".' },
        { status: 400 }
      );
    }

    const contentType = file.type || 'application/octet-stream';
    const fileSize = file.size || 0;

    // Validate file type and size (align with frontend guidance)
    if (!contentType.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an image.' },
        { status: 400 }
      );
    }

    // Max 5MB (matches UI constraint)
    const MAX_SIZE_BYTES = 5 * 1024 * 1024;
    if (fileSize > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'File too large. Please upload an image smaller than 5MB.' },
        { status: 400 }
      );
    }

    // Prepare S3 key
    const originalFilename = (file as any).name || 'logo.png';
    const key = S3Service.generateFileKey(
      currentUser.profile.id,
      'logo',
      originalFilename
    );

    // Read file into Buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Upload to S3
    const { url } = await S3Service.uploadFile(
      BUCKET_NAME,
      key,
      fileBuffer,
      contentType,
      {
        userId: currentUser.profile.id,
        uploadType: 'logo',
        originalFileName: originalFilename,
      }
    );

    // Return URL for this specific email blast (do not overwrite company profile logo)
    return NextResponse.json({ logoUrl: url }, { status: 200 });
  } catch (error) {
    console.error('Error uploading company logo:', error);
    return NextResponse.json(
      { error: 'Failed to upload logo' },
      { status: 500 }
    );
  }
}
