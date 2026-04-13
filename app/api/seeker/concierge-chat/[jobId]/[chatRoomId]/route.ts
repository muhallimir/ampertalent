import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { ConciergeChatService } from '@/lib/concierge-chat-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string; chatRoomId: string }> }
) {
  try {
    // Await params for Next.js 16
    const { jobId, chatRoomId } = await params

    const currentUser = await getCurrentUser(request);

    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to verify seeker role
    const userProfile = await db.userProfile.findUnique({
      where: { clerkUserId: currentUser.clerkUser.id },
      select: { id: true, role: true }
    });

    if (!userProfile || userProfile.role !== 'seeker') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify the job exists and is concierge-enabled
    const job = await db.job.findFirst({
      where: {
        id: jobId,
        conciergeRequested: true,
        conciergeStatus: {
          not: 'not_requested'
        }
      },
      include: {
        employer: {
          select: {
            companyName: true
          }
        }
      }
    });

    if (!job) {
      return NextResponse.json(
        { error: 'Concierge chat not available for this job' },
        { status: 404 }
      );
    }

    // Verify the chat room belongs to this seeker
    const chatRoom = await db.$queryRaw`
      SELECT sc.*, up.name as concierge_name, up.profile_picture_url as concierge_picture, up.concierge_title
      FROM seeker_concierge_chats sc
      LEFT JOIN user_profiles up ON sc.admin_id = up.id
      WHERE sc.id = ${chatRoomId} AND sc.job_id = ${jobId} AND sc.seeker_id = ${userProfile.id}
      LIMIT 1
    ` as any[];

    if (chatRoom.length === 0) {
      return NextResponse.json(
        { error: 'Chat room not found or access denied' },
        { status: 404 }
      );
    }

    const chat = chatRoom[0];

    // Get messages for this chat
    const messages = await ConciergeChatService.getSeekerChatMessages(chatRoomId, userProfile.id);

    // Format chat data
    const chatData = {
      id: chat.id,
      jobId: chat.job_id,
      seekerId: chat.seeker_id,
      adminId: chat.admin_id,
      conciergeName: chat.concierge_name,
      conciergePicture: chat.concierge_picture,
      conciergeTitle: chat.concierge_title || 'Concierge Specialist'
    };

    return NextResponse.json({
      chat: chatData,
      messages,
      job: {
        id: job.id,
        title: job.title,
        companyName: job.employer?.companyName,
        status: job.status
      }
    });

  } catch (error) {
    console.error('Error getting seeker concierge chat:', error);
    return NextResponse.json(
      { error: 'Failed to get concierge chat' },
      { status: 500 }
    );
  }
}