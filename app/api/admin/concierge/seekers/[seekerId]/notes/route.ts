import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ seekerId: string }> }
) {
  try {
    // Await params for Next.js 16
    const { seekerId } = await params

    const currentUser = await getCurrentUser(request);

    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    if (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get notes for this seeker
    const notes = await db.adminActionLog.findMany({
      where: {
        actionType: 'concierge_seeker_note',
        targetId: seekerId
      },
      include: {
        admin: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const formattedNotes = notes.map((note: any) => ({
      id: note.id,
      seekerId: note.targetId,
      note: (note.details as any)?.note || '',
      tags: (note.details as any)?.tags || [],
      createdAt: note.createdAt,
      adminName: note.admin.name || note.admin.email
    }));

    return NextResponse.json({
      notes: formattedNotes
    });

  } catch (error) {
    console.error('Error fetching seeker notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ seekerId: string }> }
) {
  try {
    // Await params for Next.js 16
    const { seekerId } = await params

    const currentUser = await getCurrentUser(request);

    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    if (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { note, tags, jobId } = await request.json();

    // Verify seeker exists
    const seeker = await db.userProfile.findFirst({
      where: {
        id: seekerId,
        role: 'seeker'
      }
    });

    if (!seeker) {
      return NextResponse.json({ error: 'Seeker not found' }, { status: 404 });
    }

    // Create the note entry
    const noteEntry = await db.adminActionLog.create({
      data: {
        adminId: currentUser.profile.id,
        actionType: 'concierge_seeker_note',
        targetEntity: 'seeker',
        targetId: seekerId,
        details: {
          note: note?.trim() || '',
          tags: tags || [],
          jobId: jobId || null,
          timestamp: new Date().toISOString()
        }
      },
      include: {
        admin: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      note: {
        id: noteEntry.id,
        seekerId: noteEntry.targetId,
        note: (noteEntry.details as any)?.note || '',
        tags: (noteEntry.details as any)?.tags || [],
        createdAt: noteEntry.createdAt,
        adminName: noteEntry.admin.name || noteEntry.admin.email
      }
    });

  } catch (error) {
    console.error('Error saving seeker note:', error);
    return NextResponse.json(
      { error: 'Failed to save note' },
      { status: 500 }
    );
  }
}