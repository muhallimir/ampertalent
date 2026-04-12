import { NextRequest, NextResponse } from 'next/server'
import { ResumeCritiqueService } from '@/lib/resume-critique'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const seekerId = searchParams.get('seekerId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!seekerId) {
      return NextResponse.json(
        { error: 'Seeker ID is required' },
        { status: 400 }
      )
    }

    const result = await ResumeCritiqueService.getCritiqueRequests(seekerId, page, limit)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching critique requests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch critique requests' },
      { status: 500 }
    )
  }
}
