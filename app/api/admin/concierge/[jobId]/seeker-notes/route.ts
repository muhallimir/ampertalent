import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(
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

    const { seekerId, note } = await request.json();

    if (!seekerId || !note) {
      return NextResponse.json({ error: 'Seeker ID and note are required' }, { status: 400 });
    }

    // Verify the job exists and has a concierge request
    const job = await db.job.findFirst({
      where: {
        id: jobId,
        conciergeRequested: true
      }
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found or not a concierge job' }, { status: 404 });
    }

    // Verify the seeker exists
    const seeker = await db.userProfile.findFirst({
      where: {
        id: seekerId,
        role: 'seeker'
      }
    });

    if (!seeker) {
      return NextResponse.json({ error: 'Seeker not found' }, { status: 404 });
    }

    // For now, we'll store this as an admin action log since there's no specific seeker notes table
    // In a production system, you'd want a dedicated seeker_notes table
    const adminNote = await db.adminActionLog.create({
      data: {
        adminId: user.profile.id,
        actionType: 'seeker_note',
        targetEntity: 'seeker',
        targetId: seekerId,
        details: {
          jobId,
          note,
          seekerName: `${seeker.firstName || ''} ${seeker.lastName || ''}`.trim(),
          createdAt: new Date().toISOString()
        }
      }
    });

    return NextResponse.json({
      message: 'Note saved successfully',
      note: {
        id: adminNote.id,
        seekerId,
        jobId,
        note,
        adminId: user.profile.id,
        adminName: user.profile.name,
        createdAt: adminNote.createdAt
      }
    });
  } catch (error) {
    console.error('Error saving seeker note:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    const { searchParams } = new URL(request.url);
    const seekerId = searchParams.get('seekerId');

    if (!seekerId) {
      return NextResponse.json({ error: 'Seeker ID is required' }, { status: 400 });
    }

    // Get all notes for this seeker on this job
    const notes = await db.adminActionLog.findMany({
      where: {
        actionType: 'seeker_note',
        targetEntity: 'seeker',
        targetId: seekerId,
        details: {
          path: ['jobId'],
          equals: jobId
        }
      },
      include: {
        admin: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const formattedNotes = notes.map((note: any) => ({
      id: note.id,
      seekerId,
      jobId,
      note: note.details?.note || '',
      adminId: note.adminId,
      adminName: note.admin.name,
      createdAt: note.createdAt
    }));

    return NextResponse.json({ notes: formattedNotes });
  } catch (error) {
    console.error('Error fetching seeker notes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}