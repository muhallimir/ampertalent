import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { S3Service } from '@/lib/s3';

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'hire-my-mom-files';

// Helper function to generate presigned URL for company logo
async function generatePresignedLogoUrl(companyLogoUrl: string | null): Promise<string | null> {
  if (!companyLogoUrl || companyLogoUrl.trim() === '') {
    return null;
  }

  try {
    // Extract S3 key from the full URL
    const url = new URL(companyLogoUrl);
    const s3Key = url.pathname.substring(1); // Remove leading slash

    // Generate presigned URL for download (valid for 1 hour)
    const presignedUrl = await S3Service.generatePresignedDownloadUrl(
      BUCKET_NAME,
      s3Key,
      3600 // 1 hour
    );

    return presignedUrl;
  } catch (error) {
    console.error('Error generating presigned URL for company logo:', error);
    // Fall back to original URL if presigned URL generation fails
    return companyLogoUrl;
  }
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify admin role
    if (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Get all concierge requests as conversation threads
    // Using the existing ConciergeService method which already has proper formatting
    const conciergeRequests = await db.$queryRaw`
      SELECT cr.*, j.title as job_title, j.is_company_private,
             e.company_name, e.company_logo_url,
             up.name as employer_name, up.profile_picture_url,
             COALESCE(unread.unread_count, 0) as unread_messages_count
      FROM concierge_requests cr
      JOIN jobs j ON cr.job_id = j.id
      JOIN employers e ON cr.employer_id = e.user_id
      JOIN user_profiles up ON e.user_id = up.id
      LEFT JOIN (
        SELECT cc.job_id, COUNT(ccm.id) as unread_count
        FROM concierge_chats cc
        LEFT JOIN concierge_chat_messages ccm ON cc.id = ccm.chat_id
          AND ccm.sender_type = 'employer'
          AND ccm.read_at IS NULL
        GROUP BY cc.job_id
      ) unread ON cr.job_id = unread.job_id
      ORDER BY cr.updated_at DESC
    ` as any[];

    // Transform concierge requests into chat threads with presigned URLs
    const threads = await Promise.all(conciergeRequests.map(async (request: any) => {
      const presignedLogoUrl = await generatePresignedLogoUrl(request.company_logo_url);

      return {
        id: request.id, // Using concierge request ID as thread ID for now
        jobId: request.job_id,
        employerId: request.employer_id,
        jobTitle: request.job_title || 'Unknown Job',
        companyName: request.is_company_private ? 'Private Company' : (request.company_name || 'Unknown Company'),
        companyLogoUrl: presignedLogoUrl || request.company_logo_url,
        employerName: request.employer_name || 'Unknown Employer',
        employerProfilePictureUrl: request.profile_picture_url,
        lastMessage: request.discovery_call_notes ? request.discovery_call_notes.substring(0, 100) + '...' : 'New concierge request',
        lastMessageAt: request.updated_at,
        unreadCount: parseInt(request.unread_messages_count) || 0,
        status: request.status,
      };
    }));

    return NextResponse.json({
      success: true,
      threads
    });

  } catch (error) {
    console.error('Error fetching employer chat threads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employer chat threads' },
      { status: 500 }
    );
  }
}