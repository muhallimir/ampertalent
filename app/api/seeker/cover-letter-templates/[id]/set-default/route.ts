import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params for Next.js 16
    const { id } = await params

    const currentUser = await getCurrentUser(request)
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Log impersonation context for debugging
    if (currentUser.isImpersonating) {
      console.log('🎭 IMPERSONATION: Seeker cover-letter-template set-default API called with impersonated user', {
        adminId: currentUser.isImpersonating ? (currentUser as any).adminProfile?.id : undefined,
        impersonatedUserId: currentUser.profile?.id,
        impersonatedRole: currentUser.profile?.role,
        templateId: id
      })
    }

    // Verify user is a job seeker or admin impersonating a seeker
    if (currentUser.profile.role !== 'seeker' && !(currentUser.isImpersonating && currentUser.profile.role === 'seeker')) {
      console.log('🚫 SEEKER COVER LETTER TEMPLATE SET-DEFAULT: Access denied', {
        userRole: currentUser.profile.role,
        isImpersonating: currentUser.isImpersonating,
        userId: currentUser.profile.id,
        adminId: currentUser.isImpersonating ? (currentUser as any).adminProfile?.id : undefined,
        templateId: id
      })
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if template exists and belongs to user
    const template = await db.coverLetterTemplate.findFirst({
      where: {
        id: id,
        seekerId: currentUser.profile.id
      }
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // If already default, no need to change
    if (template.isDefault) {
      return NextResponse.json({
        success: true,
        message: 'Template is already set as default',
        template
      })
    }

    // Use transaction to ensure atomicity
    await db.$transaction(async (tx) => {
      // First, unset all other defaults for this seeker
      await tx.coverLetterTemplate.updateMany({
        where: {
          seekerId: currentUser.profile.id,
          isDefault: true
        },
        data: { isDefault: false }
      })

      // Then set this template as default
      await tx.coverLetterTemplate.update({
        where: { id: id },
        data: { isDefault: true }
      })
    })

    // Get the updated template
    const updatedTemplate = await db.coverLetterTemplate.findUnique({
      where: { id: id }
    })

    return NextResponse.json({
      success: true,
      message: 'Template set as default successfully',
      template: updatedTemplate
    })

  } catch (error) {
    console.error('Error setting default cover letter template:', error)
    return NextResponse.json(
      { error: 'Failed to set template as default' },
      { status: 500 }
    )
  }
}