import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { ConciergeChatService } from '@/lib/concierge-chat-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    // Await params for Next.js 16
    const { jobId } = await params

    console.log('🚀 Chat invitation request started for jobId:', jobId);

    const currentUser = await getCurrentUser(request);

    if (!currentUser?.clerkUser || !currentUser.profile) {
      console.log('❌ No authenticated user found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    if (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin') {
      console.log('❌ User is not admin:', { userId: currentUser.clerkUser.id, role: currentUser.profile.role });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.log('✅ Admin user verified:', { adminId: currentUser.profile.id, name: currentUser.profile.name });

    const body = await request.json();
    const { seekerId, message, tags } = body;

    console.log('📝 Request body:', { seekerId, hasMessage: !!message, tagsCount: tags?.length || 0 });

    if (!seekerId) {
      console.log('❌ Missing seekerId');
      return NextResponse.json({
        error: 'seekerId is required'
      }, { status: 400 });
    }

    // Verify the concierge job exists
    console.log('🔍 Looking for concierge job with jobId:', jobId);
    const conciergeJob = await db.conciergeRequest.findFirst({
      where: { jobId: jobId },
      select: {
        id: true,
        status: true,
        jobId: true
      }
    });

    if (!conciergeJob) {
      console.log('❌ Concierge job not found for jobId:', jobId);
      return NextResponse.json({ error: 'Concierge job not found' }, { status: 404 });
    }

    console.log('✅ Found concierge job:', conciergeJob);

    // Get the actual job details
    const job = await db.job.findUnique({
      where: { id: conciergeJob.jobId },
      include: {
        employer: {
          select: {
            companyName: true
          }
        }
      }
    });

    if (!job) {
      console.log('❌ Associated job not found for jobId:', conciergeJob.jobId);
      return NextResponse.json({ error: 'Associated job not found' }, { status: 404 });
    }

    console.log('✅ Found job:', { jobId: job.id, title: job.title, company: job.employer?.companyName });

    // Verify seeker exists
    const seeker = await db.userProfile.findFirst({
      where: {
        id: seekerId,
        role: 'seeker'
      },
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        email: true,
        clerkUserId: true
      }
    });

    if (!seeker) {
      console.log('❌ Seeker not found:', seekerId);
      return NextResponse.json({ error: 'Seeker not found' }, { status: 404 });
    }

    console.log('✅ Found seeker:', { id: seeker.id, name: seeker.name || `${seeker.firstName} ${seeker.lastName}` });

    // Create or get existing chat room for this seeker-job combination
    console.log('💬 Creating/getting chat room...');
    let chatRoom;
    let isNewChat = false;
    try {
      // Check if chat already exists first
      const existingChat = await db.seekerConciergeChat.findFirst({
        where: {
          jobId: conciergeJob.jobId,
          seekerId: seekerId
        }
      });

      if (existingChat) {
        console.log('✅ Found existing chat room:', { chatRoomId: existingChat.id });
        chatRoom = {
          id: existingChat.id,
          jobId: existingChat.jobId,
          seekerId: existingChat.seekerId,
          adminId: existingChat.adminId
        };
        isNewChat = false;
      } else {
        console.log('📝 Creating new chat room...');
        chatRoom = await ConciergeChatService.getOrCreateSeekerChat(conciergeJob.jobId, seekerId);
        isNewChat = true;
      }

      if (!chatRoom) {
        console.log('❌ Failed to create chat room - service returned null');
        return NextResponse.json({ error: 'Failed to create chat room' }, { status: 500 });
      }

      console.log('✅ Chat room ready:', { chatRoomId: chatRoom.id, isNewChat });
    } catch (chatCreationError) {
      console.error('❌ CHAT CREATION ERROR:', chatCreationError);
      return NextResponse.json({
        error: 'Failed to create chat room',
        details: chatCreationError instanceof Error ? chatCreationError.message : String(chatCreationError)
      }, { status: 500 });
    }

    // Create the invitation record
    console.log('📝 Creating invitation record...');
    const invitation = await db.adminActionLog.create({
      data: {
        adminId: currentUser.profile.id,
        actionType: 'concierge_chat_invitation',
        targetEntity: 'seeker',
        targetId: seekerId,
        details: {
          jobId: conciergeJob.id,
          jobTitle: job.title,
          companyName: job.employer?.companyName,
          chatRoomId: chatRoom.id,
          seekerName: seeker.name || `${seeker.firstName} ${seeker.lastName}`,
          seekerEmail: seeker.email,
          invitationMessage: message || '',
          tags: tags || [],
          invitedBy: currentUser.profile.name || currentUser.profile.email,
          timestamp: new Date().toISOString()
        }
      }
    });

    console.log('✅ Invitation record created:', { invitationId: invitation.id });

    // Send initial welcome message only if it's a new chat or if a custom message is provided
    if (isNewChat || (message && message.trim())) {
      const welcomeMessage = message || `Hello! You've been invited to discuss the "${job.title}" position at ${job.employer?.companyName}. Our concierge team is here to help guide you through the process.`;

      console.log('💌 Sending welcome message for', isNewChat ? 'new chat' : 'custom message');
      try {
        await ConciergeChatService.sendAdminToSeekerMessage(
          chatRoom.id,
          currentUser.profile.id,
          welcomeMessage
        );
        console.log('✅ Welcome message sent');
      } catch (error) {
        console.error('❌ Error sending welcome message:', error);
        // Don't fail the entire request if welcome message fails
      }
    } else {
      console.log('⏭️ Skipping welcome message for existing chat');
    }

    // Log the chat invitation action
    console.log('📝 Creating action log...');
    await db.adminActionLog.create({
      data: {
        adminId: currentUser.profile.id,
        actionType: 'concierge_chat_room_created',
        targetEntity: 'concierge_request',
        targetId: jobId,
        details: {
          jobTitle: job.title,
          seekerId: seeker.id,
          seekerName: seeker.name || `${seeker.firstName} ${seeker.lastName}`,
          chatRoomId: chatRoom.id,
          chatUrl: `/seeker/concierge-chat/${conciergeJob.jobId}/${chatRoom.id}`,
          timestamp: new Date().toISOString()
        }
      }
    });

    console.log('✅ Action log created');

    const response = {
      success: true,
      message: 'Chat invitation sent successfully',
      invitation: {
        id: invitation.id,
        seekerId: seeker.id,
        seekerName: seeker.name || `${seeker.firstName} ${seeker.lastName}`,
        seekerEmail: seeker.email,
        chatRoomId: chatRoom.id,
        chatUrl: `/seeker/concierge-chat/${conciergeJob.jobId}/${chatRoom.id}`
      }
    };

    console.log('🎉 Chat invitation completed successfully:', response);
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error creating chat invitation:', error);
    return NextResponse.json(
      { error: 'Failed to create chat invitation: ' + (error as Error).message },
      { status: 500 }
    );
  }
}