import { NextRequest, NextResponse } from 'next/server'
import { ResumeCritiqueService } from '@/lib/resume-critique'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params for Next.js 16
    const { id } = await params

    const requestId = id

    if (!requestId) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      )
    }

    const critiqueRequest = await ResumeCritiqueService.getCritiqueRequest(requestId)

    if (!critiqueRequest) {
      return NextResponse.json(
        { error: 'Critique request not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ request: critiqueRequest })
  } catch (error) {
    console.error('Error fetching critique request:', error)
    return NextResponse.json(
      { error: 'Failed to fetch critique request' },
      { status: 500 }
    )
  }
}
