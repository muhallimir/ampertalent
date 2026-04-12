import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req)
    if (!currentUser?.clerkUser || currentUser.profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })
    }

    return NextResponse.json({
      status: 'stub',
      message: 'CRM sync will use HubSpot in Phase 10 (post-deployment)',
      gohighlevel: { connected: false, reason: 'Disabled - using HubSpot instead' }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
