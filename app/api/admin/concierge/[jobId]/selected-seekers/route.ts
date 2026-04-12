import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    // Await params for Next.js 16
    const { jobId } = await params

    const user = await getCurrentUser(request);
    if (!user?.profile || (user.profile.role !== 'admin' && user.profile.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get selected seekers from adminActionLog
    const selections = await db.adminActionLog.findMany({
      where: {
        actionType: 'concierge_seeker_selection',
        details: {
          path: ['jobId'],
          equals: jobId
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Extract seeker IDs and get seeker profiles
    const seekerIds = selections.map(selection => selection.targetId);
    const uniqueSeekerIds = [...new Set(seekerIds)]; // Remove duplicates

    if (uniqueSeekerIds.length === 0) {
      return NextResponse.json({ selectedSeekers: [] });
    }

    // Get seeker profiles
    const seekers = await db.userProfile.findMany({
      where: {
        id: {
          in: uniqueSeekerIds
        },
        role: 'seeker'
      },
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        email: true,
        profilePictureUrl: true,
        jobSeeker: {
          select: {
            headline: true,
            skills: true
          }
        }
      }
    });

    // Format response
    const selectedSeekers = seekers.map(seeker => ({
      id: seeker.id,
      firstName: seeker.firstName || seeker.name?.split(' ')[0] || '',
      lastName: seeker.lastName || seeker.name?.split(' ')[1] || '',
      email: seeker.email,
      profilePictureUrl: seeker.profilePictureUrl,
      profile: {
        currentTitle: seeker.jobSeeker?.headline,
        headline: seeker.jobSeeker?.headline
      },
      skills: seeker.jobSeeker?.skills || []
    }));

    return NextResponse.json({ selectedSeekers });
  } catch (error) {
    console.error('Error fetching selected seekers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}