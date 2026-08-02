import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/seeker/services/purchased
 * Get all purchased premium services for the authenticated seeker
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user profile
    const userProfile = await db.userProfile.findUnique({
      where: { clerkUserId: userId },
      select: {
        id: true,
      },
    })

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Get seeker
    const seeker = await db.jobSeeker.findUnique({
      where: { userId: userProfile.id },
      select: {
        userId: true,
      },
    })

    if (!seeker) {
      return NextResponse.json({ error: 'Seeker profile not found' }, { status: 404 })
    }

    // Get all service purchases for this seeker
    const purchases = await db.additionalServicePurchase.findMany({
      where: {
        seekerId: seeker.userId,
      },
      include: {
        service: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Defensive: a purchase row's joined `service` may be null if the catalog
    // row is missing (e.g. legacy data or a race between FK upsert and join).
    // Fall back to the static catalog via getServiceById() so the UI always
    // has a name to render.
    const { getServiceById } = await import('@/lib/additional-services')

    const formatted = purchases.map((purchase) => {
      const staticConfig = getServiceById(purchase.serviceId)
      const serviceName =
        purchase.service?.name ||
        staticConfig?.name ||
        purchase.serviceId
      return {
        id: purchase.id,
        serviceId: purchase.serviceId,
        serviceName,
        status: purchase.status,
        amountPaid: purchase.amountPaid,
        createdAt: purchase.createdAt,
        completedAt: purchase.completedAt,
      }
    })

    return NextResponse.json(
      {
        success: true,
        purchases: formatted,
        count: formatted.length,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Purchased Services] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch purchased services'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
