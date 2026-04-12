import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ seekerId: string; id: string }> }
) {
  try {
    // Await params for Next.js 16
    const { seekerId, id } = await params

    const currentUser = await getCurrentUser(request);
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    if (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userProfile = currentUser.profile;

    const { note, tags, jobId } = await request.json();

    console.log('💾 Saving seeker notes and tags:', { seekerId, jobId, note: note?.length, tags: tags?.length });

    // Verify the seeker exists
    const seeker = await db.userProfile.findUnique({
      where: { id: seekerId },
      select: { id: true, firstName: true, lastName: true }
    });

    if (!seeker) {
      return NextResponse.json({ error: 'Seeker not found' }, { status: 404 });
    }

    // Save the note if provided
    let noteRecord = null;
    if (note && note.trim()) {
      noteRecord = await db.adminActionLog.create({
        data: {
          adminId: userProfile.id,
          actionType: 'seeker_note',
          targetEntity: 'seeker',
          targetId: seekerId,
          details: {
            jobId,
            note: note.trim(),
            seekerName: `${seeker.firstName || ''} ${seeker.lastName || ''}`.trim(),
            createdAt: new Date().toISOString()
          }
        }
      });
    }

    // Save/update tags if provided
    if (tags && Array.isArray(tags)) {
      await db.userProfile.update({
        where: { id: seekerId },
        data: { tags }
      });
      console.log('✅ Updated seeker tags:', tags);
    }

    console.log('✅ Seeker notes and tags saved successfully');

    return NextResponse.json({
      success: true,
      message: 'Notes and tags saved successfully',
      note: noteRecord ? {
        id: noteRecord.id,
        seekerId,
        jobId,
        note: note?.trim(),
        adminId: userProfile.id,
        adminName: userProfile.name,
        createdAt: noteRecord.createdAt
      } : null,
      tags
    });

  } catch (error) {
    console.error('❌ Error saving seeker notes:', error);
    return NextResponse.json(
      {
        error: 'Failed to save notes and tags',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ seekerId: string; id: string }> }
) {
  try {
    // Await params for Next.js 16
    const { seekerId, id } = await params

    const currentUser = await getCurrentUser(request);
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    if (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.log('📖 Fetching seeker notes for:', seekerId);

    // Get all notes for this seeker
    const notes = await db.adminActionLog.findMany({
      where: {
        actionType: 'seeker_note',
        targetEntity: 'seeker',
        targetId: seekerId
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
      note: note.details?.note || '',
      adminId: note.adminId,
      adminName: note.admin.name,
      createdAt: note.createdAt
    }));

    console.log('✅ Found', formattedNotes.length, 'notes for seeker');

    return NextResponse.json({
      success: true,
      notes: formattedNotes
    });

  } catch (error) {
    console.error('❌ Error fetching seeker notes:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch notes',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}