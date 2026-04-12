import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user?.profile || (user.profile.role !== 'admin' && user.profile.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId } = await params;

    // Get or create concierge chat for this job
    let chat = await db.$queryRaw`
      SELECT * FROM concierge_chats WHERE job_id = ${jobId} LIMIT 1
    ` as any[];

    if (chat.length === 0) {
      // Create a new concierge chat if it doesn't exist
      const newChatResult = await db.$queryRaw`
        INSERT INTO concierge_chats (id, job_id, employer_id, admin_id, status, created_at, updated_at)
        SELECT gen_random_uuid(), j.id, j.employer_id, ${user.profile.id}, 'active', NOW(), NOW()
        FROM jobs j WHERE j.id = ${jobId}
        RETURNING *
      ` as any[];

      if (newChatResult.length > 0) {
        chat = newChatResult;
      } else {
        return NextResponse.json({ error: 'Could not create chat' }, { status: 500 });
      }
    }

    const chatRecord = chat[0];

    // Get chat messages
    const messages = await db.$queryRaw`
      SELECT ccm.*, up.name as sender_name, up.profile_picture_url as sender_avatar
      FROM concierge_chat_messages ccm
      LEFT JOIN user_profiles up ON ccm.sender_id = up.id
      WHERE ccm.chat_id = ${chatRecord.id}
      ORDER BY ccm.created_at ASC
    ` as any[];

    // Get job and employer details for chat context
    const jobDetails = await db.$queryRaw`
      SELECT j.title as job_title, e.company_name, e.company_logo_url, up.name as employer_name
      FROM jobs j
      JOIN employers e ON j.employer_id = e.user_id
      JOIN user_profiles up ON e.user_id = up.id
      WHERE j.id = ${jobId}
      LIMIT 1
    ` as any[];

    const jobInfo = jobDetails[0] || {};

    const formattedChat = {
      id: chatRecord.id,
      jobId: chatRecord.job_id,
      employerId: chatRecord.employer_id,
      adminId: chatRecord.admin_id,
      status: chatRecord.status,
      createdAt: chatRecord.created_at,
      updatedAt: chatRecord.updated_at,
      jobTitle: jobInfo.job_title,
      companyName: jobInfo.company_name,
      employerName: jobInfo.employer_name,
      companyLogoUrl: jobInfo.company_logo_url
    };

    const formattedMessages = messages.map((msg: any) => ({
      id: msg.id,
      chatId: msg.chat_id,
      senderId: msg.sender_id,
      senderType: msg.sender_type,
      message: msg.message,
      messageType: msg.message_type || 'text',
      fileUrl: msg.file_url,
      fileName: msg.file_name,
      fileSize: msg.file_size,
      readAt: msg.read_at,
      createdAt: msg.created_at,
      senderName: msg.sender_name,
      senderAvatar: msg.sender_avatar
    }));

    return NextResponse.json({
      chat: formattedChat,
      messages: formattedMessages
    });
  } catch (error) {
    console.error('Error loading concierge chat:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    console.log('🔍 CHAT-API: User authentication result:', {
      hasUser: !!user,
      hasProfile: !!user?.profile,
      userId: user?.profile?.id,
      userRole: user?.profile?.role
    });

    if (!user?.profile || (user.profile.role !== 'admin' && user.profile.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId } = await params;
    const { message, messageType = 'text', fileUrl, fileName, fileSize } = await request.json();

    console.log('🔍 CHAT-API: Received message data:', {
      jobId,
      message,
      messageType,
      hasFileUrl: !!fileUrl,
      userId: user.profile.id
    });

    if (!message && !fileUrl) {
      return NextResponse.json({ error: 'Message or file is required' }, { status: 400 });
    }

    // Get or create concierge chat using Prisma
    console.log('🔍 CHAT-API: Looking for existing chat for job:', jobId);

    let chat;
    let newMessage;

    try {
      // First try to find existing chat
      chat = await db.conciergeChat.findFirst({
        where: { jobId },
        include: {
          job: {
            select: {
              id: true,
              employerId: true
            }
          }
        }
      });

      console.log('🔍 CHAT-API: Found existing chat:', !!chat);

      if (!chat) {
        console.log('🔍 CHAT-API: Creating new chat for job:', jobId);

        // First verify the job exists and get employer info
        const job = await db.job.findUnique({
          where: { id: jobId },
          select: {
            id: true,
            employerId: true
          }
        });

        if (!job) {
          console.error('🔍 CHAT-API: Job not found:', jobId);
          return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }

        // Create new chat using Prisma
        chat = await db.conciergeChat.create({
          data: {
            jobId: job.id,
            employerId: job.employerId,
            adminId: user.profile.id,
            status: 'active'
          },
          include: {
            job: {
              select: {
                id: true,
                employerId: true
              }
            }
          }
        });

        console.log('🔍 CHAT-API: Created new chat:', chat.id);
      }

      console.log('🔍 CHAT-API: Using chat with ID:', chat.id);

      // Insert the new message using Prisma
      console.log('🔍 CHAT-API: Inserting new message...');
      newMessage = await db.conciergeChatMessage.create({
        data: {
          chatId: chat.id,
          senderId: user.profile.id,
          senderType: 'admin',
          message: message || '',
          messageType: messageType as any,
          fileUrl: fileUrl || null,
          fileName: fileName || null,
          fileSize: fileSize || null
        }
      });

      console.log('🔍 CHAT-API: Message created with ID:', newMessage.id);

      // Update chat timestamp
      await db.conciergeChat.update({
        where: { id: chat.id },
        data: { updatedAt: new Date() }
      });

    } catch (dbError) {
      console.error('🔍 CHAT-API: Database error:', dbError);
      return NextResponse.json({
        error: `Database error: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`
      }, { status: 500 });
    }

    // Format response using Prisma format
    const formattedMessage = {
      id: newMessage.id,
      chatId: newMessage.chatId,
      senderId: newMessage.senderId,
      senderType: newMessage.senderType,
      message: newMessage.message,
      messageType: newMessage.messageType,
      fileUrl: newMessage.fileUrl,
      fileName: newMessage.fileName,
      fileSize: newMessage.fileSize,
      readAt: newMessage.readAt,
      createdAt: newMessage.createdAt,
      senderName: user.profile.name,
      senderAvatar: user.profile.profilePictureUrl
    };

    console.log('🔍 CHAT-API: Returning formatted message:', formattedMessage);

    return NextResponse.json({
      message: formattedMessage
    });
  } catch (error) {
    console.error('Error sending concierge chat message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}