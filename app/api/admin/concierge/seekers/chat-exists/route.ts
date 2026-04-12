import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

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

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const seekerId = searchParams.get('seekerId');

    if (!jobId || !seekerId) {
      return NextResponse.json(
        { error: 'Missing jobId or seekerId parameter' },
        { status: 400 }
      );
    }

    if (jobId && seekerId) {
      // Check if a chat already exists for this specific job-seeker combination
      const existingChat = await db.seekerConciergeChat.findFirst({
        where: {
          jobId,
          seekerId
        },
        select: {
          id: true,
          jobId: true,
          createdAt: true
        }
      });

      if (existingChat) {
        return NextResponse.json({
          exists: true,
          chatRoomId: existingChat.id,
          jobId: existingChat.jobId,
          createdAt: existingChat.createdAt
        });
      } else {
        return NextResponse.json({
          exists: false
        });
      }
    } else if (seekerId) {
      // If only seekerId provided, check if seeker has ANY existing chats and return the most recent one
      const existingChat = await db.seekerConciergeChat.findFirst({
        where: {
          seekerId
        },
        select: {
          id: true,
          jobId: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (existingChat) {
        return NextResponse.json({
          exists: true,
          chatRoomId: existingChat.id,
          jobId: existingChat.jobId,
          createdAt: existingChat.createdAt
        });
      } else {
        return NextResponse.json({
          exists: false
        });
      }
    } else {
      return NextResponse.json({
        exists: false
      });
    }

  } catch (error) {
    console.error('Error checking chat existence:', error);
    return NextResponse.json(
      { error: 'Failed to check chat existence' },
      { status: 500 }
    );
  }
}