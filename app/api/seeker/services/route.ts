import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { CONCIERGE_SERVICES } from '@/lib/stripe-products-config'

export const dynamic = 'force-dynamic'

/**
 * GET /api/seeker/services
 * Get list of available premium services
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

    // Return all concierge services
    const services = CONCIERGE_SERVICES.map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      price: service.monthlyPrice,
      priceFormatted: `$${service.monthlyPrice.toFixed(2)}`,
      priceId: service.priceId,
    }))

    return NextResponse.json(
      {
        success: true,
        services,
        count: services.length,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Services] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch services'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
