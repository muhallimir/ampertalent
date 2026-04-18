import { NextRequest, NextResponse } from 'next/server'
import { SEEKER_SUBSCRIPTION_PLANS } from '@/lib/subscription-plans'

export async function GET(request: NextRequest) {
    try {
        return NextResponse.json({ plans: SEEKER_SUBSCRIPTION_PLANS, success: true })
    } catch (error) {
        console.error('❌ Error fetching subscription plans:', error)
        return NextResponse.json({ error: 'Failed to fetch subscription plans' }, { status: 500 })
    }
}
