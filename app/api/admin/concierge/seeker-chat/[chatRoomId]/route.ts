import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

// GET: Get existing chat room details without sending messages
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

    // Get the chat room details
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
        },
        admin: {
          select: {
            name: true,
            profilePictureUrl: true,
            conciergeTitle: true
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

    return NextResponse.json({
      chatRoom: {
        id: chatRoom.id,
        seekerId: chatRoom.seekerId,
        seekerName: chatRoom.seeker.name,
        seekerEmail: chatRoom.seeker.email,
        jobId: chatRoom.jobId,
        jobTitle: chatRoom.job.title,
        adminId: chatRoom.adminId,
        conciergeName: chatRoom.admin?.name,
        conciergePicture: chatRoom.admin?.profilePictureUrl,
        conciergeTitle: chatRoom.admin?.conciergeTitle,
        createdAt: chatRoom.createdAt
      }
    });

  } catch (error) {
    console.error('Error getting chat room:', error);
    return NextResponse.json(
      { error: 'Failed to get chat room' },
      { status: 500 }
    );
  }
}