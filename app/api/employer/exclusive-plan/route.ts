/**
 * API for managing exclusive plan offers for invited employers
 * GET - Check if employer has an exclusive plan offer
 * POST - Dismiss the exclusive plan offer (user clicked "Maybe Later")
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { InAppNotificationService } from '@/lib/in-app-notification-service'

interface ExclusivePlanRow {
    exclusive_plan_type: string | null
    exclusive_plan_name: string | null
    exclusive_plan_amount_cents: number | null
    exclusive_plan_cycles: number | null
    exclusive_plan_offered_at: Date | null
    exclusive_plan_dismissed_at: Date | null
    exclusive_plan_activated_at: Date | null
    exclusive_plan_source: string | null
}

export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser(request)
        if (!currentUser?.profile || currentUser.profile.role !== 'employer') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Use raw query to access new fields before Prisma regeneration
        const employers = await db.$queryRaw<ExclusivePlanRow[]>`
      SELECT 
        exclusive_plan_type,
        exclusive_plan_name,
        exclusive_plan_amount_cents,
        exclusive_plan_cycles,
        exclusive_plan_offered_at,
        exclusive_plan_dismissed_at,
        exclusive_plan_activated_at,
        exclusive_plan_source
      FROM employers
      WHERE user_id = ${currentUser.profile.id}
    `

        const employer = employers[0]

        if (!employer || !employer.exclusive_plan_type) {
            return NextResponse.json({
                hasOffer: false,
                showModal: false,
            })
        }

        const isActivated = !!employer.exclusive_plan_activated_at
        const isDismissed = !!employer.exclusive_plan_dismissed_at
        const source = employer.exclusive_plan_source || 'invitation' // Default to invitation for backward compat

        // Modal shows only if not activated AND not dismissed
        // Billing card always shows if hasOffer is true (dismiss only hides modal, not card)

        return NextResponse.json({
            hasOffer: true,
            showModal: !isActivated && !isDismissed,
            planType: employer.exclusive_plan_type,
            planName: employer.exclusive_plan_name,
            amountCents: employer.exclusive_plan_amount_cents,
            amountDollars: employer.exclusive_plan_amount_cents ? (employer.exclusive_plan_amount_cents / 100).toFixed(2) : null,
            cycles: employer.exclusive_plan_cycles,
            isActivated,
            isDismissed,
            source,
            offeredAt: employer.exclusive_plan_offered_at,
            activatedAt: employer.exclusive_plan_activated_at,
        })
    } catch (error) {
        console.error('Error fetching exclusive plan:', error)
        // Return safe default if columns don't exist or any error occurs
        // This ensures the dashboard loads correctly even before DB migration
        return NextResponse.json({
            hasOffer: false,
            showModal: false,
            showPersistentCard: false,
        })
    }
}

export async function POST(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser(request)
        if (!currentUser?.profile || currentUser.profile.role !== 'employer') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { action } = body

        if (action === 'dismiss') {
            // Get plan info before dismissing for notification
            const planInfo = await db.$queryRaw<Array<{
                exclusive_plan_name: string | null;
                exclusive_plan_amount_cents: number | null;
            }>>`
                SELECT exclusive_plan_name, exclusive_plan_amount_cents
                FROM employers
                WHERE user_id = ${currentUser.profile.id}
            `

            // Get employer info for notification
            const employer = await db.employer.findUnique({
                where: { userId: currentUser.profile.id },
                include: {
                    user: { select: { name: true, email: true, firstName: true, lastName: true } }
                }
            })

            await db.$executeRaw`
        UPDATE employers 
        SET exclusive_plan_dismissed_at = NOW(),
            updated_at = NOW()
        WHERE user_id = ${currentUser.profile.id}
      `

            // Notify admins about the dismissal (for abandoned cart tracking)
            if (employer && planInfo[0]?.exclusive_plan_name) {
                const employerName = employer.user.name ||
                    [employer.user.firstName, employer.user.lastName].filter(Boolean).join(' ') ||
                    employer.companyName
                const employerEmail = employer.user.email || ''

                await InAppNotificationService.notifyAdminExclusivePlanDismissed(
                    employerName,
                    employerEmail,
                    currentUser.profile.id,
                    planInfo[0].exclusive_plan_name,
                    planInfo[0].exclusive_plan_amount_cents || 0
                )
            }

            return NextResponse.json({
                success: true,
                message: 'Exclusive plan offer dismissed. You can still activate it from the Billing page.'
            })
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    } catch (error) {
        console.error('Error updating exclusive plan:', error)
        // Return graceful error - don't break the UI
        return NextResponse.json({
            success: false,
            error: 'Unable to update exclusive plan. Please try again.'
        }, { status: 200 }) // Return 200 to avoid breaking UI, but with success: false
    }
}
