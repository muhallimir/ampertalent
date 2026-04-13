import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
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
      console.log('🎭 IMPERSONATION: Seeker cover-letter-template GET API called with impersonated user', {
        adminId: currentUser.isImpersonating ? (currentUser as any).adminProfile?.id : undefined,
        impersonatedUserId: currentUser.profile?.id,
        impersonatedRole: currentUser.profile?.role,
        templateId: id
      })
    }

    // Verify user is a job seeker or admin impersonating a seeker
    if (currentUser.profile.role !== 'seeker' && !(currentUser.isImpersonating && currentUser.profile.role === 'seeker')) {
      console.log('🚫 SEEKER COVER LETTER TEMPLATE GET: Access denied', {
        userRole: currentUser.profile.role,
        isImpersonating: currentUser.isImpersonating,
        userId: currentUser.profile.id,
        adminId: currentUser.isImpersonating ? (currentUser as any).adminProfile?.id : undefined,
        templateId: id
      })
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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

    return NextResponse.json({ template })

  } catch (error) {
    console.error('Error fetching cover letter template:', error)
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    )
  }
}

export async function PUT(
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
      console.log('🎭 IMPERSONATION: Seeker cover-letter-template PUT API called with impersonated user', {
        adminId: currentUser.isImpersonating ? (currentUser as any).adminProfile?.id : undefined,
        impersonatedUserId: currentUser.profile?.id,
        impersonatedRole: currentUser.profile?.role,
        templateId: id
      })
    }

    // Verify user is a job seeker or admin impersonating a seeker
    if (currentUser.profile.role !== 'seeker' && !(currentUser.isImpersonating && currentUser.profile.role === 'seeker')) {
      console.log('🚫 SEEKER COVER LETTER TEMPLATE PUT: Access denied', {
        userRole: currentUser.profile.role,
        isImpersonating: currentUser.isImpersonating,
        userId: currentUser.profile.id,
        adminId: currentUser.isImpersonating ? (currentUser as any).adminProfile?.id : undefined,
        templateId: id
      })
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { title, content, isDefault } = body

    // Validate required fields
    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      )
    }

    // Validate field lengths
    if (title.length > 200) {
      return NextResponse.json(
        { error: 'Title must be less than 200 characters' },
        { status: 400 }
      )
    }

    if (content.length > 10000) {
      return NextResponse.json(
        { error: 'Content must be less than 10,000 characters' },
        { status: 400 }
      )
    }

    // Check if template exists and belongs to user
    const existingTemplate = await db.coverLetterTemplate.findFirst({
      where: {
        id: id,
        seekerId: currentUser.profile.id
      }
    })

    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // If setting as default, unset other defaults first
    if (isDefault && !existingTemplate.isDefault) {
      await db.coverLetterTemplate.updateMany({
        where: {
          seekerId: currentUser.profile.id,
          isDefault: true,
          id: { not: id }
        },
        data: { isDefault: false }
      })
    }

    // Update the template
    const updatedTemplate = await db.coverLetterTemplate.update({
      where: { id: id },
      data: {
        title,
        content,
        ...(isDefault !== undefined && { isDefault })
      }
    })

    return NextResponse.json({
      success: true,
      template: updatedTemplate
    })

  } catch (error) {
    console.error('Error updating cover letter template:', error)
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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
      console.log('🎭 IMPERSONATION: Seeker cover-letter-template DELETE API called with impersonated user', {
        adminId: currentUser.isImpersonating ? (currentUser as any).adminProfile?.id : undefined,
        impersonatedUserId: currentUser.profile?.id,
        impersonatedRole: currentUser.profile?.role,
        templateId: id
      })
    }

    // Verify user is a job seeker or admin impersonating a seeker
    if (currentUser.profile.role !== 'seeker' && !(currentUser.isImpersonating && currentUser.profile.role === 'seeker')) {
      console.log('🚫 SEEKER COVER LETTER TEMPLATE DELETE: Access denied', {
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

    // Delete the template
    await db.coverLetterTemplate.delete({
      where: { id: id }
    })

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting cover letter template:', error)
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    )
  }
}