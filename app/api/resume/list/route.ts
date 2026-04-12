import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const seekerId = searchParams.get('seekerId')

    if (!seekerId) {
      return NextResponse.json(
        { error: 'Missing required parameter: seekerId' },
        { status: 400 }
      )
    }

    const resumes = await db.resume.findMany({
      where: { seekerId },
      orderBy: { uploadedAt: 'desc' }
    })

    return NextResponse.json(resumes)
  } catch (error) {
    console.error('Error getting resumes:', error)
    return NextResponse.json(
      { error: 'Failed to get resumes' },
      { status: 500 }
    )
  }
}
