import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user?.profile || (user.profile.role !== 'admin' && user.profile.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
      return NextResponse.json({ seekers: [] });
    }

    const seekers = await db.userProfile.findMany({
      where: {
        role: 'seeker',
        OR: [
          {
            firstName: {
              contains: query,
              mode: 'insensitive'
            }
          },
          {
            lastName: {
              contains: query,
              mode: 'insensitive'
            }
          },
          {
            email: {
              contains: query,
              mode: 'insensitive'
            }
          },
          {
            jobSeeker: {
              headline: {
                contains: query,
                mode: 'insensitive'
              }
            }
          },
          {
            jobSeeker: {
              skills: {
                has: query
              }
            }
          }
        ]
      },
      include: {
        jobSeeker: {
          select: {
            headline: true,
            skills: true,
            aboutMe: true
          }
        }
      },
      take: 50,
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ]
    });

    const formattedSeekers = seekers.map((seeker: any) => ({
      id: seeker.id,
      firstName: seeker.firstName,
      lastName: seeker.lastName,
      email: seeker.email,
      profile: {
        currentTitle: seeker.jobSeeker?.headline,
        headline: seeker.jobSeeker?.headline,
        skills: seeker.jobSeeker?.skills || []
      }
    }));

    return NextResponse.json({ seekers: formattedSeekers });
  } catch (error) {
    console.error('Error searching seekers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}