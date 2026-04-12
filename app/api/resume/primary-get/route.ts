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

    const resume = await db.resume.findFirst({
      where: { 
        seekerId,
        isPrimary: true
      },
      orderBy: { uploadedAt: 'desc' }
    })

    return NextResponse.json(resume || null)
  } catch (error) {
    console.error('Error getting primary resume:', error)
    return NextResponse.json(
      { error: 'Failed to get primary resume' },
      { status: 500 }
    )
  }
}
