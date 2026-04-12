import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Not yet implemented', message: 'Will use HubSpot in Phase 10', status: 'stub' },
    { status: 501 }
  )
}
