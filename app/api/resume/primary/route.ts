import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { resumeId, seekerId } = await request.json()

    if (!resumeId || !seekerId) {
      return NextResponse.json(
        { error: 'Missing required fields: resumeId, seekerId' },
        { status: 400 }
      )
    }

    // First set all resumes for this seeker as non-primary
    await db.resume.updateMany({
      where: { seekerId },
      data: { isPrimary: false }
    })
    
    // Then set the specified resume as primary
    const primaryResume = await db.resume.update({
      where: { id: resumeId },
      data: { isPrimary: true }
    })

    // Also update the job_seeker's resume_url field
    await db.jobSeeker.update({
      where: { userId: seekerId },
      data: { 
        resumeUrl: primaryResume.fileUrl,
        resumeLastUploaded: new Date()
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error setting primary resume:', error)
    return NextResponse.json(
      { error: 'Failed to set primary resume' },
      { status: 500 }
    )
  }
}