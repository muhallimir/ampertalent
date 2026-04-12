import { NextRequest, NextResponse } from 'next/server'
import { ResumeCritiqueService } from '@/lib/resume-critique'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { seekerId, resumeUrl, targetRole, targetIndustry, priority } = body

    if (!seekerId || !resumeUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const critiqueRequest = await ResumeCritiqueService.submitResumeCritique({
      seekerId,
      resumeUrl,
      targetRole,
      targetIndustry,
      priority
    })

    return NextResponse.json(critiqueRequest)
  } catch (error) {
    console.error('Resume critique submission error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit critique request' },
      { status: 500 }
    )
  }
}