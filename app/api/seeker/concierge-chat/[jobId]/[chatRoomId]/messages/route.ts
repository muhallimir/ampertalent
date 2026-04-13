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

    // Verify the chat room belongs to this seeker
    const chatRoom = await db.$queryRaw`
      SELECT sc.* 
      FROM seeker_concierge_chats sc
      WHERE sc.id = ${chatRoomId} AND sc.job_id = ${jobId} AND sc.seeker_id = ${userProfile.id}
      LIMIT 1
    ` as any[];

    if (chatRoom.length === 0) {
      return NextResponse.json(
        { error: 'Chat room not found or access denied' },
        { status: 404 }
      );
    }

    // Get messages
    const messages = await ConciergeChatService.getSeekerChatMessages(chatRoomId, userProfile.id);

    return NextResponse.json({
      messages
    });

  } catch (error) {
    console.error('Error getting chat messages:', error);
    return NextResponse.json(
      { error: 'Failed to get messages' },
      { status: 500 }
    );
  }
}

export async function POST(
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

    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Verify the chat room belongs to this seeker
    const chatRoom = await db.$queryRaw`
      SELECT sc.* 
      FROM seeker_concierge_chats sc
      WHERE sc.id = ${chatRoomId} AND sc.job_id = ${jobId} AND sc.seeker_id = ${userProfile.id}
      LIMIT 1
    ` as any[];

    if (chatRoom.length === 0) {
      return NextResponse.json(
        { error: 'Chat room not found or access denied' },
        { status: 404 }
      );
    }

    // Send message
    const newMessage = await ConciergeChatService.sendSeekerMessage(
      chatRoomId,
      userProfile.id,
      message.trim()
    );

    return NextResponse.json({
      message: newMessage
    });

  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}