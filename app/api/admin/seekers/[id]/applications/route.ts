import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params for Next.js 16
    const { id: seekerId } = await params

    const currentUser = await getCurrentUser(request);

    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    if (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify seeker exists
    const seekerProfile = await db.userProfile.findUnique({
      where: {
        id: seekerId,
        role: 'seeker'
      },
      select: { id: true }
    });

    if (!seekerProfile) {
      return NextResponse.json(
        { error: 'Seeker not found' },
        { status: 404 }
      );
    }

    // Get applications for this seeker
    const applications = await db.application.findMany({
      where: {
        seekerId: seekerId
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            employer: {
              select: {
                companyName: true,
                userId: true
              }
            }
          }
        }
      },
      orderBy: {
        appliedAt: 'desc'
      }
    });

    // Format the applications
    const formattedApplications = applications.map(app => ({
      id: app.id,
      status: app.status,
      appliedAt: app.appliedAt.toISOString(),
      resumeUrl: app.resumeUrl,
      coverLetter: app.coverLetter,
      job: {
        id: app.job.id,
        title: app.job.title,
        company: app.job.employer?.companyName || 'Unknown Company',
        employerId: app.job.employer?.userId
      }
    }));

    return NextResponse.json({
      success: true,
      applications: formattedApplications
    });

  } catch (error) {
    console.error('Error fetching seeker applications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}