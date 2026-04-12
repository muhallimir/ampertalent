import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { ConciergeChatService } from '@/lib/concierge-chat-service';

// GET: Load chat messages from admin perspective
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatRoomId: string }> }
) {
  try {
    // Await params for Next.js 16
    const { chatRoomId } = await params

    const currentUser = await getCurrentUser(request);

    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    if (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify the chat room exists and admin has access
    const chatRoom = await db.seekerConciergeChat.findFirst({
      where: {
        id: chatRoomId,
        // Admin should be able to access any chat room or assigned chats
        OR: [
          { adminId: currentUser.profile.id },
          { adminId: null } // Unassigned chats can be accessed by any admin
        ]
      },
      include: {
        seeker: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        job: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    if (!chatRoom) {
      return NextResponse.json(
        { error: 'Chat room not found or access denied' },
        { status: 404 }
      );
    }

    // Get messages using the ConciergeChatService
    const messages = await ConciergeChatService.getSeekerChatMessages(chatRoomId, chatRoom.seekerId);

    return NextResponse.json({
      messages,
      chatRoom: {
        id: chatRoom.id,
        seekerId: chatRoom.seekerId,
        seekerName: chatRoom.seeker.name,
        seekerEmail: chatRoom.seeker.email,
        jobId: chatRoom.jobId,
        jobTitle: chatRoom.job.title
      }
    });

  } catch (error) {
    console.error('Error loading chat messages:', error);
    return NextResponse.json(
      { error: 'Failed to load chat messages' },
      { status: 500 }
    );
  }
}

// POST: Send message from admin to seeker
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatRoomId: string }> }
) {
  try {
    // Await params for Next.js 16
    const { chatRoomId } = await params

    const currentUser = await getCurrentUser(request);

    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    if (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { message } = await request.json();

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Verify the chat room exists and admin has access
    const chatRoom = await db.seekerConciergeChat.findFirst({
      where: {
        id: chatRoomId,
        // Admin should be able to access any chat room or assigned chats
        OR: [
          { adminId: currentUser.profile.id },
          { adminId: null } // Unassigned chats can be accessed by any admin
        ]
      }
    });

    if (!chatRoom) {
      return NextResponse.json(
        { error: 'Chat room not found or access denied' },
        { status: 404 }
      );
    }

    // If chat room is not assigned to this admin, assign it
    if (!chatRoom.adminId) {
      await db.seekerConciergeChat.update({
        where: { id: chatRoomId },
        data: { adminId: currentUser.profile.id }
      });
    }

    // Send the message using ConciergeChatService
    const newMessage = await ConciergeChatService.sendAdminToSeekerMessage(
      chatRoomId,
      currentUser.profile.id,
      message.trim()
    );

    return NextResponse.json({
      success: true,
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