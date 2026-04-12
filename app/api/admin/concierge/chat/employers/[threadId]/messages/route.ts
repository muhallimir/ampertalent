import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    // Await params for Next.js 16
    const { threadId } = await params

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

    // Get the concierge request to find the job ID
    const conciergeRequest = await db.$queryRaw`
      SELECT cr.*, j.title as job_title
      FROM concierge_requests cr
      JOIN jobs j ON cr.job_id = j.id
      WHERE cr.id = ${threadId}
      LIMIT 1
    ` as any[];

    if (conciergeRequest.length === 0) {
      return NextResponse.json(
        { error: 'Concierge request not found' },
        { status: 404 }
      );
    }

    const conciergeReq = conciergeRequest[0];
    const messages: any[] = [];

    // Add initial system message
    messages.push({
      id: `system-init-${conciergeReq.id}`,
      senderId: 'system',
      senderType: 'admin',
      message: `Concierge service requested for: ${conciergeReq.job_title}`,
      messageType: 'system',
      readAt: new Date().toISOString(),
      createdAt: conciergeReq.created_at
    });

    // Add discovery call notes if they exist
    if (conciergeReq.discovery_call_notes) {
      // Parse discovery call notes to extract individual messages
      const notes = conciergeReq.discovery_call_notes;
      const adminMessages = notes.split(/\n\nAdmin: /).filter((msg: string) => msg.trim());

      if (adminMessages.length > 1) {
        // First part is initial notes, rest are admin messages
        const initialNotes = adminMessages[0].replace('Admin: ', '');
        if (initialNotes.trim()) {
          messages.push({
            id: `admin-init-${conciergeReq.id}`,
            senderId: 'system',
            senderType: 'admin',
            message: initialNotes.trim(),
            messageType: 'text',
            readAt: new Date().toISOString(),
            createdAt: conciergeReq.created_at
          });
        }

        // Add subsequent admin messages
        adminMessages.slice(1).forEach((msg: string, index: number) => {
          if (msg.trim()) {
            messages.push({
              id: `admin-msg-${conciergeReq.id}-${index}`,
              senderId: 'system',
              senderType: 'admin',
              message: msg.trim(),
              messageType: 'text',
              readAt: new Date().toISOString(),
              createdAt: new Date(Date.parse(conciergeReq.created_at) + (index + 1) * 60000).toISOString()
            });
          }
        });
      } else if (notes.trim()) {
        // Single message
        messages.push({
          id: `admin-notes-${conciergeReq.id}`,
          senderId: 'system',
          senderType: 'admin',
          message: notes.replace('Admin: ', '').trim(),
          messageType: 'text',
          readAt: new Date().toISOString(),
          createdAt: conciergeReq.created_at
        });
      }
    }

    // Get actual chat messages if a concierge chat exists
    const conciergeChat = await db.$queryRaw`
      SELECT cc.id
      FROM concierge_chats cc
      WHERE cc.job_id = ${conciergeReq.job_id}
      LIMIT 1
    ` as any[];

    if (conciergeChat.length > 0) {
      const chatId = conciergeChat[0].id;

      // Get real chat messages
      const chatMessages = await db.$queryRaw`
        SELECT ccm.*, up.name as sender_name
        FROM concierge_chat_messages ccm
        JOIN user_profiles up ON ccm.sender_id = up.id
        WHERE ccm.chat_id = ${chatId}
        ORDER BY ccm.created_at ASC
      ` as any[];

      // Add real chat messages
      chatMessages.forEach((msg: any) => {
        messages.push({
          id: msg.id,
          senderId: msg.sender_id,
          senderType: msg.sender_type,
          message: msg.message,
          messageType: msg.message_type,
          fileUrl: msg.file_url,
          fileName: msg.file_name,
          fileSize: msg.file_size,
          readAt: msg.read_at,
          createdAt: msg.created_at
        });
      });
    }

    // Add status update messages
    const statusMessages = [
      { status: 'pending', message: 'Request received - awaiting admin assignment' },
      { status: 'discovery_call', message: 'Discovery call scheduled' },
      { status: 'job_optimization', message: 'Job optimization in progress' },
      { status: 'candidate_screening', message: 'Candidate screening started' },
      { status: 'interviews', message: 'Interview coordination phase' },
      { status: 'completed', message: 'Concierge service completed' }
    ];

    const currentStatusIndex = statusMessages.findIndex(s => s.status === conciergeReq.status);

    if (currentStatusIndex > 0) {
      // Add status progression messages (skip 'pending' since we already have initial message)
      for (let i = 1; i <= currentStatusIndex; i++) {
        messages.push({
          id: `status-${conciergeReq.id}-${i}`,
          senderId: 'system',
          senderType: 'admin',
          message: statusMessages[i].message,
          messageType: 'system',
          readAt: new Date().toISOString(),
          createdAt: new Date(Date.parse(conciergeReq.updated_at || conciergeReq.created_at)).toISOString()
        });
      }
    }

    return NextResponse.json({
      success: true,
      messages: messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    });

  } catch (error) {
    console.error('Error fetching employer chat messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    // Await params for Next.js 16
    const { threadId } = await params

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

    const { message } = await request.json();

    if (!message?.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Get the concierge request to find the job ID
    const conciergeRequest = await db.$queryRaw`
      SELECT cr.job_id
      FROM concierge_requests cr
      WHERE cr.id = ${threadId}
      LIMIT 1
    ` as any[];

    if (conciergeRequest.length === 0) {
      return NextResponse.json(
        { error: 'Concierge request not found' },
        { status: 404 }
      );
    }

    const jobId = conciergeRequest[0].job_id;

    // Get or create concierge chat
    let chat = await db.conciergeChat.findFirst({
      where: { jobId }
    });

    if (!chat) {
      // Find the employer ID from the job
      const job = await db.job.findUnique({
        where: { id: jobId },
        select: { employerId: true }
      });

      if (!job) {
        return NextResponse.json(
          { error: 'Job not found' },
          { status: 404 }
        );
      }

      // Create chat
      chat = await db.conciergeChat.create({
        data: {
          jobId: jobId,
          employerId: job.employerId,
          adminId: currentUser.profile.id,
          status: 'active'
        }
      });
    }

    // Save message to concierge_chat_messages table (not discovery_call_notes)
    const newMessage = await db.conciergeChatMessage.create({
      data: {
        chatId: chat.id,
        senderId: currentUser.profile.id,
        senderType: 'admin',
        message: message.trim(),
        messageType: 'text'
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            profilePictureUrl: true
          }
        }
      }
    });

    // Update chat timestamp
    await db.conciergeChat.update({
      where: { id: chat.id },
      data: { updatedAt: new Date() }
    });

    const formattedMessage = {
      id: newMessage.id,
      senderId: newMessage.senderId,
      senderType: newMessage.senderType,
      message: newMessage.message,
      messageType: newMessage.messageType,
      fileUrl: newMessage.fileUrl,
      fileName: newMessage.fileName,
      fileSize: newMessage.fileSize,
      readAt: newMessage.readAt,
      createdAt: newMessage.createdAt,
      senderName: newMessage.sender.name,
      senderAvatar: newMessage.sender.profilePictureUrl
    };

    return NextResponse.json({
      success: true,
      message: formattedMessage
    });

  } catch (error) {
    console.error('Error sending employer message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}