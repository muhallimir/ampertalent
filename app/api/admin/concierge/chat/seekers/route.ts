import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { S3Service } from '@/lib/s3';

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'ampertalent-files';

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

    // Get all seeker chat threads from seeker_concierge_chats table
    const seekerChats = await db.$queryRaw`
      SELECT scc.id, scc.job_id, scc.seeker_id, scc.admin_id, scc.created_at,
             j.title as job_title,
             e.company_name, e.company_logo_url, j.is_company_private,
             up.first_name, up.last_name, up.email, up.profile_picture_url,
             js.headline, js.skills,
             last_msg.message as last_message,
             last_msg.created_at as last_message_at,
             COALESCE(unread.unread_count, 0) as unread_count
      FROM seeker_concierge_chats scc
      JOIN jobs j ON scc.job_id = j.id
      JOIN employers e ON j.employer_id = e.user_id
      JOIN user_profiles up ON scc.seeker_id = up.id
      LEFT JOIN job_seekers js ON scc.seeker_id = js.user_id
      LEFT JOIN (
        SELECT chat_id, message, created_at,
               ROW_NUMBER() OVER (PARTITION BY chat_id ORDER BY created_at DESC) as rn
        FROM seeker_concierge_chat_messages
      ) last_msg ON scc.id = last_msg.chat_id AND last_msg.rn = 1
      LEFT JOIN (
        SELECT chat_id, COUNT(*) as unread_count
        FROM seeker_concierge_chat_messages
        WHERE sender_type = 'seeker' AND read_at IS NULL
        GROUP BY chat_id
      ) unread ON scc.id = unread.chat_id
      ORDER BY COALESCE(last_msg.created_at, scc.created_at) DESC
    ` as any[];

    // Transform into chat threads with presigned URLs
    const threads = await Promise.all(seekerChats.map(async (chat: any) => {
      let seekerProfilePictureUrl = null;

      // Generate presigned URL if profile picture exists
      if (chat.profile_picture_url) {
        try {
          if (chat.profile_picture_url.startsWith('http')) {
            // Extract S3 key from the signed URL
            const url = new URL(chat.profile_picture_url);
            const s3Key = url.pathname.substring(1); // Remove leading slash
            seekerProfilePictureUrl = await S3Service.generatePresignedDownloadUrl(
              BUCKET_NAME,
              s3Key,
              24 * 60 * 60 // 24 hours
            );
          } else {
            // Generate presigned URL for S3 key
            seekerProfilePictureUrl = await S3Service.generatePresignedDownloadUrl(
              BUCKET_NAME,
              chat.profile_picture_url,
              24 * 60 * 60 // 24 hours
            );
          }
        } catch (error) {
          console.error('Error generating presigned URL for seeker profile picture:', error);
          // Continue without profile picture
        }
      }

      return {
        id: chat.id,
        jobId: chat.job_id,
        seekerId: chat.seeker_id,
        jobTitle: chat.job_title || 'Unknown Job',
        companyName: chat.is_company_private ? 'Private Company' : (chat.company_name || 'Unknown Company'),
        companyLogoUrl: chat.company_logo_url,
        seekerName: `${chat.first_name || ''} ${chat.last_name || ''}`.trim() || 'Unknown Seeker',
        seekerProfilePictureUrl,
        seekerLocation: undefined, // Location data not available in current schema
        seekerExperience: chat.headline || undefined,
        lastMessage: chat.last_message || 'New conversation started',
        lastMessageAt: chat.last_message_at || chat.created_at,
        unreadCount: parseInt(chat.unread_count) || 0,
        status: 'active', // All seeker chats are considered active
      };
    }));

    return NextResponse.json({
      success: true,
      threads
    });

  } catch (error) {
    console.error('Error fetching seeker chat threads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch seeker chat threads' },
      { status: 500 }
    );
  }
}