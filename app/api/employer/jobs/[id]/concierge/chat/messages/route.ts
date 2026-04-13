import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get current authenticated user
    const currentUser = await getCurrentUser(request);
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is an employer
    if (currentUser.profile.role !== 'employer') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id: jobId } = await params;
    const employerId = currentUser.profile.id;

    console.log('🔍 EMPLOYER-CHAT: Loading chat for job:', { jobId, employerId });

    // Verify the job belongs to the employer
    const job = await db.job.findFirst({
      where: {
        id: jobId,
        employerId: employerId,
        conciergeRequested: true,
        chatEnabled: true
      }
    });

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found or not eligible for concierge chat' },
        { status: 404 }
      );
    }

    // Get or create concierge chat
    let chat = await db.conciergeChat.findFirst({
      where: { jobId },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            employer: {
              select: {
                companyName: true,
                companyLogoUrl: true,
                user: {
                  select: {
                    name: true,
                    profilePictureUrl: true
                  }
                }
              }
            }
          }
        },
        // Include assigned admin details if available
        admin: {
          select: {
            id: true,
            name: true,
            profilePictureUrl: true,
            conciergeBio: true,
            conciergeTitle: true,
            conciergeSpecialties: true,
            conciergeExperience: true
          }
        }
      }
    });

    // Check if there's a concierge request and ensure admin is assigned
    let assignedAdminId = chat?.adminId;

    if (!assignedAdminId) {
      console.log('🔍 EMPLOYER-CHAT: No admin assigned, checking concierge request');

      const conciergeRequest = await db.$queryRaw`
        SELECT assigned_admin_id FROM concierge_requests WHERE job_id = ${jobId} LIMIT 1
      ` as any[];

      assignedAdminId = conciergeRequest.length > 0 ? conciergeRequest[0].assigned_admin_id : null;

      // If still no admin assigned, assign the current user if they're an admin
      if (!assignedAdminId) {
        console.log('🔍 EMPLOYER-CHAT: No admin in concierge request, finding an active concierge admin');

        // Find any admin to assign (even if not marked as active concierge)
        const availableAdmin = await db.$queryRaw`
          SELECT id, name, profile_picture_url, concierge_bio
          FROM user_profiles
          WHERE role = 'admin'
          ORDER BY
            CASE WHEN is_active_concierge = true THEN 1 ELSE 2 END,
            created_at DESC
          LIMIT 1
        ` as any[];

        if (availableAdmin.length > 0) {
          assignedAdminId = availableAdmin[0].id;
          console.log('🔍 EMPLOYER-CHAT: Auto-assigning admin:', {
            adminId: assignedAdminId,
            adminName: availableAdmin[0].name,
            hasProfilePicture: !!availableAdmin[0].profile_picture_url
          });

          // Update the concierge request with this admin
          await db.$queryRaw`
            UPDATE concierge_requests
            SET assigned_admin_id = ${assignedAdminId}, status = 'discovery_call'
            WHERE job_id = ${jobId}
          `;

          // Also make sure this admin is marked as active concierge
          await db.$queryRaw`
            UPDATE user_profiles
            SET is_active_concierge = true
            WHERE id = ${assignedAdminId}
          `;
        }
      }
    }

    if (!chat) {
      console.log('🔍 EMPLOYER-CHAT: Creating new chat for job:', jobId);

      chat = await db.conciergeChat.create({
        data: {
          jobId: job.id,
          employerId: employerId,
          adminId: assignedAdminId, // Link to assigned admin
          status: 'active'
        },
        include: {
          job: {
            select: {
              id: true,
              title: true,
              employer: {
                select: {
                  companyName: true,
                  companyLogoUrl: true
                }
              }
            }
          },
          // Include assigned admin details if available
          admin: {
            select: {
              id: true,
              name: true,
              profilePictureUrl: true,
              conciergeBio: true,
              conciergeTitle: true,
              conciergeSpecialties: true,
              conciergeExperience: true
            }
          }
        }
      });
    } else if (!chat.adminId && assignedAdminId) {
      // Update existing chat with assigned admin
      console.log('🔍 EMPLOYER-CHAT: Updating existing chat with admin:', assignedAdminId);

      await db.conciergeChat.update({
        where: { id: chat.id },
        data: { adminId: assignedAdminId }
      });

      // Refetch chat with admin details
      chat = await db.conciergeChat.findFirst({
        where: { jobId },
        include: {
          job: {
            select: {
              id: true,
              title: true,
              employer: {
                select: {
                  companyName: true,
                  companyLogoUrl: true
                }
              }
            }
          },
          admin: {
            select: {
              id: true,
              name: true,
              profilePictureUrl: true,
              conciergeBio: true,
              conciergeTitle: true,
              conciergeSpecialties: true,
              conciergeExperience: true
            }
          }
        }
      });
    }

    if (!chat) {
      return NextResponse.json(
        { error: 'Failed to create or retrieve chat' },
        { status: 500 }
      );
    }

    // Get chat messages
    const messages = await db.conciergeChatMessage.findMany({
      where: { chatId: chat.id },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            profilePictureUrl: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    console.log('🔍 ADMIN DEBUG:', {
      hasAdmin: !!chat.admin,
      adminId: chat.admin?.id,
      adminName: chat.admin?.name,
      adminProfilePicture: chat.admin?.profilePictureUrl
    });

    const formattedChat = {
      id: chat.id,
      jobId: chat.jobId,
      employerId: chat.employerId,
      adminId: chat.adminId,
      status: chat.status,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      jobTitle: chat.job.title,
      companyName: chat.job.employer.companyName,
      companyLogoUrl: chat.job.employer.companyLogoUrl,
      // Add employer information
      employerName: chat.job.employer.user?.name || null,
      employerProfilePicture: chat.job.employer.user?.profilePictureUrl || null,
      // Add concierge information if admin is assigned
      conciergeName: chat.admin?.name || null,
      conciergePicture: chat.admin?.profilePictureUrl || null,
      conciergeTitle: chat.admin?.conciergeTitle || null,
      conciergeBio: chat.admin?.conciergeBio || null,
      conciergeSpecialties: chat.admin?.conciergeSpecialties || null,
      conciergeExperience: chat.admin?.conciergeExperience || null
    };

    console.log('🔍 FORMATTED CHAT:', {
      conciergeName: formattedChat.conciergeName,
      conciergePicture: formattedChat.conciergePicture,
      hasAdminId: !!formattedChat.adminId
    });

    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      chatId: msg.chatId,
      senderId: msg.senderId,
      senderType: msg.senderType,
      message: msg.message,
      messageType: msg.messageType,
      fileUrl: msg.fileUrl,
      fileName: msg.fileName,
      fileSize: msg.fileSize,
      readAt: msg.readAt,
      createdAt: msg.createdAt,
      senderName: msg.sender.name,
      senderAvatar: msg.sender.profilePictureUrl
    }));

    return NextResponse.json({
      chat: formattedChat,
      messages: formattedMessages
    });
  } catch (error) {
    console.error('Error getting employer chat messages:', error);
    return NextResponse.json(
      { error: 'Failed to get chat messages' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get current authenticated user
    const currentUser = await getCurrentUser(request);
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is an employer
    if (currentUser.profile.role !== 'employer') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id: jobId } = await params;
    const employerId = currentUser.profile.id;
    const body = await request.json();
    const { message, messageType = 'text', fileUrl, fileName, fileSize } = body;

    console.log('🔍 EMPLOYER-CHAT: Sending message:', { jobId, employerId, message: message?.substring(0, 50) });

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Verify the job belongs to the employer
    const job = await db.job.findFirst({
      where: {
        id: jobId,
        employerId: employerId,
        conciergeRequested: true,
        chatEnabled: true
      }
    });

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found or not eligible for concierge chat' },
        { status: 404 }
      );
    }

    // Get or create concierge chat
    let chat = await db.conciergeChat.findFirst({
      where: { jobId }
    });

    if (!chat) {
      console.log('🔍 EMPLOYER-CHAT: Creating new chat for message');
      chat = await db.conciergeChat.create({
        data: {
          jobId: job.id,
          employerId: employerId,
          status: 'active'
        }
      });
    }

    // Send message
    const newMessage = await db.conciergeChatMessage.create({
      data: {
        chatId: chat.id,
        senderId: employerId,
        senderType: 'employer',
        message: message.trim(),
        messageType: messageType as any,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileSize: fileSize || null
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
      senderName: newMessage.sender.name,
      senderAvatar: newMessage.sender.profilePictureUrl
    };

    console.log('🔍 EMPLOYER-CHAT: Message sent successfully:', formattedMessage.id);

    return NextResponse.json({
      message: formattedMessage
    });
  } catch (error) {
    console.error('🔍 EMPLOYER-CHAT: Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}