import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  try {
    // Await params for Next.js 16
    const { noteId } = await params

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

    const { note } = await request.json();

    if (!note || !note.trim()) {
      return NextResponse.json(
        { error: 'Note content is required' },
        { status: 400 }
      );
    }

    // Update the note in adminActionLog
    const updatedNote = await db.adminActionLog.update({
      where: {
        id: noteId,
        actionType: 'concierge_seeker_note'
      },
      data: {
        details: {
          note: note.trim(),
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
        id: updatedNote.id,
        seekerId: updatedNote.targetId,
        note: (updatedNote.details as any)?.note || '',
        createdAt: updatedNote.createdAt,
        adminName: updatedNote.admin.name || updatedNote.admin.email
      }
    });

  } catch (error) {
    console.error('Error updating note:', error);
    return NextResponse.json(
      { error: 'Failed to update note' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  try {
    // Await params for Next.js 16
    const { noteId } = await params

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

    // Delete the note from adminActionLog
    await db.adminActionLog.delete({
      where: {
        id: noteId,
        actionType: 'concierge_seeker_note'
      }
    });

    return NextResponse.json({
      success: true
    });

  } catch (error) {
    console.error('Error deleting note:', error);
    return NextResponse.json(
      { error: 'Failed to delete note' },
      { status: 500 }
    );
  }
}